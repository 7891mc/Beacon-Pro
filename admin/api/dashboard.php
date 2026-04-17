<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

/** @var string $path 由 index.php 传入：'' | stats | chart */

$method = Request::method();
if ($method !== 'GET') {
    Response::error('方法不允许', 405);
}

$latest = DB::fetch(
    'SELECT online_players, max_players, is_online FROM server_status_logs ORDER BY recorded_at DESC, id DESC LIMIT 1'
);

$todayPeak = (int) DB::fetchColumn(
    'SELECT COALESCE(MAX(online_players), 0) FROM server_status_logs WHERE DATE(recorded_at) = CURDATE()'
);

$server = [
    'current_online' => $latest ? (int) $latest['online_players'] : 0,
    'is_online'      => $latest ? (bool) (int) $latest['is_online'] : false,
    'today_peak'     => $todayPeak,
];

$counts = [
    'posts'                        => (int) DB::fetchColumn('SELECT COUNT(*) FROM posts'),
    'gallery_images'               => (int) DB::fetchColumn('SELECT COUNT(*) FROM gallery_images'),
    'pending_comments'           => (int) DB::fetchColumn("SELECT COUNT(*) FROM comments WHERE status='pending'"),
    'pending_whitelist'          => (int) DB::fetchColumn("SELECT COUNT(*) FROM whitelist_applications WHERE status='pending'"),
];

// GET /dashboard — 规范结构
if ($path === '') {
    Response::success([
        'server' => $server,
        'counts' => $counts,
    ], 'ok');
}

// GET /dashboard/stats — 扁平结构（兼容后台仪表盘页）
if ($path === 'stats') {
    Response::success([
        'server_online'      => $server['is_online'],
        'online_players'     => $server['current_online'],
        'max_players'        => $latest ? (int) $latest['max_players'] : 0,
        'peak_today'         => $server['today_peak'],
        'posts_total'        => $counts['posts'],
        'pending_comments'   => $counts['pending_comments'],
        'pending_whitelist'  => $counts['pending_whitelist'],
    ], 'ok');
}

// GET /dashboard/chart — 近 24 小时在线趋势
if ($path === 'chart') {
    $sql = <<<'SQL'
SELECT
    FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(recorded_at) / 300) * 300) AS time_bucket,
    ROUND(AVG(online_players)) AS avg_players,
    MAX(online_players) AS max_players
FROM server_status_logs
WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY time_bucket
ORDER BY time_bucket
SQL;
    $rows = DB::fetchAll($sql);
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'time'        => $r['time_bucket'],
            'avg_players' => (int) $r['avg_players'],
            'max_players' => (int) $r['max_players'],
        ];
    }
    Response::success($out, 'ok');
}

Response::error('接口不存在', 404);
