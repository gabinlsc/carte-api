# Audit du commit initial 0222392

## Constats vérifiés

| Sévérité | Fichier | Constat | Correction |
|---|---|---|---|
| Critique | insere.php | Clé OpenWeather dans le code et l'historique | Révoquer la clé chez le fournisseur, secret serveur uniquement |
| Haute | reqmesures.php | SELECT * FROM mesure, meteo produit un produit cartésien | Une mesure contient un instantané météo; migration par fkid |
| Haute | reqmesures.php | Lecture publique non bornée et erreurs SQL divulguées | Lecture authentifiée, pagination, erreurs centralisées |
| Haute | bdd.sample.php | SQL interpolé, exceptions ignorées | Requêtes préparées, échec explicite |
| Haute | insere.php | Entrées non validées, HTML interpolé | Schémas stricts, DOM textContent |
| Haute | insere.php | Deux insertions sans transaction | Écriture atomique |
| Haute | index.php | Session non régénérée, absence CSRF | Nouveau token de session, cookie HttpOnly, CSRF |
| Moyenne | index.php | Blacklist permanente après cinq accès | Fenêtres temporaires, stockage SQLite partagé |
| Moyenne | insere.php | Requête météo sans timeout | Timeout, validation fournisseur, cache TTL borné |
| Moyenne | testIP.php, test1.php | Diagnostics déployables | Retrait des anciennes routes |
| Moyenne | index.php | Carte initialisée avant connexion; popups HTML non échappées | Explorateur dédié et DOM sûr |

## Architecture cible
Node.js 24, TypeScript strict, Express, Zod, SQLite WAL. Controllers → services → repositories. Authentification par session pour les comptes et Bearer pour les clients machine. SQLite convient à une instance unique, sur disque local persistant. Pour plusieurs instances sur plusieurs machines, migrer repositories, sessions, rate limits et cache vers PostgreSQL/Redis avant déploiement.

## Contrat et migration
Les anciennes routes PHP sont remplacées, sans prétendre être compatibles au niveau HTTP. Les noms historiques salle, identificateur, latitude, longitude, valeur, temperature, tps, ensoleillement, humidite, vitessevent, date et les comptes users sont importables via un export JSON. La jointure repose sur meteo.fkid = mesure.id, jamais sur l'ordre des lignes. Les mots de passe PHP bcrypt ($2y$) sont compatibles; les autres algorithmes imposent une réinitialisation. L'ancien schéma SQL n'est pas versionné: vérifier le nom de la clé primaire avant export.

Les nouvelles lectures exigent une authentification. La création d'une mesure fonctionne sans fournisseur météo configuré, avec weather=null. Si le fournisseur est configuré mais indisponible, l'API retourne 503 sans insertion. Les zones sont des Polygon GeoJSON persistants. Les filtres bbox et rayon sont disponibles; le filtrage dans une zone est exécuté dans l'explorateur.

## Limites et validations avant production
Révoquer la clé météo historique, sauvegarder MySQL, vérifier les exports, configurer HTTPS et un disque SQLite durable, mesurer la charge réelle et définir le volume maximal. Aucun accès à la base ou au serveur de production n'a été demandé. Pas de suppression ou migration distante automatique.
