<?php
    $bdd = null;
    $host = "localhost";
    $pwd = "MDP_ICI";
    $base = "glsc_mesures";
    $user = "glsc";

    function openBDD() {
        global $bdd, $host, $user, $pwd, $base;
        try {
            $bdd = new PDO("mysql:host=$host;dbname=$base;charset=utf8", $user, $pwd, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
        }
        catch (Exception $e) {
            $bdd = null;
        }
        return $bdd != null;
    }
?>
