<?php
/**
 * 公开 API 路由分发：解析 /api/... 路径并加载对应端点。
 */
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$method = Request::method();

if (!empty($_SERVER['PATH_INFO'])) {
    $tail = trim((string) $_SERVER['PATH_INFO'], '/');
} else {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $path = rawurldecode($path);
    if (!preg_match('#/api(?:/index\.php)?(?:/|$)(.*)$#u', $path, $m)) {
        Response::error('接口不存在', 404);
    }
    $tail = trim($m[1], '/');
}

$segments = $tail === '' ? [] : explode('/', $tail);

$dispatch = function (string $file): void {
    require __DIR__ . '/' . $file;
};

// --- 路由匹配（按具体程度排序）---

// GET /api/server/stats/24h
if ($method === 'GET' && $segments === ['server', 'stats', '24h']) {
    $dispatch('stats.php');
}

// GET /api/site/info
if ($method === 'GET' && $segments === ['site', 'info']) {
    $dispatch('site-info.php');
}

// GET /api/server/status
if ($method === 'GET' && $segments === ['server', 'status']) {
    $dispatch('server-status.php');
}

// GET /api/gallery/categories → gallery.php + action
if ($method === 'GET' && $segments === ['gallery', 'categories']) {
    $_GET['action'] = 'categories';
    $dispatch('gallery.php');
}

// GET /api/gallery
if ($method === 'GET' && $segments === ['gallery']) {
    $dispatch('gallery.php');
}

// GET /api/posts/categories
if ($method === 'GET' && $segments === ['posts', 'categories']) {
    $_GET['action'] = 'categories';
    $dispatch('posts.php');
}

// GET /api/posts/{数字}
if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'posts' && ctype_digit($segments[1])) {
    $_GET['id'] = $segments[1];
    $dispatch('posts.php');
}

// GET /api/posts
if ($method === 'GET' && $segments === ['posts']) {
    $dispatch('posts.php');
}

// GET/POST /api/comments
if (($method === 'GET' || $method === 'POST') && $segments === ['comments']) {
    $dispatch('comments.php');
}

// POST /api/whitelist/apply
if ($method === 'POST' && $segments === ['whitelist', 'apply']) {
    $dispatch('whitelist.php');
}

// GET /api/whitelist/check/{name}
if ($method === 'GET' && count($segments) === 3 && $segments[0] === 'whitelist' && $segments[1] === 'check' && $segments[2] !== '') {
    $_GET['player_name'] = rawurldecode($segments[2]);
    $dispatch('whitelist.php');
}

// GET /api/friend-links
if ($method === 'GET' && $segments === ['friend-links']) {
    $dispatch('friend-links.php');
}

Response::error('接口不存在', 404);
