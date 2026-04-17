<?php
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

if (!isset($action)) {
    Response::error('禁止直接访问', 403);
}

/** @var string $action 由 index.php 传入 */

switch ($action) {
    case 'login':
        $username = trim((string) Request::post('username', ''));
        $password = (string) Request::post('password', '');
        if ($username === '' || $password === '') {
            Response::error('请输入用户名和密码', 422);
        }
        $user = Auth::attempt($username, $password);
        if (!$user) {
            Response::error('用户名或密码错误', 401);
        }
        $token = $user['token'];
        unset($user['token']);
        Response::success([
            'token' => $token,
            'user'  => $user,
        ], '登录成功');
        break;

    case 'logout':
        Auth::logout();
        Response::success(null, '已退出登录');
        break;

    case 'me':
        $user = Auth::check();
        if (!$user) {
            Response::error('未登录，请先登录', 401);
        }
        Response::success($user, 'ok');
        break;

    case 'password':
        $user = Auth::requireLogin();
        $old = (string) Request::post('old_password', '');
        $new = (string) Request::post('new_password', '');
        if ($old === '' || $new === '') {
            Response::error('请填写原密码和新密码', 422);
        }
        if (strlen($new) < 6) {
            Response::error('新密码长度至少 6 位', 422);
        }
        $row = DB::fetch('SELECT id, password FROM users WHERE id=?', [(int) $user['id']]);
        if (!$row || !password_verify($old, $row['password'])) {
            Response::error('原密码不正确', 422);
        }
        DB::update('users', [
            'password'   => password_hash($new, PASSWORD_DEFAULT),
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id=?', [(int) $user['id']]);
        Response::success(null, '密码已修改');
        break;

    default:
        Response::error('未知操作', 400);
}
