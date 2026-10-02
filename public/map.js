const L = window.L;
export function createMap(onClick, onMove) {
  const map = L.map('map', { zoomControl: false, preferCanvas: true }).setView(
    [47.75, -3.36667],
    11,
  );
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const tiles = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    },
  ).addTo(map);
  let warned = false;
  tiles.on('tileerror', () => {
    if (!warned) {
      warned = true;
      document.querySelector('#map-notice').hidden = false;
      document.querySelector('#map-notice').textContent =
        'Fond cartographique indisponible. Les points restent utilisables.';
    }
  });
  const points = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    spiderfyOnMaxZoom: true,
  });
  map.addLayer(points);
  const drafts = L.featureGroup().addTo(map);
  const areas = L.featureGroup().addTo(map);
  let radius;
  map.on('click', (event) => onClick(event.latlng));
  map.on('moveend', onMove);
  map.on(
    'mousemove',
    (event) =>
      (document.querySelector('#coordinates').textContent =
        `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`),
  );
  return {
    map,
    points,
    drafts,
    areas,
    render(data, onSelect) {
      points.clearLayers();
      for (const point of data) {
        const marker = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            className: 'sensor-marker',
            html: '<span></span>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        });
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = point.name;
        popup.append(
          title,
          document.createElement('br'),
          document.createTextNode(
            `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
          ),
        );
        marker.bindPopup(popup);
        marker.on('click', () => onSelect(point));
        points.addLayer(marker);
      }
    },
    showRadius(km) {
      if (radius) map.removeLayer(radius);
      if (km)
        radius = L.circle(map.getCenter(), {
          radius: km * 1000,
          color: '#8d9bff',
          weight: 1,
          fillOpacity: 0.06,
        }).addTo(map);
    },
    draftPoint(latlng) {
      drafts.clearLayers();
      L.circleMarker(latlng, {
        radius: 8,
        color: '#d2ff89',
        fillColor: '#d2ff89',
        fillOpacity: 1,
      }).addTo(drafts);
    },
    draftZone(vertices) {
      drafts.clearLayers();
      if (vertices.length)
        L.polyline(vertices, {
          color: '#d2ff89',
          dashArray: '5 5',
          weight: 2,
        }).addTo(drafts);
      for (const vertex of vertices)
        L.circleMarker(vertex, { radius: 4, color: '#d2ff89' }).addTo(drafts);
    },
    renderZone(zone) {
      areas.clearLayers();
      if (zone)
        L.geoJSON(zone.geometry, {
          style: { color: '#d2ff89', weight: 2, fillOpacity: 0.08 },
        }).addTo(areas);
    },
  };
}
export function insidePolygon(point, ring) {
  let inside = false;
  const x = point.longitude,
    y = point.latitude;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
