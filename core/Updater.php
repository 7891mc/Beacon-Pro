<?php

class Updater
{
    private static string $cacheDir = '';
    private static string $backupDir = '';

    private static function dirs(): void
    {
        self::$cacheDir = ROOT_PATH . '/cache/updates';
        self::$backupDir = ROOT_PATH . '/cache/backups';
        if (!is_dir(self::$cacheDir)) @mkdir(self::$cacheDir, 0755, true);
        if (!is_dir(self::$backupDir)) @mkdir(self::$backupDir, 0755, true);
    }

    /**
     * 向更新服务器检查新版本
     */
    static function check(): array
    {
        $url = Version::UPDATE_SERVER . '/index.php?path=api/releases/latest&version=' . urlencode(Version::CURRENT);

        $ctx = stream_context_create([
            'http' => [
                'timeout' => 10,
                'header'  => "User-Agent: Beacon/" . Version::CURRENT . "\r\n",
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);

        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) {
            return ['has_update' => false, 'error' => '无法连接更新服务器'];
        }

        $data = json_decode($body, true);
        if (!$data || empty($data['latest_version'])) {
            return ['has_update' => false, 'error' => '更新服务器返回格式异常'];
        }

        $hasUpdate = Version::hasNewer($data['latest_version']);

        return [
            'has_update'     => $hasUpdate,
            'current'        => Version::CURRENT,
            'latest_version' => $data['latest_version'],
            'changelog'      => $data['changelog'] ?? '',
            'download_url'   => $data['download_url'] ?? '',
            'released_at'    => $data['released_at'] ?? '',
            'min_php'        => $data['min_php_version'] ?? '7.4',
            'file_hash'      => $data['file_hash'] ?? '',
        ];
    }

    /**
     * 创建当前版本备份
     */
    static function backup(): string
    {
        self::dirs();
        $name = 'backup-' . Version::CURRENT . '-' . date('Ymd_His') . '.zip';
        $path = self::$backupDir . '/' . $name;

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('无法创建备份文件');
        }

        $excludes = ['cache', 'uploads', '.cursor', 'node_modules', '.git'];
        self::addDirToZip($zip, ROOT_PATH, ROOT_PATH, $excludes);
        $zip->close();

        return $path;
    }

    private static function addDirToZip(ZipArchive $zip, string $dir, string $root, array $excludes): void
    {
        $items = @scandir($dir);
        if (!$items) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;

            $full = $dir . '/' . $item;
            $relative = ltrim(str_replace($root, '', $full), '/');
            $topLevel = explode('/', $relative)[0];

            if (in_array($topLevel, $excludes, true)) continue;

            if (is_dir($full)) {
                $zip->addEmptyDir($relative);
                self::addDirToZip($zip, $full, $root, $excludes);
            } else {
                if (filesize($full) < 50 * 1024 * 1024) {
                    $zip->addFile($full, $relative);
                }
            }
        }
    }

    /**
     * 下载更新包
     */
    static function download(string $url, string $expectedHash = ''): string
    {
        self::dirs();
        $tmpFile = self::$cacheDir . '/update-' . time() . '.zip';

        $ctx = stream_context_create([
            'http' => [
                'timeout' => 300,
                'header'  => "User-Agent: Beacon/" . Version::CURRENT . "\r\n",
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);

        $data = @file_get_contents($url, false, $ctx);
        if ($data === false) {
            throw new \RuntimeException('下载更新包失败');
        }

        file_put_contents($tmpFile, $data);

        if ($expectedHash) {
            if (strpos($expectedHash, ':') !== false) {
                [$algo, $expect] = explode(':', $expectedHash, 2);
            } else {
                $algo = 'sha256';
                $expect = $expectedHash;
            }
            $actual = hash_file($algo, $tmpFile);
            if ($actual !== $expect) {
                @unlink($tmpFile);
                throw new \RuntimeException('更新包校验失败');
            }
        }

        return $tmpFile;
    }

    /**
     * 应用更新包
     */
    static function apply(string $zipPath): array
    {
        self::dirs();
        $extractDir = self::$cacheDir . '/extract-' . time();

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException('无法打开更新包');
        }
        $zip->extractTo($extractDir);
        $zip->close();

        $sourceDir = $extractDir;
        $manifest = $extractDir . '/update-manifest.json';
        $manifestData = [];
        if (is_file($manifest)) {
            $manifestData = json_decode(file_get_contents($manifest), true) ?: [];
        }

        $protectedPaths = ['config.php', 'uploads', 'cache', '.cursor'];
        if (!empty($manifestData['protected'])) {
            $protectedPaths = array_merge($protectedPaths, $manifestData['protected']);
        }

        self::copyDir($sourceDir, ROOT_PATH, $protectedPaths);

        $migrationResults = [];
        $migDir = $extractDir . '/migrations';
        if (is_dir($migDir)) {
            self::copyDir($migDir, ROOT_PATH . '/migrations', []);
            $migrationResults = Migration::run();
        }

        self::removeDir($extractDir);
        @unlink($zipPath);

        return [
            'version'    => $manifestData['version'] ?? '未知',
            'migrations' => $migrationResults,
        ];
    }

    private static function copyDir(string $src, string $dst, array $protected): void
    {
        if (!is_dir($dst)) @mkdir($dst, 0755, true);
        $items = @scandir($src);
        if (!$items) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            if ($item === 'update-manifest.json') continue;

            if (in_array($item, $protected, true)) continue;

            $srcPath = $src . '/' . $item;
            $dstPath = $dst . '/' . $item;

            if (is_dir($srcPath)) {
                self::copyDir($srcPath, $dstPath, []);
            } else {
                @copy($srcPath, $dstPath);
            }
        }
    }

    static function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = @scandir($dir);
        if (!$items) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . '/' . $item;
            is_dir($path) ? self::removeDir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    /**
     * 获取备份列表
     */
    static function backups(): array
    {
        self::dirs();
        $list = [];
        foreach (glob(self::$backupDir . '/backup-*.zip') as $f) {
            $list[] = [
                'file'       => basename($f),
                'size'       => filesize($f),
                'size_human' => self::formatSize(filesize($f)),
                'created_at' => date('Y-m-d H:i:s', filemtime($f)),
            ];
        }
        usort($list, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
        return $list;
    }

    private static function formatSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $size = (float) $bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        return round($size, 1) . ' ' . $units[$i];
    }

    /**
     * 清理旧的更新缓存
     */
    static function cleanup(): void
    {
        self::dirs();
        foreach (glob(self::$cacheDir . '/update-*.zip') as $f) {
            @unlink($f);
        }
        foreach (glob(self::$cacheDir . '/extract-*') as $d) {
            if (is_dir($d)) self::removeDir($d);
        }
    }
}
