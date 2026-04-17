<?php
/**
 * 请求参数获取与校验
 */
class Request
{
    private static ?array $jsonBody = null;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function get(string $key, $default = null)
    {
        return $_GET[$key] ?? $default;
    }

    public static function post(string $key, $default = null)
    {
        $body = self::body();
        return $body[$key] ?? $_POST[$key] ?? $default;
    }

    public static function body(): array
    {
        if (self::$jsonBody === null) {
            $raw = file_get_contents('php://input');
            self::$jsonBody = json_decode($raw, true) ?? [];
        }
        return self::$jsonBody;
    }

    public static function input(string $key, $default = null)
    {
        return self::post($key) ?? self::get($key, $default);
    }

    public static function all(): array
    {
        return array_merge($_GET, $_POST, self::body());
    }

    public static function file(string $key): ?array
    {
        return isset($_FILES[$key]) && $_FILES[$key]['error'] === 0 ? $_FILES[$key] : null;
    }

    public static function ip(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public static function bearerToken(): ?string
    {
        // 优先读标准 Authorization 头（部分 Nginx 配置会透传）
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return trim($m[1]);
        }
        // 备用：自定义 X-Admin-Token 头（绕过 Nginx 拦截 Authorization 的情况）
        $custom = trim($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
        if ($custom !== '') {
            return $custom;
        }
        return null;
    }

    public static function validate(array $rules): array
    {
        $data = [];
        $errors = [];
        $all = self::all();

        foreach ($rules as $field => $rule) {
            $parts = explode('|', $rule);
            $value = $all[$field] ?? null;

            foreach ($parts as $part) {
                if ($part === 'required' && ($value === null || $value === '')) {
                    $errors[$field] = "{$field} 不能为空";
                    break;
                }
                if (str_starts_with($part, 'max:') && $value !== null) {
                    $max = (int) substr($part, 4);
                    if (mb_strlen((string) $value) > $max) {
                        $errors[$field] = "{$field} 不能超过{$max}个字符";
                        break;
                    }
                }
                if ($part === 'email' && $value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = "{$field} 格式不正确";
                    break;
                }
                if ($part === 'integer' && $value !== null && $value !== '') {
                    $value = (int) $value;
                }
                if (str_starts_with($part, 'in:') && $value !== null) {
                    $allowed = explode(',', substr($part, 3));
                    if (!in_array($value, $allowed)) {
                        $errors[$field] = "{$field} 值不合法";
                        break;
                    }
                }
            }
            $data[$field] = $value;
        }

        if (!empty($errors)) {
            Response::error(array_values($errors)[0], 422);
        }

        return $data;
    }

    public static function page(): int
    {
        return max(1, (int) self::get('page', 1));
    }

    public static function perPage(int $default = 15): int
    {
        return min(100, max(1, (int) self::get('per_page', $default)));
    }
}
