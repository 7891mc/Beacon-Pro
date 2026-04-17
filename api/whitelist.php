<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$method = Request::method();

if ($method === 'GET') {
    $name = trim((string) (Request::get('player_name') ?? ''));
    if ($name === '') {
        Response::error('请提供要查询的游戏 ID', 422);
    }

    $row = DB::fetch(
        'SELECT status, admin_note, created_at FROM whitelist_applications WHERE player_name = ? ORDER BY id DESC LIMIT 1',
        [$name]
    );

    if (!$row) {
        Response::success([
            'status'     => 'not_found',
            'admin_note' => null,
            'created_at' => null,
        ]);
    }

    Response::success([
        'status'     => $row['status'],
        'admin_note' => $row['admin_note'] ?? null,
        'created_at' => $row['created_at'],
    ]);
}

if ($method === 'POST') {
    check_feature('whitelist');
    throttle_check('api_whitelist_apply', 3, 5);

    $all = Request::all();

    $hp = trim((string) ($all['_hp'] ?? ''));
    if ($hp !== '') {
        Response::error('提交失败', 403);
    }
    $ts = (int) ($all['_ts'] ?? 0);
    if ($ts > 0 && (abs(time() * 1000 - $ts) < 3000)) {
        Response::error('提交过快，请稍后再试', 429);
    }

    $playerName = isset($all['player_name']) ? trim((string) $all['player_name']) : '';
    $platform = isset($all['platform']) ? trim((string) $all['platform']) : '';
    $contact = isset($all['contact']) ? trim((string) $all['contact']) : '';
    $reason = isset($all['reason']) ? trim((string) $all['reason']) : '';

    if ($playerName === '') {
        Response::error('游戏 ID 不能为空', 422);
    }
    if (mb_strlen($playerName) > 50) {
        Response::error('游戏 ID 不能超过50个字符', 422);
    }
    if ($platform === '') {
        Response::error('请选择游戏平台', 422);
    }
    if (!in_array($platform, ['java', 'bedrock'], true)) {
        Response::error('平台类型不合法', 422);
    }

    $pending = DB::fetch(
        "SELECT id FROM whitelist_applications WHERE player_name = ? AND status = 'pending' LIMIT 1",
        [$playerName]
    );
    if ($pending) {
        Response::error('您已有待审核的申请，请勿重复提交', 409);
    }

    DB::insert('whitelist_applications', [
        'player_name' => $playerName,
        'platform'    => $platform,
        'contact'     => $contact === '' ? null : $contact,
        'reason'      => $reason === '' ? null : strip_tags($reason),
        'status'      => 'pending',
        'created_at'  => now(),
    ]);

    Response::success(null, '申请已提交，请等待审核');
}

Response::error('不支持的请求方法', 405);
