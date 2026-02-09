<?php
session_start();
if (!isset($_SESSION['user'])) {
    header("Location: index.php");
    exit();
}
?>

<h1> Données reçues : </h1>

<?php
    include_once 'config.php';
    openBDD();
    if (openBDD()) {
        echo "<strong>"."Connexion réussie à la base de données !"."</strong>";
    } else {
        echo "Échec de la connexion à la base de données. Vérifiez vos paramètres.";
    }
    if (isset($_POST['nom']) && isset($_POST['identifiant']) && isset($_POST['latitude']) && isset($_POST['longitude']))
    {
        echo '<p>'.'Salle <strong>'.$_POST['nom'].'</strong> capteur <strong>'.$_POST['identifiant'].'</strong></p>';
        echo '<p>'.'La mesure est faite à <strong>['.$_POST['latitude'].','.$_POST['longitude'].']'.'</strong></p>';

        $apiKey = '65067821c23e30d00403c00d311563d5';
        $url = "https://api.openweathermap.org/data/2.5/weather?lat=" . urlencode($_POST['latitude']) . "&lon=" . urlencode($_POST['longitude']) . "&units=metric&lang=fr&appid=" . $apiKey;

        $json = @file_get_contents($url);
        if ($json !== false) {
            $data = json_decode($json, true);
            if ($data && isset($data['weather'][0]) && isset($data['main']['temp']) && isset($data['wind']['speed'])) {
                $hmd = $data['main']['humidity'];
                $temp = $data['main']['temp'];
                $wind_speed = $data['wind']['speed'];
                $tps = $data['weather'][0]['description'];
                $clouds = isset($data['clouds']['all']) ? $data['clouds']['all'] : 0;
                $ensoleillement = ($clouds < 50) ? 'ensoleillé' : 'nuageux';

                echo '<p>Météo actuelle : <strong>' . htmlspecialchars($ensoleillement) . '</strong>, Température : <strong>' . htmlspecialchars($temp) . ' °C</strong>, Vitesse du vent : <strong>' . htmlspecialchars($wind_speed) . ' m/s</strong></p>';

                $sth=$bdd->prepare("INSERT INTO mesure (salle, identificateur, latitude, longitude, valeur) VALUES (:a_nom, :a_identifiant, :a_latitude, :a_longitude, :a_valeur)");
                $sth->bindParam(':a_nom',$_POST['nom']);
                $sth->bindParam(':a_identifiant',$_POST['identifiant']);
                $sth->bindParam(':a_latitude',$_POST['latitude']);
                $sth->bindParam(':a_longitude',$_POST['longitude']);
                $sth->bindParam(':a_valeur',$temp);
                $sth->execute();

                $id_mesure = $bdd->lastInsertId();

                $sth_meteo = $bdd->prepare("INSERT INTO meteo (temperature, tps, ensoleillement, humidite, vitessevent, fkid) VALUES (:temp, :tps, :ensoleillement, :humid, :vitessevent,:fkid)");
                $sth_meteo->bindParam(':temp', $temp);
                $sth_meteo->bindParam(':ensoleillement', $ensoleillement);
                $sth_meteo->bindParam(':tps', $tps);
                $sth_meteo->bindParam(':humid', $hmd);
                $sth_meteo->bindParam(':vitessevent', $wind_speed);
                $sth_meteo->bindParam(':fkid', $id_mesure);
                $sth_meteo->execute();

                echo '<p>Données météo enregistrées dans la table meteo.</p>';
                header("Location: index.php");
                exit();
            } else {
                echo '<p>Impossible de récupérer les données météo complètes.</p>';
            }
        } else {
            echo '<p>Erreur lors de la récupération des données météo.</p>';
        }

        echo '<p><a href="index.php">Retour à la page principale</a></p>';

    } else
    {
        echo '<p> Il manque un renseignement ! </p>';
    }
?>
