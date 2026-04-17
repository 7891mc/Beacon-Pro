<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$rows = DB::fetchAll('SELECT name, url, description FROM friend_links WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC');
Response::success($rows);
