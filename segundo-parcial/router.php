<?php

$publicPath = __DIR__ . '/public';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');

// Serve existing files from public directory
if ($uri !== '/' && file_exists($publicPath . $uri)) {
    return false;
}

// Log the request
$formattedDateTime = date('D M j H:i:s Y');
$method = $_SERVER['REQUEST_METHOD'];
$addr = $_SERVER['REMOTE_ADDR'] . ':' . $_SERVER['REMOTE_PORT'];
file_put_contents('php://stdout', "[$formattedDateTime] $addr [$method] URI: $uri\n");

// Ensure php://input is consumed before index.php
$rawBody = file_get_contents('php://input');
if ($rawBody) {
    $_ENV['RAW_POST_BODY'] = $rawBody;
}

require_once $publicPath . '/index.php';
