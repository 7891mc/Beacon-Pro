<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$method = Request::method();

if ($method === 'GET') {
    $sql = 'SELECT id, nickname, content, admin_reply, created_at FROM comments WHERE status = ? ORDER BY id DESC';
    $params = ['approved'];
    $page = Request::page();
    $perPage = Request::perPage(20);
    $pageData = DB::paginate($sql, $params, $page, $perPage);
    Response::paginate($pageData);
}

if ($method === 'POST') {
    check_feature('comment');
    throttle_check('api_comment_post', 3, 1);

    $all = Request::all();

    $hp = trim((string) ($all['_hp'] ?? ''));
    if ($hp !== '') {
        Response::error('提交失败', 403);
    }
    $ts = (int) ($all['_ts'] ?? 0);
    if ($ts > 0 && (abs(time() * 1000 - $ts) < 3000)) {
        Response::error('提交过快，请稍后再试', 429);
    }

    $ip = Request::ip();
    $todayCount = (int) DB::fetchColumn(
        "SELECT COUNT(*) FROM comments WHERE ip_address = ? AND DATE(created_at) = CURDATE()",
        [$ip]
    );
    if ($todayCount >= 10) {
        Response::error('今日提交次数已达上限', 429);
    }

    $nickname = isset($all['nickname']) ? trim((string) $all['nickname']) : '';
    $content = isset($all['content']) ? trim((string) $all['content']) : '';
    $email = isset($all['email']) ? trim((string) $all['email']) : '';

    if ($nickname === '') {
        Response::error('昵称不能为空', 422);
    }
    if (mb_strlen($nickname) > 50) {
        Response::error('昵称不能超过50个字符', 422);
    }
    if ($content === '') {
        Response::error('留言内容不能为空', 422);
    }
    if (mb_strlen($content) > 1000) {
        Response::error('留言内容不能超过1000个字符', 422);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('邮箱格式不正确', 422);
    }

    DB::insert('comments', [
        'nickname'   => $nickname,
        'email'      => $email === '' ? null : $email,
        'content'    => strip_tags($content),
        'ip_address' => Request::ip(),
        'status'     => 'pending',
        'created_at' => now(),
    ]);

    Response::success(null, '提交成功，等待审核');
}

Response::error('不支持的请求方法', 405);
