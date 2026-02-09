<?php
    $bdd_ip = null;
    $host_ip = "localhost";
    $pwd_ip = "MDP_ICI";
    $base_ip = "glsc_mesures";
    $user_ip = "glsc";

  /**
   * Ouverture de la bases de données pour IP
   */
 function openBDDIP() {
   global $bdd_ip, $host_ip, $user_ip, $pwd_ip, $base_ip;
   try {
      $bdd_ip = new PDO("mysql:host=$host_ip;dbname=$base_ip;charset=utf8",
                     $user_ip,
                     $pwd_ip,
                     array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
                    );
   } catch (Exception $e) {
       $bdd_ip = null;
   }
   return $bdd_ip != null;
 }
 
 
/**
 * Stocke une adresse ip dans la table tip
 * la date est mise automatiquement
 **/
function bddInscritIP($ip) {
    global $bdd_ip;
    if ($bdd_ip == null) openBDDIP();
    try {
      $req = "INSERT INTO `tip`(ip) VALUES('$ip')";
      $res = $bdd_ip->query($req);
    } catch (Exception $e){}
}

/** 
 * Supprime les enregistrements associés à l'adresse ip
 **/
function bddSuppIP($ip) {
    global $bdd;
    if ($bdd == null) openBDD();
    try {
      $req = "DELETE FROM `tip` WHERE ip='$ip'";
      $res = $bdd->query($req);
    } catch (Exception $e){}
}
 
 

/**
 * Place une adresse ip dans la liste noire
 **/
function bddBlacklistIP($ip) {
    global $bdd_ip;
    if ($bdd_ip == null) openBDDIP();
    try {
      $req = "INSERT INTO `tblacklist`(ip) VALUES('$ip')";
      $res = $bdd_ip->query($req);
    } catch (Exception $e){}
 }
 
 
/**
 * Vérifie si une adresse ip est dans la liste noire 
 **/ 
function bddEstBlackList($ip) {
    global $bdd_ip;
    if ($bdd_ip == null) openBDDIP();
    try {
      $req = "SELECT COUNT(*) FROM `tblacklist` where ip='$ip'";
      $res = $bdd_ip->query($req);
      return $res->fetch()[0] > 0;
    } catch (Exception $e){
        return false;
    }
}
 

/**
 * Compte le nombre d'accès pour une adresse ip, pour les 10 dernières secondes
 **/
function bddTesteIP($ip) {
    global $bdd_ip;
    if ($bdd_ip == null) openBDDIP();
    $sup = date('Y-m-d H:i:s');
    $date_sup = new DateTime($sup);
    $interval = new DateInterval('PT10S');
    $date_inf = $date_sup->sub($interval);
    $inf = $date_inf->format('Y-m-d H:i:s');
    try {
      $req = "SELECT count(*)
              FROM tip
              WHERE date BETWEEN '$inf' AND '$sup' and ip='$ip'";
      $res = $bdd_ip->query($req);
      return $res->fetch()[0];
    } catch (Exception $e){
        return -1;
    }
}
