<?php

 require_once("bdd.php");
 $ip = $_SERVER["REMOTE_ADDR"];
 if (bddEstBlackList($ip)) {
    die("Allez vous en !");
 }
 echo "Votre ip = $ip<br />";
 
 /* Simule plusieurs accès */
 for ($i=0; $i<5; $i++) {
    bddInscritIP($ip);
 }
 
 $n =  bddTesteIP($ip);
 if ($n > 4) { // toujours vrai, car on vient d'en ajouter 5 
   bddSuppIP($ip);
   bddBlacklistIP($ip);
   echo "$n essais en moins de 10s => $ip est maintenant en liste noire<br />";
 }
