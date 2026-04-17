<?php
/**
 * 前端主题入口
 * 根据后台设置的当前主题，加载对应的 index.html
 */
require_once __DIR__ . '/core/helpers.php';

if (!file_exists(__DIR__ . '/config.php')) {
    header('Location: /install.php');
    exit;
}

load_core();

$theme = Setting::get('current_theme', 'starter');
$theme = preg_replace('/[^a-zA-Z0-9_-]/', '', $theme);
$themePath = __DIR__ . '/themes/' . $theme . '/index.html';

if (!file_exists($themePath)) {
    $theme = 'starter';
    $themePath = __DIR__ . '/themes/starter/index.html';
}

$html = file_get_contents($themePath);
$themeUrl = '/themes/' . $theme . '/';

$html = preg_replace_callback(
    '/((?:src|href)\s*=\s*["\'])(?!\/|https?:\/\/|#|data:)([^"\']+)/',
    function ($m) use ($themeUrl) {
        if (str_starts_with($m[2], '../')) {
            return $m[1] . '/themes/' . substr($m[2], 3);
        }
        return $m[1] . $themeUrl . $m[2];
    },
    $html
);

// 自动触发 cron（按需模式：有人访问首页时查询服务器状态）
if (Setting::get('cron_auto_trigger', '1') === '1') {
    $cronCache = ROOT_PATH . '/cache/mc_status.json';
    $shouldQuery = true;
    $intervalMinutes = max(1, (int) Setting::get('cron_interval_minutes', 1));
    $intervalSeconds = $intervalMinutes * 60;
    if (is_file($cronCache)) {
        $cached = json_decode(@file_get_contents($cronCache), true);
        if ($cached && isset($cached['query_time'])) {
            $diff = time() - strtotime($cached['query_time']);
            if ($diff < $intervalSeconds) {
                $shouldQuery = false;
            }
        }
    }
    if ($shouldQuery) {
        ob_start();
        @include_once ROOT_PATH . '/cron.php';
        ob_end_clean();
    }
}

echo $html;
