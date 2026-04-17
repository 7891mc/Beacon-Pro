<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$allSettings = Setting::allSettings();
$currentTheme = $allSettings['current_theme'] ?? 'starter';
$prefix = 'theme_' . $currentTheme . '_';
$themeSettings = [];
foreach ($allSettings as $k => $v) {
    if (str_starts_with($k, $prefix)) {
        $themeSettings[substr($k, strlen($prefix))] = $v;
    }
}

Response::success([
    'settings'       => $allSettings,
    'features'       => Setting::allFeatures(),
    'theme_settings' => $themeSettings,
]);
