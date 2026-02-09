<?php
session_start();
include_once 'config.php';
include_once 'bdd.php';

$login_error = '';

    if (isset($_GET['logout'])) {
        session_destroy();
        header("Location: index.php");
        exit();
    }

    if (!isset($_SESSION['user'])) {
        $client_ip = $_SERVER['REMOTE_ADDR'];

        // Check if IP is blacklisted
        if (bddEstBlackList($client_ip)) {
            die("Accès refusé : votre adresse IP est en liste noire.");
        }

        // Log the access
        bddInscritIP($client_ip);

        // Check if more than 4 accesses in less than 10 seconds
        $access_count = bddTesteIP($client_ip);
        if ($access_count > 4) {
            bddSuppIP($client_ip);
            bddBlacklistIP($client_ip);
            die("Trop de tentatives de connexion. Votre adresse IP a été mise en liste noire.");
        }

        // If login form submitted
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_identifiant']) && isset($_POST['login_mdp']) && isset($_POST['captcha'])) {
            if (openBDD()) {
                $identifiant = $_POST['login_identifiant'];
                $mdp = $_POST['login_mdp'];
                $captcha = $_POST['captcha'];

                if (isset($_SESSION['captcha_code']) && strtoupper($captcha) === strtoupper($_SESSION['captcha_code'])) {
                    $sth = $bdd->prepare("SELECT pwd FROM users WHERE userid = :identifiant");
                    $sth->bindParam(':identifiant', $identifiant);
                    $sth->execute();
                    $user = $sth->fetch(PDO::FETCH_ASSOC);

                    if ($user && password_verify($mdp, $user['pwd'])) {
                        $_SESSION['user'] = $identifiant;
                        unset($_SESSION['captcha_code']);
                        header("Location: index.php");
                        exit();
                    } else {
                        $login_error = "Identifiant ou mot de passe incorrect.";
                    }
                } else {
                    $login_error = "Captcha incorrect.";
                }
            } else {
                $login_error = "Erreur de connexion à la base de données.";
            }
        }
    }
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[glsc | Archive] API Carte</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
</head>

<style>
    body {
        font-family: 'Poppins', sans-serif;
        background: #f7fafc;
        color: #2d3748;
        margin: 0;
        padding: 20px;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .container {
        max-width: 500px;
        width: 100%;
        background: #ffffff;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        text-align: center;
        border: 1px solid #e2e8f0;
    }
    h1 {
        color: #1a202c;
        margin-bottom: 30px;
        font-weight: 700;
        font-size: 28px;
    }
    p {
        margin: 15px 0;
        font-size: 16px;
    }
    .error {
        color: #e53e3e;
        font-weight: 600;
        margin-bottom: 20px;
        background: #fed7d7;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #feb2b2;
    }
    .form-wrapper {
        text-align: left;
    }
    form {
        margin-bottom: 30px;
    }
    label {
        display: block;
        margin-bottom: 10px;
        font-weight: 600;
        color: #4a5568;
        text-align: left;
    }
    input[type="text"], input[type="password"] {
        width: 100%;
        padding: 15px;
        margin-bottom: 20px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 16px;
        font-family: 'Poppins', sans-serif;
        transition: border-color 0.3s, box-shadow 0.3s;
        box-sizing: border-box;
    }
    input[type="text"]:focus, input[type="password"]:focus {
        border-color: #3182ce;
        outline: none;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }
    .captcha-container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
    }
    .captcha-container img {
        margin-right: 10px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    .captcha-container a {
        margin-left: 10px;
    }
    input[type="submit"] {
        background: #3182ce;
        color: white;
        padding: 15px 30px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        width: 100%;
        transition: background-color 0.3s, transform 0.2s;
    }
    input[type="submit"]:hover {
        background: #2c5282;
        transform: translateY(-2px);
    }
    a {
        color: #3182ce;
        text-decoration: none;
        font-weight: 600;
    }
    a:hover {
        text-decoration: underline;
    }
    #mapid {
        height: 400px;
        width: 100%;
        border-radius: 10px;
        margin-top: 20px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    input[type="number"] {
        width: 100%;
        padding: 12px;
        margin-bottom: 15px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 16px;
        font-family: 'Poppins', sans-serif;
        transition: border-color 0.3s;
        box-sizing: border-box;
    }
    input[type="number"]:focus {
        border-color: #667eea;
        outline: none;
    }
    input[type="button"] {
        background: #e2e8f0;
        color: #4a5568;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-family: 'Poppins', sans-serif;
        margin: 5px;
        transition: background-color 0.3s;
    }
    input[type="button"]:hover {
        background: #cbd5e0;
    }
</style>

<body>
<div class="container">
<?php if (!isset($_SESSION['user'])): ?>
    <h1>Connexion</h1>
    <?php if ($login_error): ?>
        <p class="error"><?php echo htmlspecialchars($login_error); ?></p>
    <?php endif; ?>
    <div class="form-wrapper">
    <form action="index.php" method="post">
        <label for="login_identifiant">Identifiant :</label>
        <input type="text" id="login_identifiant" name="login_identifiant" required>
        <label for="login_mdp">Mot de passe :</label>
        <input type="password" id="login_mdp" name="login_mdp" required>
        <label for="captcha">Captcha :</label>
        <div class="captcha-container">
            <img src="captcha.php?rand=<?php echo rand(); ?>" style="height: 30px;" id="captchaimg">
            <a href='javascript: refreshCaptcha();'><img src="reload.png" style="height: 30px;" alt="Recharger"></a>
        </div>
        <input type="text" id="captcha" name="captcha" placeholder="Entrez le code CAPTCHA" required>
        <input type="submit" value="Se connecter">
    </form>
    </div>
<?php else: ?>
    <p>Connecté en tant que : <strong><?php echo htmlspecialchars($_SESSION['user']); ?></strong> | <a href="index.php?logout=1">Déconnexion</a></p>
    <h1>Formulaire de saisie</h1>
    <form action="insere.php" method="post">
        <label for="name">Nom de la salle :</label>
        <input type="text" id="nom" name="nom" minlength="2" required>
        <label for="identifiant">Id du capteur (1-100) :</label>
        <input type="number" id="identifiant" name="identifiant" min="1" max="100" required>
        <label for="latitude">Latitude :</label>
        <input type="number" id="latitude" name="latitude" step="any" required>
        <label for="longitude">Longitude :</label>
        <input type="number" id="longitude" name="longitude" step="any" required>
        <input type="button" onClick="getLocation()" id="locauto" name="locauto" value="Localisation Auto">
        <input type="button" onClick="affPose()" id="posauto" name="posauto" value="Afficher la position">
        <input type="submit" value="Envoyer les données">
    </form>
    <h1>Localisation des mesures</h1>
    <div id="mapid"></div>
<?php endif; ?>
</div>
</body>

<script type="text/javascript">
function refreshCaptcha(){
	var img = document.images['captchaimg'];
	img.src = img.src.substring(0,img.src.lastIndexOf("?"))+"?rand="+Math.random()*1000;
}
</script>

<script>

var map;

function affPose() {
    var lat = parseFloat(document.getElementById("latitude").value);
    var lon = parseFloat(document.getElementById("longitude").value);
    var sensorName = document.getElementById("nom").value || "Capteur inconnu";

    if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 13);
        L.marker([lat, lon]).addTo(map)
            .bindPopup("Position du capteur : " + sensorName)
            .openPopup();
    } else {
        alert("Veuillez entrer une latitude et une longitude valides !");
    }
  }

function getLocation() {
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    x.innerHTML = "La géolocalisation n'est pas supportée par le navigateur.";
  }
}
function success(position) {
  let lati=document.getElementById("latitude");
  lati.value=position.coords.latitude;
  let longi=document.getElementById("longitude");
  longi.value=position.coords.longitude;
}

function error() {
  alert("Désolé, pas de géolocalisation disponible");
}
</script>





<script>
function affiche_carte() {

  map = L.map('mapid').setView([47.75, -3.36667], 1);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  
  fetch('reqmesures.php')
    .then(response => {
      if (!response.ok) {
        throw new Error('Erreur HTTP : ' + response.status);
      }
      return response.json();
    })
    .then(donnees => {
      console.log("Données reçues :", donnees);

      if (Array.isArray(donnees)) {
        donnees.forEach(point => {
          const lat = parseFloat(point.latitude);
          const lon = parseFloat(point.longitude);
          const nom = point.salle;
          const tmp = parseFloat(point.temperature);
          const ensoleillement = point.ensoleillement;
          const vitessevent = parseFloat(point.vitessevent);
          const humidite = parseFloat(point.humidite)
          const date = point.date;
          const temps = point.tps

          const derniere = donnees[donnees.length - 1];

          const latDerniere = parseFloat(derniere.latitude);
          const lonDerniere = parseFloat(derniere.longitude);

          if (!isNaN(latDerniere) && !isNaN(lonDerniere)) {
            map.setView([latDerniere, lonDerniere], 13);
          }

          if (!isNaN(lat) && !isNaN(lon)) {
            L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`<strong>${nom}</strong><br>Latitude : ${lat}<br>Longitude : ${lon}<br> Température : ${tmp}°C<br> Temps : ${temps}<br> Ensoleillement : ${ensoleillement}<br> Vitesse du vent : ${vitessevent} m/s<br> Humidité : ${humidite}%<br> Date : ${date}`);
          }
        });
      } else {
        alert("Erreur dans les données reçues : " + JSON.stringify(donnees));
      }
    })
    .catch(error => {
      console.error("Erreur lors du chargement des points :", error);
      alert("Erreur lors du chargement des points : " + error.message);
    });
}
</script>



<script>

  affiche_carte()

</script>

</script>
</html>
