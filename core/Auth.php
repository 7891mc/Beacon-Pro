<?php
/**
 * Token 认证
 */
class Auth
{
    private static ?array $currentUser = null;

    public static function attempt(string $username, string $password): ?array
    {
        $user = DB::fetch("SELECT * FROM users WHERE username=? AND status=1", [$username]);

        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }

        $token = bin2hex(random_bytes(32));
        DB::update('users', [
            'api_token'     => hash('sha256', $token),
            'last_login_at' => date('Y-m-d H:i:s'),
        ], 'id=?', [$user['id']]);

        unset($user['password'], $user['api_token']);
        $user['token'] = $token;

        return $user;
    }

    public static function check(): ?array
    {
        if (self::$currentUser !== null) {
            return self::$currentUser;
        }

        $token = Request::bearerToken();
        if (!$token) return null;

        $user = DB::fetch(
            "SELECT * FROM users WHERE api_token=? AND status=1",
            [hash('sha256', $token)]
        );

        if (!$user) return null;

        unset($user['password'], $user['api_token']);
        self::$currentUser = $user;

        return $user;
    }

    public static function requireLogin(): array
    {
        $user = self::check();
        if (!$user) {
            Response::error('未登录，请先登录', 401);
        }
        return $user;
    }

    public static function requireSuperAdmin(): array
    {
        $user = self::requireLogin();
        if ($user['role'] !== 'super_admin') {
            Response::error('权限不足，仅超级管理员可操作', 403);
        }
        return $user;
    }

    public static function user(): ?array
    {
        return self::$currentUser;
    }

    public static function logout(): void
    {
        $user = self::check();
        if ($user) {
            DB::update('users', ['api_token' => null], 'id=?', [$user['id']]);
        }
    }
}
