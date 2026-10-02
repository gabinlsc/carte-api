import { ApiClient } from './api.js';
import { createMap, insidePolygon } from './map.js';
const $ = (selector) => document.querySelector(selector);
const state = {
  category: '',
  page: 1,
  pages: 0,
  mode: 'explore',
  vertices: [],
  draft: null,
  zones: [],
  zonePage: 1,
  requests: [],
  selectedRequest: 0,
  authenticated: false,
  controller: null,
  timer: null,
};
const api = new ApiClient(recordRequest);
if (window.matchMedia('(max-width:760px)').matches) {
  $('#sidebar').hidden = true;
  $('#sidebar-open').hidden = false;
}
const cartography = createMap(onMapClick, () => {
  cartography.showRadius(Number($('#radius').value));
  if ($('#viewport').checked || Number($('#radius').value)) scheduleLoad();
});
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('#toast').hidden = true), 3500);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copié dans le presse-papiers');
  } catch {
    toast('Copie indisponible : sélectionnez le texte JSON.');
  }
}
function recordRequest(record) {
  state.requests.unshift(record);
  state.requests = state.requests.slice(0, 50);
  state.selectedRequest = 0;
  $('#request-count').textContent = state.requests.length;
  $('#last-request').textContent =
    `${record.method} ${record.path.split('?')[0]} · ${record.status || 'NETWORK'} · ${record.latency.toFixed(0)} ms`;
  renderRequests();
}
function renderRequests() {
  const list = $('#requests');
  list.replaceChildren();
  state.requests.forEach((record, index) => {
    const button = document.createElement('button');
    button.className = `request-entry ${index === state.selectedRequest ? 'active' : ''}`;
    const status = document.createElement('span');
    status.className =
      record.status >= 200 && record.status < 400 ? 'http-ok' : 'http-error';
    status.textContent = record.status || 'ERR';
    const label = document.createElement('span');
    label.textContent = `${record.method} ${record.path.split('?')[0]}`;
    button.append(status, label);
    button.onclick = () => {
      state.selectedRequest = index;
      renderRequests();
    };
    list.append(button);
  });
  const record = state.requests[state.selectedRequest];
  if (record) {
    $('#request-meta').textContent =
      `${record.method} ${record.path} · ${record.latency.toFixed(1)} ms`;
    $('#response-json').textContent = JSON.stringify(
      record[$('#inspect-mode').value],
      null,
      2,
    );
  }
}
function scheduleLoad() {
  clearTimeout(state.timer);
  state.page = 1;
  state.controller?.abort();
  state.timer = setTimeout(load, 280);
}
function selectedZone() {
  return state.zones.find((z) => String(z.id) === $('#zone-filter').value);
}
function query() {
  const params = new URLSearchParams({ page: String(state.page), limit: '50' });
  const search = $('#search').value.trim();
  if (search) params.set('search', search);
  if (state.category) params.set('category', state.category);
  const zone = selectedZone();
  if (zone) {
    const coords = zone.geometry.coordinates[0];
    params.set(
      'bbox',
      [
        Math.min(...coords.map((p) => p[0])),
        Math.min(...coords.map((p) => p[1])),
        Math.max(...coords.map((p) => p[0])),
        Math.max(...coords.map((p) => p[1])),
      ].join(','),
    );
  } else if ($('#viewport').checked) {
    const b = cartography.map.getBounds();
    const west = Math.max(-180, b.getWest()),
      east = Math.min(180, b.getEast());
    if (west <= east)
      params.set(
        'bbox',
        [
          west,
          Math.max(-90, b.getSouth()),
          east,
          Math.min(90, b.getNorth()),
        ].join(','),
      );
  }
  const radius = Number($('#radius').value);
  if (radius) {
    const center = cartography.map.getCenter();
    params.set('latitude', String(center.lat));
    params.set(
      'longitude',
      String(((((center.lng + 180) % 360) + 360) % 360) - 180),
    );
    params.set('radiusKm', String(radius));
  }
  return params;
}
async function load() {
  if (!state.authenticated) return;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  $('#connection-state').textContent = 'Synchronisation…';
  try {
    const result = await api.request(`/api/v1/measurements?${query()}`, {
      signal: controller.signal,
    });
    const zone = selectedZone();
    const data = zone
      ? result.data.filter((p) =>
          insidePolygon(p, zone.geometry.coordinates[0]),
        )
      : result.data;
    state.pages = result.pagination.pages;
    $('#result-count').textContent = zone
      ? `${data.length} dans cette page / ${result.pagination.total} dans l’emprise`
      : `${result.pagination.total} POINTS`;
    $('#page-label').textContent =
      `${state.page} / ${Math.max(1, state.pages)}`;
    $('#previous').disabled = state.page <= 1;
    $('#next').disabled = state.page >= state.pages;
    renderResults(data);
    cartography.render(data, inspectPoint);
    $('#connection-state').textContent = 'API connectée';
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#connection-state').textContent = 'Échec de synchronisation';
    toast(error.message);
    if (error.status === 401) {
      state.authenticated = false;
      $('#auth-open').textContent = 'Connexion';
    }
  }
}
function renderResults(data) {
  const results = $('#results');
  results.replaceChildren();
  if (!data.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent =
      'Aucune mesure. Ajustez les filtres ou utilisez « + Point » pour créer votre première mesure.';
    results.append(empty);
  }
  for (const point of data) {
    const button = document.createElement('button');
    button.className = 'result';
    const dot = document.createElement('span');
    dot.className = 'point-dot';
    const text = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = point.name;
    const coords = document.createElement('small');
    coords.className = 'mono';
    coords.textContent = `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
    text.append(name, coords);
    const temp = document.createElement('span');
    temp.className = 'mono temperature';
    temp.textContent = point.weather
      ? `${point.weather.temperature.toFixed(1)}°`
      : '—';
    button.append(dot, text, temp);
    button.onclick = () => {
      cartography.map.flyTo([point.latitude, point.longitude], 14, {
        duration: 0.6,
      });
      inspectPoint(point);
    };
    results.append(button);
  }
}
function inspectPoint(point) {
  $('#selection').hidden = false;
  $('#selection-name').textContent = point.name;
  const details = $('#selection-details');
  details.replaceChildren();
  const rows = [
    ['ID', `#${point.id} · capteur ${point.sensorId}`],
    ['Position', `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`],
    ['Catégorie', point.category],
    ['Création', new Date(point.createdAt).toLocaleString('fr-FR')],
  ];
  if (point.weather)
    rows.push(
      ['Température', `${point.weather.temperature} °C`],
      ['Humidité', `${point.weather.humidity} %`],
      ['Vent', `${point.weather.windSpeed} m/s`],
      [
        'Conditions',
        `${point.weather.description} · ${point.weather.sunshine}`,
      ],
    );
  else rows.push(['Météo', 'Non enrichie']);
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const key = document.createElement('span');
    key.textContent = label;
    const text = document.createElement('span');
    text.textContent = value;
    row.append(key, text);
    details.append(row);
  }
}
async function loadZones(reset = true) {
  if (reset) {
    state.zonePage = 1;
    state.zones = [];
  }
  try {
    const result = await api.request(
      `/api/v1/zones?limit=200&page=${state.zonePage}`,
    );
    state.zones.push(...result.data);
    const value = $('#zone-filter').value;
    $('#zone-filter').replaceChildren(new Option('Aucune zone', ''));
    for (const zone of state.zones)
      $('#zone-filter').add(new Option(zone.name, String(zone.id)));
    $('#zone-filter').value = value;
    $('#zones-more').hidden = state.zonePage >= result.pagination.pages;
  } catch (error) {
    toast(error.message);
  }
}
function setMode(mode) {
  state.mode = mode;
  state.vertices = [];
  state.draft = null;
  cartography.drafts.clearLayers();
  $('#finish-zone').hidden = true;
  for (const name of ['explore', 'point', 'zone'])
    $(`#tool-${name}`).classList.toggle('selected', name === mode);
  $('#map-hint').textContent =
    mode === 'point'
      ? 'Cliquez sur la carte pour créer un point.'
      : mode === 'zone'
        ? 'Cliquez pour tracer les sommets, puis terminez la zone.'
        : 'Sélectionnez une mesure pour l’inspecter.';
  cartography.map.getContainer().style.cursor =
    mode === 'explore' ? '' : 'crosshair';
}
function onMapClick(latlng) {
  const longitude = ((((latlng.lng + 180) % 360) + 360) % 360) - 180;
  if (state.mode === 'point') {
    state.draft = { latitude: latlng.lat, longitude };
    cartography.draftPoint([latlng.lat, longitude]);
    openComposer(false);
  } else if (state.mode === 'zone') {
    state.vertices.push([latlng.lat, longitude]);
    cartography.draftZone(state.vertices);
    $('#finish-zone').hidden = state.vertices.length < 3;
  }
}
function openComposer(zone) {
  $('#composer').hidden = false;
  $('#point-fields').hidden = zone;
  $('#create-status').textContent = '';
  $('#send-payload').disabled = false;
  $('#point-name').value = '';
  $('#point-name').focus();
  updatePayload();
  requestAnimationFrame(() => cartography.map.invalidateSize());
}
function updatePayload() {
  if (!state.draft) return;
  const name =
    $('#point-name').value ||
    (state.draft.geometry ? 'Nouvelle zone' : 'Nouvelle mesure');
  const payload = state.draft.geometry
    ? { name, geometry: state.draft.geometry }
    : {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [state.draft.longitude, state.draft.latitude],
        },
        properties: {
          name,
          sensorId: Number($('#sensor-id').value),
          category: $('#create-category').value,
        },
      };
  $('#payload').value = JSON.stringify(payload, null, 2);
}
$('#finish-zone').onclick = () => {
  const coordinates = state.vertices.map(([lat, lng]) => [lng, lat]);
  coordinates.push([...coordinates[0]]);
  state.draft = { geometry: { type: 'Polygon', coordinates: [coordinates] } };
  cartography.renderZone(state.draft);
  openComposer(true);
  $('#finish-zone').hidden = true;
};
$('#create-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!state.authenticated) {
    toast('Connectez-vous avant de créer des données');
    $('#auth-dialog').showModal();
    return;
  }
  const button = $('#send-payload');
  button.disabled = true;
  try {
    const payload = JSON.parse($('#payload').value);
    const path = state.draft?.geometry
      ? '/api/v1/zones'
      : '/api/v1/measurements';
    const result = await api.request(path, { method: 'POST', body: payload });
    $('#create-status').textContent = `Créé avec succès · ID ${result.data.id}`;
    toast('Création enregistrée');
    if (path.endsWith('zones')) await loadZones();
    else {
      state.page = 1;
      await load();
      inspectPoint(result.data);
    }
    cartography.drafts.clearLayers();
  } catch (error) {
    $('#create-status').textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
for (const selector of ['#point-name', '#sensor-id', '#create-category'])
  $(selector).addEventListener('input', updatePayload);
$('#copy-payload').onclick = () => copy($('#payload').value);
$('#composer-close').onclick = () => {
  $('#composer').hidden = true;
  setMode('explore');
  requestAnimationFrame(() => cartography.map.invalidateSize());
};
for (const mode of ['explore', 'point', 'zone'])
  $(`#tool-${mode}`).onclick = () => setMode(mode);
$('#search').addEventListener('input', scheduleLoad);
for (const button of document.querySelectorAll('[data-category]'))
  button.onclick = () => {
    state.category = button.dataset.category;
    for (const b of document.querySelectorAll('[data-category]'))
      b.classList.toggle('selected', b === button);
    scheduleLoad();
  };
$('#viewport').onchange = scheduleLoad;
$('#radius').oninput = () => {
  const km = Number($('#radius').value);
  $('#radius-value').textContent = km ? `${km} km` : 'Désactivé';
  cartography.showRadius(km);
  scheduleLoad();
};
$('#zone-filter').onchange = () => {
  cartography.renderZone(selectedZone());
  scheduleLoad();
};
$('#zones-more').onclick = () => {
  state.zonePage++;
  void loadZones(false);
};
$('#previous').onclick = () => {
  state.page--;
  void load();
};
$('#next').onclick = () => {
  state.page++;
  void load();
};
$('#selection-close').onclick = () => ($('#selection').hidden = true);
$('#locate').onclick = () => {
  if (!navigator.geolocation) {
    toast('Géolocalisation indisponible');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      cartography.map.flyTo(
        [position.coords.latitude, position.coords.longitude],
        14,
      );
      if (state.mode === 'point')
        onMapClick({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
    },
    () => toast('Position indisponible ou autorisation refusée'),
    { timeout: 10000, maximumAge: 60000 },
  );
};
function sidebar(show) {
  $('#sidebar').hidden = !show;
  $('#sidebar-open').hidden = show;
  requestAnimationFrame(() => cartography.map.invalidateSize());
}
$('#sidebar-close').onclick = () => sidebar(false);
$('#sidebar-open').onclick = () => sidebar(true);
$('#console-toggle').onclick = () => {
  const expanded = $('#console-body').hidden;
  $('#console-body').hidden = !expanded;
  $('#console-toggle').setAttribute('aria-expanded', String(expanded));
};
$('#inspect-mode').onchange = renderRequests;
$('#copy-response').onclick = () => copy($('#response-json').textContent);
$('#auth-open').onclick = () => $('#auth-dialog').showModal();
$('#auth-close').onclick = () => $('#auth-dialog').close();
$('#auth-mode').onchange = () => {
  const key = $('#auth-mode').value === 'key';
  $('#key-fields').hidden = !key;
  $('#account-fields').hidden = key;
};
async function connected() {
  state.authenticated = true;
  $('#auth-open').textContent = 'Compte & accès';
  $('#auth-dialog').close();
  $('#password').value = '';
  $('#api-key').value = '';
  await loadZones();
  await load();
}
$('#auth-form').onsubmit = async (event) => {
  event.preventDefault();
  $('#auth-status').textContent = 'Connexion…';
  try {
    if ($('#auth-mode').value === 'key') {
      api.key = $('#api-key').value.trim();
      await api.request('/api/v1/auth/session');
    } else {
      api.key = '';
      const result = await api.request('/api/v1/auth/login', {
        method: 'POST',
        body: {
          username: $('#username').value,
          password: $('#password').value,
        },
      });
      api.csrf = result.data.csrfToken;
    }
    $('#auth-status').textContent = '';
    await connected();
  } catch (error) {
    api.key = '';
    $('#auth-status').textContent = error.message;
  }
};
$('#logout').onclick = async () => {
  try {
    await api.request('/api/v1/auth/logout', { method: 'POST', body: {} });
    api.key = '';
    api.csrf = '';
    state.authenticated = false;
    cartography.points.clearLayers();
    $('#results').replaceChildren();
    $('#auth-open').textContent = 'Connexion';
    $('#connection-state').textContent = 'Déconnecté';
    $('#selection').hidden = true;
    toast('Déconnexion effectuée');
  } catch (error) {
    toast(error.message);
  }
};
try {
  const result = await api.request('/api/v1/auth/session');
  api.csrf = result.data.csrfToken;
  await connected();
} catch {
  $('#auth-dialog').showModal();
}
