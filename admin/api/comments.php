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
    $nickname = Request::get('nickname');
    $params = [];
    $where = '1=1';
    if ($status !== null && $status !== '') {
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            Response::error('状态参数不合法', 422);
        }
        $where .= ' AND c.status = ?';
        $params[] = $status;
    }
    if ($nickname !== null && $nickname !== '') {
        $where .= ' AND c.nickname LIKE ?';
        $params[] = '%' . $nickname . '%';
    }
    $sql = "SELECT c.* FROM comments c WHERE $where ORDER BY c.id DESC";
    $page = Request::page();
    $perPage = Request::perPage(15);
    $pageData = DB::paginate($sql, $params, $page, $perPage);
    Response::paginate($pageData);
}

if ($method === 'PUT' && preg_match('#^(\d+)/approve$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM comments WHERE id=?', [$id])) {
        Response::error('留言不存在', 404);
    }
    $now = date('Y-m-d H:i:s');
    DB::update('comments', ['status' => 'approved', 'updated_at' => $now], 'id=?', [$id]);
    Response::success(DB::fetch('SELECT * FROM comments WHERE id=?', [$id]), '已通过审核');
}

if ($method === 'PUT' && preg_match('#^(\d+)/reject$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM comments WHERE id=?', [$id])) {
        Response::error('留言不存在', 404);
    }
    $now = date('Y-m-d H:i:s');
    DB::update('comments', ['status' => 'rejected', 'updated_at' => $now], 'id=?', [$id]);
    Response::success(DB::fetch('SELECT * FROM comments WHERE id=?', [$id]), '已拒绝');
}

if ($method === 'PUT' && preg_match('#^(\d+)/reply$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM comments WHERE id=?', [$id])) {
        Response::error('留言不存在', 404);
    }
    $adminReply = trim((string) Request::post('admin_reply', ''));
    if ($adminReply === '') {
        Response::error('请填写回复内容', 422);
    }
    $now = date('Y-m-d H:i:s');
    DB::update('comments', [
        'admin_reply' => $adminReply,
        'status'      => 'approved',
        'updated_at'  => $now,
    ], 'id=?', [$id]);
    Response::success(DB::fetch('SELECT * FROM comments WHERE id=?', [$id]), '回复已保存并已通过审核');
}

if ($method === 'DELETE' && preg_match('#^(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    if (!DB::fetch('SELECT id FROM comments WHERE id=?', [$id])) {
        Response::error('留言不存在', 404);
    }
    DB::delete('comments', 'id=?', [$id]);
    Response::success(null, '留言已删除');
}

Response::error('接口不存在', 404);
