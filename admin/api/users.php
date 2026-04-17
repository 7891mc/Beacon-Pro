<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

/** @var string $path */

$method = Request::method();
$me = Auth::check();

if ($method === 'GET' && $path === '') {
    $keyword = trim((string) Request::get('keyword', ''));
    $status = Request::get('status');
    $params = [];
    $where = '1=1';
    if ($keyword !== '') {
        $where .= ' AND (username LIKE ? OR nickname LIKE ?)';
        $like = '%' . $keyword . '%';
        $params[] = $like;
        $params[] = $like;
    }
    if ($status !== null && $status !== '') {
        $where .= ' AND status = ?';
        $params[] = (int) $status;
    }
    $sql = "SELECT id, username, nickname, email, role, status, last_login_at, created_at, updated_at
            FROM users WHERE $where ORDER BY id ASC";
    $page = Request::page();
    $perPage = Request::perPage(15);
    $pageData = DB::paginate($sql, $params, $page, $perPage);
    Response::paginate($pageData);
}

if ($method === 'POST' && $path === '') {
    $username = trim((string) Request::post('username', ''));
    $password = (string) Request::post('password', '');
    $nickname = trim((string) Request::post('nickname', ''));
    $email = trim((string) Request::post('email', ''));
    $role = (string) Request::post('role', 'content_admin');
    $status = Request::post('status');
    if ($username === '' || $password === '') {
        Response::error('用户名和密码不能为空', 422);
    }
    if (strlen($password) < 6) {
        Response::error('密码长度至少 6 位', 422);
    }
    if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
        Response::error('用户名需为 3–50 位字母、数字或下划线', 422);
    }
    if (!in_array($role, ['super_admin', 'content_admin'], true)) {
        Response::error('角色不合法', 422);
    }
    if (DB::fetch('SELECT id FROM users WHERE username=?', [$username])) {
        Response::error('用户名已存在', 422);
    }
    $st = $status !== null && $status !== '' ? (int) $status : 1;
    $now = date('Y-m-d H:i:s');
    $id = DB::insert('users', [
        'username'   => $username,
        'password'   => password_hash($password, PASSWORD_DEFAULT),
        'nickname'   => $nickname !== '' ? $nickname : $username,
        'email'      => $email !== '' ? $email : null,
        'role'       => $role,
        'status'     => $st,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $row = DB::fetch('SELECT id, username, nickname, email, role, status, last_login_at, created_at, updated_at FROM users WHERE id=?', [$id]);
    Response::success($row, '用户已创建');
}

if ($method === 'PUT' && preg_match('#^(\d+)/toggle-status$#', $path, $m)) {
    $id = (int) $m[1];
    $row = DB::fetch('SELECT id, status FROM users WHERE id=?', [$id]);
    if (!$row) {
        Response::error('用户不存在', 404);
    }
    $newStatus = (int) $row['status'] ? 0 : 1;
    DB::update('users', ['status' => $newStatus, 'updated_at' => date('Y-m-d H:i:s')], 'id=?', [$id]);
    $out = DB::fetch('SELECT id, username, nickname, email, role, status, last_login_at, created_at, updated_at FROM users WHERE id=?', [$id]);
    Response::success($out, $newStatus ? '用户已启用' : '用户已禁用');
}

if ($method === 'PUT' && preg_match('#^(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    $row = DB::fetch('SELECT * FROM users WHERE id=?', [$id]);
    if (!$row) {
        Response::error('用户不存在', 404);
    }
    $body = Request::body();
    $data = ['updated_at' => date('Y-m-d H:i:s')];
    if (array_key_exists('nickname', $body)) {
        $data['nickname'] = trim((string) $body['nickname']);
    }
    if (array_key_exists('email', $body)) {
        $em = trim((string) $body['email']);
        $data['email'] = $em !== '' ? $em : null;
    }
    if (array_key_exists('role', $body)) {
        $r = (string) $body['role'];
        if (!in_array($r, ['super_admin', 'content_admin'], true)) {
            Response::error('角色不合法', 422);
        }
        $data['role'] = $r;
    }
    if (array_key_exists('status', $body)) {
        $data['status'] = (int) (bool) $body['status'];
    }
    if (array_key_exists('password', $body) && $body['password'] !== null && (string) $body['password'] !== '') {
        $pwd = (string) $body['password'];
        if (strlen($pwd) < 6) {
            Response::error('密码长度至少 6 位', 422);
        }
        $data['password'] = password_hash($pwd, PASSWORD_DEFAULT);
    }
    if (array_key_exists('username', $body)) {
        Response::error('不允许修改用户名', 422);
    }
    DB::update('users', $data, 'id=?', [$id]);
    $out = DB::fetch('SELECT id, username, nickname, email, role, status, last_login_at, created_at, updated_at FROM users WHERE id=?', [$id]);
    Response::success($out, '用户已更新');
}

if ($method === 'DELETE' && preg_match('#^(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    if ($me && $id === (int) $me['id']) {
        Response::error('不能删除当前登录账号', 422);
    }
    if (!DB::fetch('SELECT id FROM users WHERE id=?', [$id])) {
        Response::error('用户不存在', 404);
    }
    DB::delete('users', 'id=?', [$id]);
    Response::success(null, '用户已删除');
}

Response::error('接口不存在', 404);
