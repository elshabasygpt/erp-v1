<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

$routes = app('router')->getRoutes();
$errors = [];

foreach ($routes as $route) {
    if (!str_starts_with($route->uri(), 'api/')) continue;
    
    $action = $route->getAction('uses');
    if (!is_string($action)) continue;
    
    if (str_contains($action, '@')) {
        list($class, $method) = explode('@', $action);
        if (!class_exists($class)) {
            $errors[] = "Class missing: $class (Route: {$route->uri()})";
        } elseif (!method_exists($class, $method)) {
            $errors[] = "Method missing: $class@$method (Route: {$route->uri()})";
        }
    }
}

echo json_encode(["status" => "success", "errors" => $errors], JSON_PRETTY_PRINT);
