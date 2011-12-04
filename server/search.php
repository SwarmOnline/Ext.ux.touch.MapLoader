<?php

include('config.php');

// Get parameters from URL
$centre = json_decode(stripslashes($_GET["centre"]), true);
$bounds = json_decode(stripslashes($_GET["bounds"]), true);
$boundingRadius = $_GET["boundingRadius"];
$bufferRadius = $_GET["bufferRadius"];
$zoom = $_GET["zoom"];

// Opens a connection to a mySQL server
$connection=mysql_connect (localhost, $username, $password);
if (!$connection) {
  die("Not connected : " . mysql_error());
}

// Set the active mySQL database
$db_selected = mysql_select_db($database, $connection);
if (!$db_selected) {
  die ("Can\'t use db : " . mysql_error());
}

// Search the rows in the markers table
$query = sprintf("SELECT lat, lng, ( 3959 * acos( cos( radians('%s') ) * cos( radians( lat ) ) * cos( radians( lng ) - radians('%s') ) + sin( radians('%s') ) * sin( radians( lat ) ) ) ) AS distance FROM markers2 HAVING distance < '%s' ORDER BY distance",
  mysql_real_escape_string($centre['lat']),
  mysql_real_escape_string($centre['lng']),
  mysql_real_escape_string($centre['lat']),
  mysql_real_escape_string($boundingRadius) + mysql_real_escape_string($bufferRadius)); // add boundingRadius and bufferRadius
$result = mysql_query($query);

if (!$result) {
  die("Invalid query: " . mysql_error());
}

$outputArray = array();

while($array = mysql_fetch_array($result)){
	$outputArray[] = $array;
}

echo json_encode(array("success" => true, "count" => count($outputArray), "result" => $outputArray));

?>
