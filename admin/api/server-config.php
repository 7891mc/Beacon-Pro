<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

$method = Request::method();

if ($method === 'GET') {
    $row = DB::fetch('SELECT * FROM server_configs ORDER BY id ASC LIMIT 1');
    if (!$row) {
        Response::success(null, '暂无服务器配置');
    }
    Response::success($row, 'ok');
}

if ($method === 'PUT') {
    $body = Request::body();
    $serverName = trim((string) ($body['server_name'] ?? ''));
    $host = trim((string) ($body['host'] ?? ''));
    $port = isset($body['port']) ? (int) $body['port'] : 25565;
    $queryPort = array_key_exists('query_port', $body) && $body['query_port'] !== '' && $body['query_port'] !== null
        ? (int) $body['query_port']
        : null;
    $protocol = (string) ($body['protocol'] ?? 'java');
    if (!in_array($protocol, ['java', 'bedrock'], true)) {
        Response::error('协议必须为 java 或 bedrock', 422);
    }
    if ($serverName === '') {
        $serverName = 'My Server';
    }
    if ($host === '') {
        $host = '127.0.0.1';
    }
    $now = date('Y-m-d H:i:s');
    $existing = DB::fetch('SELECT id FROM server_configs ORDER BY id ASC LIMIT 1');
    $data = [
        'server_name' => $serverName,
        'host'        => $host,
        'port'        => $port,
        'query_port'  => $queryPort,
        'protocol'    => $protocol,
        'updated_at'  => $now,
    ];
    if ($existing) {
        DB::update('server_configs', $data, 'id=?', [(int) $existing['id']]);
        $row = DB::fetch('SELECT * FROM server_configs WHERE id=?', [(int) $existing['id']]);
    } else {
        $data['created_at'] = $now;
        $id = DB::insert('server_configs', $data);
        $row = DB::fetch('SELECT * FROM server_configs WHERE id=?', [$id]);
    }

    $defaultPort = $protocol === 'bedrock' ? 19132 : 25565;
    $displayAddr = $port === $defaultPort ? $host : $host . ':' . $port;
    Setting::set('server_address_display', $displayAddr);
    $currentTheme = Setting::get('current_theme', 'starter');
    Setting::set('theme_' . $currentTheme . '_server_address_display', $displayAddr);

    $cacheFile = ROOT_PATH . '/cache/mc_status.json';
    if (is_file($cacheFile)) {
        @unlink($cacheFile);
    }

    $actualPort = $queryPort ?? $port;
    try {
        $status = mc_query($host, $actualPort, $protocol);
        DB::insert('server_status_logs', [
            'online_players' => $status['online_players'],
            'max_players'    => $status['max_players'],
            'player_list'    => json_encode($status['player_list']),
            'version'        => $status['version'],
            'motd'           => $status['motd'],
            'latency_ms'     => $status['latency_ms'],
            'is_online'      => $status['is_online'] ? 1 : 0,
            'recorded_at'    => $now,
        ]);
        $cacheData = array_merge($status, [
            'server_name' => $serverName,
            'query_time'  => $now,
        ]);
        @file_put_contents($cacheFile, json_encode($cacheData, JSON_UNESCAPED_UNICODE));
    } catch (Throwable $e) {
        // 查询失败不影响配置保存
    }

    Response::success($row, '服务器配置已保存');
}

Response::error('方法不允许', 405);
