<?php
/**
 * 主题商城 Admin API
 * 路由前缀：/admin/api/theme-market/*
 *
 * $segments 已被 index.php 解析，seg0 = 'theme-market'
 */

$sub     = $segments[1] ?? '';
$subSlug = $segments[2] ?? '';

// GET /admin/api/theme-market/list  — 获取主题列表
if ($method === 'GET' && $sub === 'list') {
    $forceRefresh = isset($_GET['refresh']);
    try {
        $themes = ThemeMarket::list($forceRefresh);
        Response::success($themes);
    } catch (Throwable $e) {
        Response::error('获取主题列表失败：' . $e->getMessage(), 500);
    }
}

// GET /admin/api/theme-market/reviews/{slug}
if ($method === 'GET' && $sub === 'reviews' && $subSlug) {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    try {
        $data = ThemeMarket::reviews($subSlug, $page);
        Response::success($data);
    } catch (Throwable $e) {
        Response::error('获取评价失败：' . $e->getMessage(), 500);
    }
}

// POST /admin/api/theme-market/install/{slug}
if ($method === 'POST' && $sub === 'install' && $subSlug) {
    Auth::requireSuperAdmin();
    try {
        $result = ThemeMarket::install($subSlug);
        if (!empty($result['error'])) {
            Response::error($result['error'], 500);
        }
        Response::success($result, '主题 ' . $subSlug . ' 安装成功，版本 ' . $result['version']);
    } catch (Throwable $e) {
        Response::error('安装失败：' . $e->getMessage(), 500);
    }
}

// POST /admin/api/theme-market/review/{slug}
if ($method === 'POST' && $sub === 'review' && $subSlug) {
    $body     = Request::body();
    $rating   = (int) ($body['rating'] ?? 0);
    $content  = trim($body['content'] ?? '');
    $nickname = trim($body['nickname'] ?? '');

    if ($rating < 1 || $rating > 5) Response::error('评分必须在 1-5 之间', 422);

    try {
        $result = ThemeMarket::submitReview($subSlug, $rating, $content, $nickname);
        if (!empty($result['error'])) Response::error($result['error'], 500);
        Response::success($result, '评价提交成功');
    } catch (Throwable $e) {
        Response::error('提交失败：' . $e->getMessage(), 500);
    }
}

// POST /admin/api/theme-market/uninstall/{slug}
if ($method === 'POST' && $sub === 'uninstall' && $subSlug) {
    Auth::requireSuperAdmin();
    try {
        $result = ThemeMarket::uninstall($subSlug);
        if (!empty($result['error'])) {
            Response::error($result['error'], 400);
        }
        Response::success($result, '主题 ' . $subSlug . ' 已卸载');
    } catch (Throwable $e) {
        Response::error('卸载失败：' . $e->getMessage(), 500);
    }
}

// POST /admin/api/theme-market/feedback/{slug}
if ($method === 'POST' && $sub === 'feedback' && $subSlug) {
    $body    = Request::body();
    $type    = $body['type'] ?? 'other';
    $content = trim($body['content'] ?? '');
    $contact = trim($body['contact'] ?? '');

    if (!$content) Response::error('反馈内容不能为空', 422);

    try {
        $result = ThemeMarket::submitFeedback($subSlug, $type, $content, $contact);
        if (!empty($result['error'])) Response::error($result['error'], 500);
        Response::success([], '反馈提交成功');
    } catch (Throwable $e) {
        Response::error('提交失败：' . $e->getMessage(), 500);
    }
}

Response::error('接口不存在', 404);
