import { createApp } from './app.js';
import { loadConfig } from './config.js';
const config = loadConfig();
const { app, db } = createApp(config);
const server = app.listen(config.PORT, () =>
  console.log(`Carte API listening on ${config.PUBLIC_ORIGIN}`),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => {
    server.closeAllConnections();
    db.close();
    process.exit(1);
  }, 10000);
  timer.unref();
  server.close(() => {
    clearTimeout(timer);
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
