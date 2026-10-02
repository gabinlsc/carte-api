# Commits de la refonte

Branche : `refactor/production-api-explorer`. Base : `0222392`. Aucun push distant.

## 1. `docs: audit legacy application and define migration contract`

Commit : `b84408b`.

Audit du PHP existant, priorités de sécurité et contrat de migration explicite.

| Statut | Fichier         |
| ------ | --------------- |
| Créé   | `docs/AUDIT.md` |

## 2. `chore: initialize strict TypeScript toolchain`

Commit : `7111134`.

Outillage TypeScript strict, dépendances versionnées, lint, formatage et configuration.

| Statut  | Fichier                   |
| ------- | ------------------------- |
| Créé    | `.env.example`            |
| Modifié | `.gitignore`              |
| Créé    | `.prettierignore`         |
| Créé    | `.prettierrc.json`        |
| Créé    | `data/.gitkeep`           |
| Créé    | `eslint.config.js`        |
| Créé    | `package-lock.json`       |
| Créé    | `package.json`            |
| Créé    | `scripts/copy-assets.mjs` |
| Créé    | `src/types.ts`            |
| Créé    | `tsconfig.json`           |

## 3. `feat(data): add transactional storage and legacy import`

Commit : `34bf093`.

Stockage SQLite WAL, repositories, sessions hachées et import atomique MySQL via JSON.

| Statut  | Fichier                            |
| ------- | ---------------------------------- |
| Créé    | `scripts/create-user.ts`           |
| Créé    | `scripts/import-legacy.ts`         |
| Créé    | `src/repositories/auth.ts`         |
| Créé    | `src/repositories/database.ts`     |
| Créé    | `src/repositories/legacy.ts`       |
| Créé    | `src/repositories/measurements.ts` |
| Modifié | `tsconfig.json`                    |

## 4. `feat(api): implement validated geospatial measurement services`

Commit : `1aed1d5`.

DTO stricts, filtres géographiques, pagination, cache borné et fournisseur météo résilient.

| Statut | Fichier                        |
| ------ | ------------------------------ |
| Créé   | `src/config.ts`                |
| Créé   | `src/errors.ts`                |
| Créé   | `src/services/cache.ts`        |
| Créé   | `src/services/measurements.ts` |
| Créé   | `src/services/weather.ts`      |
| Créé   | `src/validators/schemas.ts`    |

## 5. `feat(security): secure authentication and HTTP boundaries`

Commit : `de4e0d8`.

Controllers Express, erreurs centralisées, sessions/CSRF, en-têtes et limitation temporaire de débit; retrait du PHP.

| Statut   | Fichier                      |
| -------- | ---------------------------- |
| Supprimé | `bdd.sample.php`             |
| Supprimé | `captcha.php`                |
| Supprimé | `config.sample.php`          |
| Supprimé | `font/calibri.ttf`           |
| Supprimé | `font/monofont.ttf`          |
| Supprimé | `index.php`                  |
| Supprimé | `insere.php`                 |
| Supprimé | `phptextClass.php`           |
| Supprimé | `reqmesures.php`             |
| Créé     | `src/app.ts`                 |
| Créé     | `src/controllers/api.ts`     |
| Créé     | `src/controllers/auth.ts`    |
| Créé     | `src/middleware/errors.ts`   |
| Créé     | `src/middleware/security.ts` |
| Créé     | `src/server.ts`              |
| Créé     | `src/services/auth.ts`       |
| Supprimé | `test.php`                   |
| Supprimé | `test1.php`                  |
| Supprimé | `testIP.php`                 |

## 6. `feat(ui): add interactive cartography explorer`

Commit : `4551a29`.

Explorateur modulaire, clusters, recherche, inspection HTTP, outils GeoJSON et connexion.

| Statut | Fichier               |
| ------ | --------------------- |
| Créé   | `public/api.js`       |
| Créé   | `public/explorer.css` |
| Créé   | `public/explorer.js`  |
| Créé   | `public/index.html`   |
| Créé   | `public/map.js`       |

## 7. `style(map): polish responsive explorer and interaction states`

Commit : `124afd9`.

Design responsive, focus clavier, réduction des animations et états mobiles.

| Statut  | Fichier               |
| ------- | --------------------- |
| Modifié | `public/explorer.css` |
| Modifié | `public/explorer.js`  |

## 8. `test: cover services security routes and migration`

Commit : `81d621a`.

42 tests backend et parcours Playwright; CI; corrections révélées par les tests, conservation des IDs source et validation des polygones.

| Statut  | Fichier                            |
| ------- | ---------------------------------- |
| Créé    | `.github/workflows/ci.yml`         |
| Modifié | `.gitignore`                       |
| Modifié | `.prettierignore`                  |
| Créé    | `e2e/explorer.spec.ts`             |
| Modifié | `eslint.config.js`                 |
| Modifié | `package-lock.json`                |
| Modifié | `package.json`                     |
| Créé    | `playwright.config.ts`             |
| Modifié | `public/api.js`                    |
| Modifié | `public/explorer.css`              |
| Créé    | `scripts/e2e-server.ts`            |
| Modifié | `src/app.ts`                       |
| Modifié | `src/middleware/errors.ts`         |
| Modifié | `src/repositories/legacy.ts`       |
| Modifié | `src/repositories/measurements.ts` |
| Créé    | `src/validators/geometry.ts`       |
| Modifié | `src/validators/schemas.ts`        |
| Créé    | `tests/helpers.ts`                 |
| Créé    | `tests/migration.test.ts`          |
| Créé    | `tests/routes.test.ts`             |
| Créé    | `tests/services.test.ts`           |
| Modifié | `tsconfig.json`                    |

## 9. `docs: document deployment API and atomic delivery`

Documentation API, installation, exploitation, captures de tests, conteneur non-root et inventaire de livraison.

| Statut  | Fichier                     |
| ------- | --------------------------- |
| Créé    | `README.md`                 |
| Créé    | `Dockerfile`                |
| Créé    | `.dockerignore`             |
| Créé    | `docs/COMMITS.md`           |
| Créé    | `docs/explorer-desktop.png` |
| Créé    | `docs/explorer-mobile.png`  |
| Modifié | `docs/AUDIT.md`             |

Le rapport de livraison généré après ce commit fournit ses identifiants exacts et le code intégral de tous les fichiers texte créés ou modifiés à chaque étape. Les fichiers binaires sont présents dans l’archive source. Les suppressions sont listées; l’ancien code reste dans l’historique Git.

## Validation finale

- `npm run build`, `npm run lint`, `npm run format:check` : réussis.
- `npm test` : 42/42 réussis.
- `npm run test:e2e` : 1 parcours complet réussi, desktop et mobile.
- `npm audit --omit=dev --audit-level=high` : zéro vulnérabilité signalée.
- Interactions carte vérifiées; le chargement CARTO externe a échoué dans cet environnement réseau, état de repli vérifié.
- Dockerfile fourni, image non construite ici : Docker n’est pas disponible.
- Aucun test sur les données réelles MySQL ou le compte OpenWeather.
