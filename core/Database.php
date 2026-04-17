<?php
/**
 * 数据库 PDO 单例封装
 */
class DB
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $cfg = require __DIR__ . '/../config.php';
            $dsn = "mysql:host={$cfg['db_host']};port={$cfg['db_port']};dbname={$cfg['db_name']};charset=utf8mb4";
            self::$pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$pdo;
    }

    public static function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::conn()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetch(string $sql, array $params = []): ?array
    {
        $row = self::query($sql, $params)->fetch();
        return $row ?: null;
    }

    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function fetchColumn(string $sql, array $params = [])
    {
        return self::query($sql, $params)->fetchColumn();
    }

    public static function insert(string $table, array $data): int
    {
        $fields = implode(',', array_map(fn($k) => "`$k`", array_keys($data)));
        $holders = implode(',', array_fill(0, count($data), '?'));
        self::query("INSERT INTO `$table` ($fields) VALUES ($holders)", array_values($data));
        return (int) self::conn()->lastInsertId();
    }

    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $set = implode(',', array_map(fn($k) => "`$k`=?", array_keys($data)));
        $stmt = self::query("UPDATE `$table` SET $set WHERE $where", array_merge(array_values($data), $whereParams));
        return $stmt->rowCount();
    }

    public static function delete(string $table, string $where, array $params = []): int
    {
        return self::query("DELETE FROM `$table` WHERE $where", $params)->rowCount();
    }

    public static function paginate(string $sql, array $params, int $page = 1, int $perPage = 15): array
    {
        $page = max(1, $page);
        $countSql = preg_replace('/SELECT .+? FROM/is', 'SELECT COUNT(*) FROM', $sql, 1);
        $countSql = preg_replace('/ORDER BY .+$/i', '', $countSql);
        $total = (int) self::fetchColumn($countSql, $params);

        $offset = ($page - 1) * $perPage;
        $items = self::fetchAll($sql . " LIMIT $perPage OFFSET $offset", $params);

        return [
            'items'        => $items,
            'current_page' => $page,
            'per_page'     => $perPage,
            'total'        => $total,
            'last_page'    => (int) ceil($total / $perPage),
        ];
    }
}
