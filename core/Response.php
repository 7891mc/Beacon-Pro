<?php
/**
 * 统一 JSON 响应
 */
class Response
{
    public static function json($data = null, string $message = 'ok', int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'code'    => $code,
            'message' => $message,
            'data'    => $data,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = null, string $message = 'ok'): void
    {
        self::json($data, $message, 200);
    }

    public static function error(string $message = 'error', int $code = 400, $data = null): void
    {
        self::json($data, $message, $code);
    }

    public static function paginate(array $pageData): void
    {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'code'    => 200,
            'message' => 'ok',
            'data'    => $pageData['items'],
            'meta'    => [
                'current_page' => $pageData['current_page'],
                'last_page'    => $pageData['last_page'],
                'per_page'     => $pageData['per_page'],
                'total'        => $pageData['total'],
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
