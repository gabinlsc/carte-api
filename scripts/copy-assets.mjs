import { mkdir, cp } from 'node:fs/promises';
await mkdir('public/vendor', { recursive: true });
await cp('node_modules/leaflet/dist', 'public/vendor/leaflet', {
  recursive: true,
});
await cp('node_modules/leaflet.markercluster/dist', 'public/vendor/cluster', {
  recursive: true,
});
