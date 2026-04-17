<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$cacheFile = ROOT_PATH . '/cache/mc_status.json';
$maxAge = 35;

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) <= $maxAge) {
    $raw = file_get_contents($cacheFile);
    $cached = json_decode($raw, true);
    if (is_array($cached)) {
        Response::success($cached);
    }
}

$row = DB::fetch(
    'SELECT is_online, online_players, max_players, player_list, version, motd, latency_ms, recorded_at
     FROM server_status_logs
     ORDER BY recorded_at DESC, id DESC
     LIMIT 1'
);

$config = DB::fetch('SELECT server_name FROM server_configs ORDER BY id ASC LIMIT 1');
$serverName = $config['server_name'] ?? null;

if (!$row) {
    Response::success([
        'is_online'      => false,
        'online_players' => 0,
        'max_players'    => 0,
        'player_list'    => [],
        'version'        => null,
        'motd'           => null,
        'latency_ms'     => null,
        'query_time'     => null,
        'server_name'    => $serverName,
    ]);
}

$players = $row['player_list'];
if (is_string($players) && $players !== '') {
    $decoded = json_decode($players, true);
    $row['player_list'] = is_array($decoded) ? $decoded : [];
} else {
    $row['player_list'] = [];
}

$row['is_online'] = (bool) (int) $row['is_online'];
$row['online_players'] = (int) $row['online_players'];
$row['max_players'] = (int) $row['max_players'];
if ($row['latency_ms'] !== null) {
    $row['latency_ms'] = (int) $row['latency_ms'];
}
$row['query_time'] = $row['recorded_at'];
$row['server_name'] = $serverName;
unset($row['recorded_at']);

Response::success($row);
