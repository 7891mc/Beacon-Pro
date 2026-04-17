<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireLogin();

/** @var string $path */

$method = Request::method();

// GET /friend-links — 列表
if ($method === 'GET' && $path === '') {
    $rows = DB::fetchAll('SELECT * FROM friend_links ORDER BY sort_order ASC, id ASC');
    Response::success($rows);
}

// POST /friend-links — 新增
if ($method === 'POST' && $path === '') {
    $body = Request::body();
    $name = trim((string) ($body['name'] ?? ''));
    $url = trim((string) ($body['url'] ?? ''));
    if ($name === '' || $url === '') {
        Response::error('名称和链接不能为空', 422);
    }
    $now = date('Y-m-d H:i:s');
    $maxSort = (int) DB::fetchColumn('SELECT COALESCE(MAX(sort_order), -1) FROM friend_links');
    $id = DB::insert('friend_links', [
        'name'        => $name,
        'url'         => $url,
        'description' => trim((string) ($body['description'] ?? '')),
        'sort_order'  => $maxSort + 1,
        'is_visible'  => 1,
        'created_at'  => $now,
        'updated_at'  => $now,
    ]);
    $row = DB::fetch('SELECT * FROM friend_links WHERE id=?', [$id]);
    Response::success($row, '已添加');
}

// PUT /friend-links/{id}
if ($method === 'PUT' && preg_match('#^(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    $body = Request::body();
    $data = ['updated_at' => date('Y-m-d H:i:s')];
    if (isset($body['name'])) $data['name'] = trim((string) $body['name']);
    if (isset($body['url'])) $data['url'] = trim((string) $body['url']);
    if (array_key_exists('description', $body)) $data['description'] = trim((string) ($body['description'] ?? ''));
    if (isset($body['sort_order'])) $data['sort_order'] = (int) $body['sort_order'];
    if (isset($body['is_visible'])) $data['is_visible'] = (int) (bool) $body['is_visible'];
    DB::update('friend_links', $data, 'id=?', [$id]);
    $row = DB::fetch('SELECT * FROM friend_links WHERE id=?', [$id]);
    Response::success($row, '已保存');
}

// DELETE /friend-links/{id}
if ($method === 'DELETE' && preg_match('#^(\d+)$#', $path, $m)) {
    DB::delete('friend_links', 'id=?', [(int) $m[1]]);
    Response::success(null, '已删除');
}

Response::error('接口不存在', 404);
