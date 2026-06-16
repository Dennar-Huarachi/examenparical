<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Register Stripe PSR-4 autoloader (composer dump-autoload times out)
        spl_autoload_register(function ($class) {
            $prefix = 'Stripe\\';
            $baseDir = base_path('vendor/stripe/stripe-php/lib/');
            $len = strlen($prefix);
            if (strncmp($prefix, $class, $len) !== 0) return;
            $relativeClass = substr($class, $len);
            $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
            if (file_exists($file)) require $file;
        });
    }
}
