<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

/** @var string $path */

$method = Request::method();

$themesDir = ROOT_PATH . '/themes';

// GET /themes/{id}/settings — 读取主题配置清单 + 当前值
if ($method === 'GET' && preg_match('#^([a-zA-Z0-9_-]+)/settings$#', $path, $m)) {
    $themeId = $m[1];
    $manifestFile = $themesDir . '/' . $themeId . '/theme.json';
    if (!is_file($manifestFile)) {
        Response::success(['schema' => [], 'values' => []], 'ok');
    }
    $manifest = json_decode(file_get_contents($manifestFile), true) ?: [];
    $schema = $manifest['settings'] ?? [];
    $values = [];
    foreach ($schema as $field) {
        $dbKey = 'theme_' . $themeId . '_' . $field['key'];
        $stored = Setting::get($dbKey);
        if ($stored !== null) {
            if ($field['type'] === 'switch') {
                $values[$field['key']] = $stored === '1' || $stored === 'true';
            } else {
                $values[$field['key']] = $stored;
            }
        } else {
            $values[$field['key']] = $field['default'] ?? null;
        }
    }
    Response::success([
        'name'   => $manifest['name'] ?? $themeId,
        'description' => $manifest['description'] ?? '',
        'schema' => $schema,
        'values' => $values,
    ], 'ok');
}

// PUT /themes/{id}/settings — 保存主题设置
if ($method === 'PUT' && preg_match('#^([a-zA-Z0-9_-]+)/settings$#', $path, $m)) {
    $themeId = $m[1];
    $manifestFile = $themesDir . '/' . $themeId . '/theme.json';
    $manifest = is_file($manifestFile) ? (json_decode(file_get_contents($manifestFile), true) ?: []) : [];
    $schema = $manifest['settings'] ?? [];
    $allowedKeys = array_column($schema, 'key');
    $body = Request::body();
    $values = $body['values'] ?? $body;
    if (!is_array($values)) $values = [];
    foreach ($values as $key => $val) {
        if (!in_array($key, $allowedKeys, true)) continue;
        $dbKey = 'theme_' . $themeId . '_' . $key;
        if (is_bool($val)) {
            Setting::set($dbKey, $val ? '1' : '0');
        } else {
            Setting::set($dbKey, $val === null ? null : (string) $val);
        }
    }
    Response::success(null, '主题设置已保存');
}

if ($path !== '') {
    Response::error('接口不存在', 404);
}

if ($method === 'GET') {
    $list = [];
    if (is_dir($themesDir)) {
        foreach (scandir($themesDir) ?: [] as $name) {
            if ($name === '.' || $name === '..' || $name === 'shared') {
                continue;
            }
            $full = $themesDir . '/' . $name;
            if (is_dir($full)) {
                $list[] = ['id' => $name, 'name' => $name];
            }
        }
    }
    usort($list, fn ($a, $b) => strcmp($a['id'], $b['id']));
    $current = Setting::get('current_theme', 'starter');
    Response::success([
        'themes'        => $list,
        'current_theme' => $current,
        'current'       => $current,
    ], 'ok');
}

if ($method === 'PUT') {
    $body = Request::body();
    $theme = trim((string) ($body['theme'] ?? Request::post('theme', '')));
    if ($theme === '' || preg_match('#[/\\\\]#', $theme)) {
        Response::error('主题名称无效', 422);
    }
    if ($theme === 'shared') {
        Response::error('不能选择保留目录 shared', 422);
    }
    $full = $themesDir . '/' . $theme;
    if (!is_dir($full)) {
        Response::error('主题目录不存在', 404);
    }
    Setting::set('current_theme', $theme);
    Response::success(['current_theme' => $theme, 'current' => $theme], '主题已切换');
}

Response::error('方法不允许', 405);
