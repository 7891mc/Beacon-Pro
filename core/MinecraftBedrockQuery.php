<?php
/**
 * Minecraft 基岩版服务器查询（Unconnected Ping 协议）
 */
class MinecraftBedrockQuery
{
    public static function query(string $host, int $port, int $timeout = 5): array
    {
        $default = [
            'is_online'      => false,
            'online_players' => 0,
            'max_players'    => 0,
            'player_list'    => [],
            'version'        => '',
            'motd'           => '',
            'latency_ms'     => null,
        ];

        try {
            $startTime = microtime(true);
            $socket = @fsockopen('udp://' . $host, $port, $errno, $errstr, $timeout);
            if (!$socket) return $default;

            stream_set_timeout($socket, $timeout);

            $packet = "\x01";
            $packet .= pack('J', intval(microtime(true) * 1000));
            $packet .= "\x00\xff\xff\x00\xfe\xfe\xfe\xfe\xfd\xfd\xfd\xfd\x12\x34\x56\x78";
            $packet .= pack('J', 0);

            fwrite($socket, $packet);
            $response = fread($socket, 4096);
            $latency = round((microtime(true) - $startTime) * 1000);
            fclose($socket);

            if (!$response || strlen($response) < 35) return $default;

            $serverInfo = substr($response, 35);
            $parts = explode(';', $serverInfo);
            if (count($parts) < 6) return $default;

            return [
                'is_online'      => true,
                'online_players' => (int) ($parts[4] ?? 0),
                'max_players'    => (int) ($parts[5] ?? 0),
                'player_list'    => [],
                'version'        => $parts[3] ?? '',
                'motd'           => $parts[1] ?? '',
                'latency_ms'     => (int) $latency,
            ];
        } catch (Throwable $e) {
            return $default;
        }
    }
}
