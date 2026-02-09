<?php
include 'config.php';

if (!openBDD()) {
    die("Erreur de connexion à la base de données.");
}

$sql = "SELECT * FROM mesure, meteo";
try {
    $stmt = $bdd->prepare($sql);
    $stmt->execute();

    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    header("Content-Type: application/json");
    echo json_encode($data);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
