<?php

class Migration
{
    private static string $table = 'schema_migrations';

    static function ensureTable(): void
    {
        DB::query("CREATE TABLE IF NOT EXISTS `" . self::$table . "` (
            `version` VARCHAR(20) NOT NULL,
            `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`version`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    /**
     * 获取已执行的版本列表
     */
    static function executed(): array
    {
        self::ensureTable();
        $rows = DB::fetchAll("SELECT version FROM `" . self::$table . "` ORDER BY version ASC");
        return array_column($rows, 'version');
    }

    /**
     * 获取待执行的迁移文件（按版本升序）
     */
    static function pending(string $dir = null): array
    {
        $dir = $dir ?: ROOT_PATH . '/migrations';
        if (!is_dir($dir)) return [];

        $executed = self::executed();
        $pending = [];

        foreach (glob($dir . '/*.sql') as $file) {
            $version = basename($file, '.sql');
            if (!in_array($version, $executed, true)) {
                $pending[$version] = $file;
            }
        }

        uksort($pending, 'version_compare');
        return $pending;
    }

    /**
     * 执行所有待处理迁移，返回执行结果
     */
    static function run(string $dir = null): array
    {
        $pending = self::pending($dir);
        $results = [];

        foreach ($pending as $version => $file) {
            $sql = file_get_contents($file);
            if (!$sql || !trim($sql)) {
                $results[] = ['version' => $version, 'status' => 'skipped', 'message' => '空文件'];
                continue;
            }

            try {
                $statements = array_filter(
                    array_map('trim', explode(';', $sql)),
                    fn($s) => $s !== ''
                );
                foreach ($statements as $stmt) {
                    DB::query($stmt);
                }
                DB::query(
                    "INSERT INTO `" . self::$table . "` (version, executed_at) VALUES (?, NOW())",
                    [$version]
                );
                $results[] = ['version' => $version, 'status' => 'ok', 'message' => ''];
            } catch (\Throwable $e) {
                $results[] = ['version' => $version, 'status' => 'error', 'message' => $e->getMessage()];
                break;
            }
        }

        return $results;
    }

    /**
     * 标记某个版本已执行（用于安装时标记初始版本）
     */
    static function markExecuted(string $version): void
    {
        self::ensureTable();
        $exists = DB::fetchColumn(
            "SELECT COUNT(*) FROM `" . self::$table . "` WHERE version = ?",
            [$version]
        );
        if (!$exists) {
            DB::query(
                "INSERT INTO `" . self::$table . "` (version, executed_at) VALUES (?, NOW())",
                [$version]
            );
        }
    }
}
