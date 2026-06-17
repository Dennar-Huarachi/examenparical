<?php
require __DIR__ . '/vendor/autoload.php';

// Manual PSR-4 autoload for Stripe in case composer optimized autoload didn't include it
$stripeBaseDir = __DIR__ . '/vendor/stripe/stripe-php/lib/';
if (!class_exists('Stripe\StripeClient', false)) {
    $stripeFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($stripeBaseDir));
    foreach ($stripeFiles as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            require_once $file->getPathname();
        }
    }
}

echo 'StripeClient: ' . (class_exists('Stripe\StripeClient') ? 'OK' : 'NO') . PHP_EOL;
echo 'PaymentIntent: ' . (class_exists('Stripe\PaymentIntent') ? 'OK' : 'NO') . PHP_EOL;
echo 'Stripe: ' . (class_exists('Stripe\Stripe') ? 'OK' : 'NO') . PHP_EOL;
