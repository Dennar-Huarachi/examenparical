<?php
require 'vendor/autoload.php';

// Manual PSR-4 autoload for Stripe
spl_autoload_register(function ($class) {
    $prefix = 'Stripe\\';
    $baseDir = __DIR__ . '/vendor/stripe/stripe-php/lib/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require $file;
});

echo class_exists('Stripe\StripeClient') ? 'OK' : 'NO';
