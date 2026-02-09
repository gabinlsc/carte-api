<?php
// Inclure le fichier contenant la fonction openBDD
include_once 'config.php';

// Tester la connexion
if (openBDD()) {
    echo "Connexion réussie à la base de données !";
} else {
    echo "Échec de la connexion à la base de données. Vérifiez vos paramètres.";
}
?>
