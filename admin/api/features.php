<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

/** @var string $path */

$method = Request::method();

if ($path !== '') {
    Response::error('接口不存在', 404);
}

if ($method === 'GET') {
    $rows = DB::fetchAll('SELECT * FROM feature_toggles ORDER BY id ASC');
    Response::success($rows, 'ok');
}

if ($method === 'PUT') {
    $body = Request::body();
    $features = $body['features'] ?? $body['toggles'] ?? null;
    if (!is_array($features)) {
        Response::error('请提供 features 数组', 422);
    }
    $now = date('Y-m-d H:i:s');
    foreach ($features as $item) {
        if (!is_array($item)) {
            continue;
        }
        $feature = isset($item['feature']) ? trim((string) $item['feature']) : '';
        if ($feature === '') {
            continue;
        }
        if (!DB::fetch('SELECT id FROM feature_toggles WHERE feature=?', [$feature])) {
            continue;
        }
        $enabled = !empty($item['is_enabled']) ? 1 : 0;
        DB::update('feature_toggles', [
            'is_enabled' => $enabled,
            'updated_at' => $now,
        ], 'feature=?', [$feature]);
    }
    Setting::flush();
    $rows = DB::fetchAll('SELECT * FROM feature_toggles ORDER BY id ASC');
    Response::success($rows, '功能开关已更新');
}

Response::error('方法不允许', 405);
