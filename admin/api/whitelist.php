<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

/** @var string $path */

$method = Request::method();
Auth::requireLogin();

if ($method === 'GET' && $path === '') {
    $status = Request::get('status');
    $platform = Request::get('platform');
    $playerName = Request::get('player_name');
    $params = [];
    $where = '1=1';
    if ($status !== null && $status !== '') {
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            Response::error('状态参数不合法', 422);
        }
        $where .= ' AND w.status = ?';
        $params[] = $status;
    }
    if ($platform !== null && $platform !== '') {
        if (!in_array($platform, ['java', 'bedrock'], true)) {
            Response::error('平台参数不合法', 422);
        }
        $where .= ' AND w.platform = ?';
        $params[] = $platform;
    }
    if ($playerName !== null && $playerName !== '') {
        $where .= ' AND w.player_name LIKE ?';
        $params[] = '%' . $playerName . '%';
    }
    $sql = "SELECT w.* FROM whitelist_applications w WHERE $where ORDER BY w.id DESC";
    $page = Request::page();
    $perPage = Request::perPage(15);
    $pageData = DB::paginate($sql, $params, $page, $perPage);
    Response::paginate($pageData);
}

if ($method === 'PUT' && preg_match('#^(\d+)/approve$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM whitelist_applications WHERE id=?', [$id])) {
        Response::error('申请不存在', 404);
    }
    $adminNote = trim((string) Request::post('admin_note', ''));
    $now = date('Y-m-d H:i:s');
    DB::update('whitelist_applications', [
        'status'     => 'approved',
        'admin_note' => $adminNote !== '' ? $adminNote : null,
        'updated_at' => $now,
    ], 'id=?', [$id]);
    Response::success(DB::fetch('SELECT * FROM whitelist_applications WHERE id=?', [$id]), '已通过申请');
}

if ($method === 'PUT' && preg_match('#^(\d+)/reject$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM whitelist_applications WHERE id=?', [$id])) {
        Response::error('申请不存在', 404);
    }
    $adminNote = trim((string) Request::post('admin_note', ''));
    $now = date('Y-m-d H:i:s');
    DB::update('whitelist_applications', [
        'status'     => 'rejected',
        'admin_note' => $adminNote !== '' ? $adminNote : null,
        'updated_at' => $now,
    ], 'id=?', [$id]);
    Response::success(DB::fetch('SELECT * FROM whitelist_applications WHERE id=?', [$id]), '已拒绝申请');
}

if ($method === 'DELETE' && preg_match('#^(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM whitelist_applications WHERE id=?', [$id])) {
        Response::error('申请不存在', 404);
    }
    DB::delete('whitelist_applications', 'id=?', [$id]);
    Response::success(null, '申请已删除');
}

Response::error('接口不存在', 404);
