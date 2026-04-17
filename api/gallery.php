<?php
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

if (Request::get('action') === 'categories') {
    $sql = <<<'SQL'
SELECT gc.id, gc.name, gc.sort_order, COUNT(gi.id) AS images_count
FROM gallery_categories gc
LEFT JOIN gallery_images gi ON gi.category_id = gc.id
GROUP BY gc.id, gc.name, gc.sort_order
ORDER BY gc.sort_order ASC, gc.id ASC
SQL;
    $rows = DB::fetchAll($sql);
    foreach ($rows as &$r) {
        $r['images_count'] = (int) $r['images_count'];
    }
    unset($r);
    Response::success($rows);
}

$categoryId = Request::get('category_id');
$params = [];
$where = '1=1';
if ($categoryId !== null && $categoryId !== '') {
    $where .= ' AND gi.category_id = ?';
    $params[] = (int) $categoryId;
}

$sql = "SELECT gi.*, gc.name AS category_name
        FROM gallery_images gi
        LEFT JOIN gallery_categories gc ON gi.category_id = gc.id
        WHERE $where
        ORDER BY gi.sort_order ASC, gi.id DESC";

$page = Request::page();
$perPage = Request::perPage(15);
$pageData = DB::paginate($sql, $params, $page, $perPage);
Response::paginate($pageData);
