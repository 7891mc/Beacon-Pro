<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

/** @var string $path */

$method = Request::method();

$siteKeys = [
    'site_name', 'site_description', 'site_keywords', 'cron_auto_trigger', 'cron_interval_minutes',
];

if ($path === 'site') {
    if ($method === 'GET') {
        $out = [];
        foreach ($siteKeys as $k) {
            $out[$k] = Setting::get($k, '');
        }
        Response::success($out, 'ok');
    }
    if ($method === 'PUT') {
        $body = Request::body();
        foreach ($siteKeys as $k) {
            if (array_key_exists($k, $body)) {
                $v = (string) $body[$k];
                if ($k === 'cron_interval_minutes') {
                    $v = max(1, (int) $v);
                    $v = (string) $v;
                }
                Setting::set($k, $v);
            }
        }
        Response::success(null, '设置已保存');
    }
    Response::error('方法不允许', 405);
}

if ($path !== '') {
    Response::error('接口不存在', 404);
}

if ($method === 'GET') {
    Response::success(Setting::allSettings(), 'ok');
}

if ($method === 'PUT') {
    $body = Request::body();
    $settings = $body['settings'] ?? null;
    if (!is_array($settings)) {
        Response::error('请提供 settings 对象', 422);
    }
    foreach ($settings as $key => $value) {
        if (!is_string($key) || $key === '') {
            continue;
        }
        Setting::set($key, $value === null ? null : (string) $value);
    }
    Response::success(Setting::allSettings(), '设置已保存');
}

Response::error('方法不允许', 405);
