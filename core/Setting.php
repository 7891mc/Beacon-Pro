<?php
/**
 * 站点设置 + 功能开关（带文件缓存）
 */
class Setting
{
    private static ?array $settings = null;
    private static ?array $features = null;
    private static string $cacheFile = '';
    private static string $featureCacheFile = '';

    private static function init(): void
    {
        self::$cacheFile = ROOT_PATH . '/cache/settings.json';
        self::$featureCacheFile = ROOT_PATH . '/cache/features.json';
    }

    public static function get(string $key, $default = null)
    {
        $all = self::allSettings();
        return $all[$key] ?? $default;
    }

    public static function allSettings(): array
    {
        if (self::$settings !== null) return self::$settings;

        self::init();

        if (file_exists(self::$cacheFile) && (time() - filemtime(self::$cacheFile)) < 3600) {
            self::$settings = json_decode(file_get_contents(self::$cacheFile), true) ?? [];
            return self::$settings;
        }

        try {
            $rows = DB::fetchAll("SELECT `key`, `value` FROM site_settings");
            self::$settings = [];
            foreach ($rows as $row) {
                self::$settings[$row['key']] = $row['value'];
            }
            @file_put_contents(self::$cacheFile, json_encode(self::$settings, JSON_UNESCAPED_UNICODE));
        } catch (Throwable $e) {
            self::$settings = [];
        }

        return self::$settings;
    }

    public static function isFeatureEnabled(string $feature): bool
    {
        $all = self::allFeatures();
        return !empty($all[$feature]);
    }

    public static function allFeatures(): array
    {
        if (self::$features !== null) return self::$features;

        self::init();

        if (file_exists(self::$featureCacheFile) && (time() - filemtime(self::$featureCacheFile)) < 3600) {
            self::$features = json_decode(file_get_contents(self::$featureCacheFile), true) ?? [];
            return self::$features;
        }

        try {
            $rows = DB::fetchAll("SELECT feature, is_enabled FROM feature_toggles");
            self::$features = [];
            foreach ($rows as $row) {
                self::$features[$row['feature']] = (int) $row['is_enabled'];
            }
            @file_put_contents(self::$featureCacheFile, json_encode(self::$features));
        } catch (Throwable $e) {
            self::$features = [];
        }

        return self::$features;
    }

    public static function flush(): void
    {
        self::init();
        self::$settings = null;
        self::$features = null;
        @unlink(self::$cacheFile);
        @unlink(self::$featureCacheFile);
    }

    public static function set(string $key, ?string $value): void
    {
        $exists = DB::fetch("SELECT id FROM site_settings WHERE `key`=?", [$key]);
        if ($exists) {
            DB::update('site_settings', ['value' => $value, 'updated_at' => date('Y-m-d H:i:s')], '`key`=?', [$key]);
        } else {
            DB::insert('site_settings', ['key' => $key, 'value' => $value, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);
        }
        self::flush();
    }
}
