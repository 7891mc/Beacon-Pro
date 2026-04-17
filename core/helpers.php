<?php
/**
 * 全局辅助函数
 */

define('ROOT_PATH', dirname(__DIR__));

function init_app(): void
{
    $configFile = ROOT_PATH . '/config.php';
    if (!file_exists($configFile)) {
        if (php_sapi_name() !== 'cli') {
            header('Location: /install.php');
            exit;
        }
        echo "请先运行安装向导\n";
        exit(1);
    }
}

function load_core(): void
{
    require_once __DIR__ . '/Database.php';
    require_once __DIR__ . '/Request.php';
    require_once __DIR__ . '/Response.php';
    require_once __DIR__ . '/Auth.php';
    require_once __DIR__ . '/Upload.php';
    require_once __DIR__ . '/Setting.php';
    require_once __DIR__ . '/MinecraftQuery.php';
    require_once __DIR__ . '/MinecraftBedrockQuery.php';
    require_once __DIR__ . '/Version.php';
    require_once __DIR__ . '/Migration.php';
    require_once __DIR__ . '/Updater.php';
    require_once __DIR__ . '/ThemeMarket.php';
}

function cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function setting(string $key, $default = null)
{
    return Setting::get($key, $default);
}

function feature_enabled(string $feature): bool
{
    return Setting::isFeatureEnabled($feature);
}

function check_feature(string $feature): void
{
    if (!feature_enabled($feature)) {
        Response::error('该功能已关闭', 403);
    }
}

function storage_url(?string $path): string
{
    if (!$path) return '';
    if (str_starts_with($path, 'http')) return $path;
    return '/' . $path;
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function clean_html(string $html): string
{
    return strip_tags($html, '<p><br><b><strong><i><em><u><a><img><h1><h2><h3><h4><h5><h6><ul><ol><li><blockquote><pre><code><table><thead><tbody><tr><th><td><span><div>');
}

function throttle_check(string $action, int $maxAttempts = 5, int $decayMinutes = 1): void
{
    $ip = Request::ip();
    $cacheFile = ROOT_PATH . '/cache/throttle_' . md5($ip . $action) . '.json';

    $attempts = 0;
    $resetTime = 0;

    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        if ($data && $data['reset'] > time()) {
            $attempts = $data['attempts'];
            $resetTime = $data['reset'];
        }
    }

    if ($attempts >= $maxAttempts) {
        Response::error('请求过于频繁，请稍后再试', 429);
    }

    $newData = [
        'attempts' => $attempts + 1,
        'reset'    => $resetTime ?: time() + ($decayMinutes * 60),
    ];
    @file_put_contents($cacheFile, json_encode($newData));
}

function mc_query(string $host, int $port, string $protocol = 'java'): array
{
    if ($protocol === 'bedrock') {
        return MinecraftBedrockQuery::query($host, $port);
    }
    return MinecraftQuery::query($host, $port);
}
