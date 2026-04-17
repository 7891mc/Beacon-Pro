<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

/**
 * @param array $row
 * @return array
 */
function format_post_row(array $row): array
{
    $row['author'] = ['nickname' => $row['author_nickname'] ?? ''];
    $row['category'] = ['name' => $row['category_name'] ?? ''];
    unset($row['author_nickname'], $row['category_name']);
    if (isset($row['is_pinned'])) {
        $row['is_pinned'] = (bool) (int) $row['is_pinned'];
    }
    return $row;
}

if (Request::get('action') === 'categories') {
    $rows = DB::fetchAll('SELECT * FROM post_categories ORDER BY sort_order ASC, id ASC');
    Response::success($rows);
}

$id = Request::get('id');
if ($id !== null && $id !== '') {
    if (!ctype_digit((string) $id)) {
        Response::error('文章 ID 无效', 422);
    }
    $sql = <<<'SQL'
SELECT p.*, u.nickname AS author_nickname, pc.name AS category_name
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN post_categories pc ON p.category_id = pc.id
WHERE p.id = ? AND p.status = 'published'
SQL;
    $row = DB::fetch($sql, [(int) $id]);
    if (!$row) {
        Response::error('文章不存在或未发布', 404);
    }
    $payload = format_post_row($row);
    Response::success($payload);
}

$categoryId = Request::get('category_id');
$params = [];
$where = "p.status = 'published'";
if ($categoryId !== null && $categoryId !== '') {
    $where .= ' AND p.category_id = ?';
    $params[] = (int) $categoryId;
}

$sql = "SELECT p.*, u.nickname AS author_nickname, pc.name AS category_name
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN post_categories pc ON p.category_id = pc.id
        WHERE $where
        ORDER BY p.is_pinned DESC, p.published_at DESC, p.id DESC";

$page = Request::page();
$perPage = Request::perPage(15);
$pageData = DB::paginate($sql, $params, $page, $perPage);

$pageData['items'] = array_map('format_post_row', $pageData['items']);
Response::paginate($pageData);
