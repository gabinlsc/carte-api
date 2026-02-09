<?php
        session_start();
        include("./phptextClass.php");  
        
        /*create class object*/
        $phptextObj = new phptextClass();       
        /*phptext function to genrate image with text*/
        $phptextObj->phpcaptcha('#a65453','#BCF4E7',120,40,10,25);      
 ?>
