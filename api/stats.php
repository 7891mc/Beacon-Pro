<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

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
        'time'         => $r['time_bucket'],
        'avg_players'  => (int) $r['avg_players'],
        'max_players'  => (int) $r['max_players'],
    ];
}

Response::success($out);
