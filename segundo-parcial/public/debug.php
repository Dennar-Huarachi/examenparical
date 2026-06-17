<?php

echo json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'missing',
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'missing',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'php_input_length' => strlen(file_get_contents('php://input')),
    'php_input_preview' => substr(file_get_contents('php://input'), 0, 100),
    'post_empty' => empty($_POST),
    'post' => $_POST,
    'enable_post_data_reading' => ini_get('enable_post_data_reading'),
    'always_populate_raw_post_data' => ini_get('always_populate_raw_post_data'),
], JSON_PRETTY_PRINT);
