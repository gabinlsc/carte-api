<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0"> 
    <title>CIEL56 - Test captcha</title>
</head>

<body>
<script type="text/javascript">
function refreshCaptcha(){
	var img = document.images['captchaimg'];
	img.src = img.src.substring(0,img.src.lastIndexOf("?"))+"?rand="+Math.random()*1000;
}
</script>


<img src="captcha.php?rand=<?php echo rand();?>" style="height: 30px;" id='captchaimg'>
<a href='javascript: refreshCaptcha();'><img src="reload.png" style="height: 30px;" ?></a>
 
</body>
</html>
 
 

