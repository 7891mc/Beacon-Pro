<?php
/**
 * 主题商城客户端
 * 负责与 update.candycake.cloud 通讯、下载/安装/更新主题
 */
class ThemeMarket
{
    const MARKET_URL  = 'https://update.candycake.cloud';
    const THEMES_DIR  = ROOT_PATH . '/themes';
    const CACHE_FILE  = ROOT_PATH . '/cache/theme_market.json';
    const CACHE_TTL   = 300; // 5 分钟缓存

    // ===================== Site Token =====================

    /**
     * 获取（或生成）站点唯一 token，用于标识本实例
     */
    public static function siteToken(): string
    {
        $token = Setting::get('site_token', '');
        if ($token) return $token;

        // 首次生成
        $token = bin2hex(random_bytes(24));
        Setting::set('site_token', $token);
        return $token;
    }

    // ===================== Market API =====================

    /**
     * 获取商城主题列表（带本地缓存）
     */
    public static function list(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && is_file(self::CACHE_FILE)) {
            $cached = json_decode(file_get_contents(self::CACHE_FILE), true);
            if ($cached && isset($cached['expires_at']) && time() < $cached['expires_at']) {
                return $cached['data'];
            }
        }

        $installed = self::installedSlugs();
        $token = self::siteToken();
        $url = self::MARKET_URL . '/api/themes/list?installed=' . urlencode(implode(',', $installed))
             . '&site_token=' . urlencode($token);

        $data = self::httpGet($url);
        if (!$data || empty($data['themes'])) {
            // Return cache even if expired on error
            if (is_file(self::CACHE_FILE)) {
                $cached = json_decode(file_get_contents(self::CACHE_FILE), true);
                return $cached['data'] ?? [];
            }
            return [];
        }

        // Annotate with local install info
        $localVersions = self::localVersionMap();
        foreach ($data['themes'] as &$t) {
            $t['is_installed']   = in_array($t['slug'], $installed, true);
            $t['local_version']  = $localVersions[$t['slug']] ?? null;
            $t['has_update']     = $t['is_installed']
                && $t['local_version']
                && version_compare($t['latest_version'], $t['local_version'], '>');
        }
        unset($t);

        @file_put_contents(self::CACHE_FILE, json_encode([
            'expires_at' => time() + self::CACHE_TTL,
            'data'       => $data['themes'],
        ], JSON_UNESCAPED_UNICODE));

        return $data['themes'];
    }

    /**
     * 获取主题评价列表
     */
    public static function reviews(string $slug, int $page = 1): array
    {
        $url = self::MARKET_URL . '/api/themes/' . urlencode($slug) . '/reviews?page=' . $page;
        return self::httpGet($url) ?? [];
    }

    /**
     * 提交评价/评分
     */
    public static function submitReview(string $slug, int $rating, string $content, string $nickname): array
    {
        return self::httpPost(self::MARKET_URL . '/api/themes/' . urlencode($slug) . '/review', [
            'site_token' => self::siteToken(),
            'rating'     => $rating,
            'content'    => $content,
            'nickname'   => $nickname,
        ]) ?? ['error' => '提交失败'];
    }

    /**
     * 提交反馈
     */
    public static function submitFeedback(string $slug, string $type, string $content, string $contact = ''): array
    {
        return self::httpPost(self::MARKET_URL . '/api/themes/' . urlencode($slug) . '/feedback', [
            'site_token' => self::siteToken(),
            'type'       => $type,
            'content'    => $content,
            'contact'    => $contact,
        ]) ?? ['error' => '提交失败'];
    }

    // ===================== Install / Update =====================

    /**
     * 安装或更新主题
     * 返回 ['ok' => true, 'version' => '1.0.0'] 或 ['error' => '...']
     */
    public static function install(string $slug): array
    {
        // 1. 从更新服务器获取下载信息
        $info = self::httpGet(self::MARKET_URL . '/api/themes/' . urlencode($slug) . '/download');
        if (!$info || empty($info['download_url'])) {
            return ['error' => '无法获取下载信息'];
        }

        if (!$info['has_file']) {
            return ['error' => '主题文件尚未上传到更新服务器'];
        }

        $version     = $info['version'] ?? 'unknown';
        $downloadUrl = $info['download_url'];
        $expectedHash = $info['file_hash'] ?? '';

        // 2. 下载 ZIP
        $cacheDir = ROOT_PATH . '/cache/theme_downloads';
        if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
        $tmpFile = $cacheDir . '/theme-' . $slug . '-' . time() . '.zip';

        $ctx = stream_context_create([
            'http' => ['timeout' => 120, 'header' => "User-Agent: Beacon/" . Version::CURRENT . "\r\n"],
            'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);
        $zipData = @file_get_contents($downloadUrl, false, $ctx);
        if ($zipData === false) {
            return ['error' => '下载主题 ZIP 失败'];
        }
        file_put_contents($tmpFile, $zipData);

        // 3. 校验哈希
        if ($expectedHash) {
            if (strpos($expectedHash, ':') !== false) {
                [$algo, $expect] = explode(':', $expectedHash, 2);
            } else {
                $algo = 'sha256';
                $expect = $expectedHash;
            }
            if (hash_file($algo, $tmpFile) !== $expect) {
                @unlink($tmpFile);
                return ['error' => '主题文件校验失败，请重试'];
            }
        }

        // 4. 解压到 themes/
        $themeDir = self::THEMES_DIR . '/' . $slug;
        if (!is_dir($themeDir)) @mkdir($themeDir, 0755, true);

        $zip = new ZipArchive();
        if ($zip->open($tmpFile) !== true) {
            @unlink($tmpFile);
            return ['error' => '无法打开主题 ZIP'];
        }

        // ZIP 内可能有一层同名目录，自动剥离
        $firstEntry = $zip->getNameIndex(0);
        $stripPrefix = '';
        if ($firstEntry && str_ends_with($firstEntry, '/')) {
            $stripPrefix = $firstEntry;
        }

        $extractDir = $cacheDir . '/extract-' . $slug . '-' . time();
        @mkdir($extractDir, 0755, true);
        $zip->extractTo($extractDir);
        $zip->close();
        @unlink($tmpFile);

        $srcDir = $stripPrefix ? ($extractDir . '/' . rtrim($stripPrefix, '/')) : $extractDir;
        if (!is_dir($srcDir)) $srcDir = $extractDir;

        self::copyDir($srcDir, $themeDir);
        self::removeDir($extractDir);

        // 5. 上报安装记录
        self::httpPost(self::MARKET_URL . '/api/themes/' . urlencode($slug) . '/install', [
            'site_token' => self::siteToken(),
            'version'    => $version,
        ]);

        // 6. 清理缓存
        @unlink(self::CACHE_FILE);

        return ['ok' => true, 'version' => $version, 'slug' => $slug];
    }

    // ===================== Uninstall =====================

    /**
     * 卸载主题（删除 themes/{slug}/ 目录）
     * starter 主题禁止卸载
     */
    public static function uninstall(string $slug): array
    {
        if ($slug === 'starter') {
            return ['error' => 'starter 主题不可卸载'];
        }

        // 如果当前主题正在使用，拒绝卸载
        $current = Setting::get('current_theme', 'starter');
        if ($current === $slug) {
            return ['error' => '该主题当前正在使用，请先切换到其他主题再卸载'];
        }

        $themeDir = self::THEMES_DIR . '/' . $slug;
        if (!is_dir($themeDir)) {
            return ['error' => '主题目录不存在'];
        }

        if (!is_writable($themeDir)) {
            return ['error' => '没有删除权限，请检查 themes/ 目录所有者'];
        }

        self::removeDir($themeDir);

        if (is_dir($themeDir)) {
            return ['error' => '删除失败，目录仍然存在，请检查文件权限'];
        }

        @unlink(self::CACHE_FILE);

        return ['ok' => true, 'slug' => $slug];
    }

    // ===================== Local Helpers =====================

    /**
     * 已安装的主题 slug 列表（扫描 themes/ 目录，排除 shared 和 starter）
     */
    public static function installedSlugs(): array
    {
        $slugs = [];
        if (!is_dir(self::THEMES_DIR)) return $slugs;
        foreach (scandir(self::THEMES_DIR) as $dir) {
            if ($dir === '.' || $dir === '..' || $dir === 'shared' || $dir === 'starter') continue;
            $themeJson = self::THEMES_DIR . '/' . $dir . '/theme.json';
            if (is_dir(self::THEMES_DIR . '/' . $dir) && is_file($themeJson)) {
                $slugs[] = $dir;
            }
        }
        return $slugs;
    }

    /**
     * slug => version 映射（从 theme.json 读取）
     */
    public static function localVersionMap(): array
    {
        $map = [];
        foreach (self::installedSlugs() as $slug) {
            $themeJson = self::THEMES_DIR . '/' . $slug . '/theme.json';
            $meta = json_decode(file_get_contents($themeJson), true);
            $map[$slug] = $meta['version'] ?? '0.0.0';
        }
        return $map;
    }

    // ===================== HTTP Helpers =====================

    private static function httpGet(string $url): ?array
    {
        $ctx = stream_context_create([
            'http' => ['timeout' => 10, 'header' => "User-Agent: Beacon/" . Version::CURRENT . "\r\n"],
            'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) return null;
        return json_decode($body, true) ?: null;
    }

    private static function httpPost(string $url, array $data): ?array
    {
        $payload = json_encode($data, JSON_UNESCAPED_UNICODE);
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'timeout' => 10,
                'header'  => "Content-Type: application/json\r\nUser-Agent: Beacon/" . Version::CURRENT . "\r\n",
                'content' => $payload,
            ],
            'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) return null;
        return json_decode($body, true) ?: null;
    }

    // ===================== File Helpers =====================

    private static function copyDir(string $src, string $dst): void
    {
        if (!is_dir($dst)) @mkdir($dst, 0755, true);
        foreach (scandir($src) as $item) {
            if ($item === '.' || $item === '..') continue;
            $s = $src . '/' . $item;
            $d = $dst . '/' . $item;
            is_dir($s) ? self::copyDir($s, $d) : @copy($s, $d);
        }
    }

    private static function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . '/' . $item;
            is_dir($path) ? self::removeDir($path) : @unlink($path);
        }
        @rmdir($dir);
    }
}
