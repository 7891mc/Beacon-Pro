<?php
/**
 * Minecraft Java 版服务器查询（Server List Ping 协议）
 */
class MinecraftQuery
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
            $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
            if (!$socket) return $default;

            stream_set_timeout($socket, $timeout);

            $handshake = self::packVarInt(0);
            $handshake .= self::packVarInt(-1);
            $handshake .= self::packVarInt(strlen($host)) . $host;
            $handshake .= pack('n', $port);
            $handshake .= self::packVarInt(1);
            fwrite($socket, self::packVarInt(strlen($handshake)) . $handshake);

            fwrite($socket, pack('c', 1) . pack('c', 0));

            $length = self::readVarInt($socket);
            if ($length < 1) { fclose($socket); return $default; }

            self::readVarInt($socket);
            $jsonLength = self::readVarInt($socket);

            $jsonData = '';
            $remaining = $jsonLength;
            while ($remaining > 0) {
                $chunk = fread($socket, min($remaining, 8192));
                if ($chunk === false) break;
                $jsonData .= $chunk;
                $remaining -= strlen($chunk);
            }

            $latency = round((microtime(true) - $startTime) * 1000);
            fclose($socket);

            $data = json_decode($jsonData, true);
            if (!$data) return $default;

            $motd = '';
            if (isset($data['description'])) {
                $motd = is_string($data['description']) ? $data['description'] : ($data['description']['text'] ?? '');
            }

            $playerList = [];
            if (isset($data['players']['sample'])) {
                foreach ($data['players']['sample'] as $p) {
                    $playerList[] = $p['name'] ?? '';
                }
            }

            return [
                'is_online'      => true,
                'online_players' => $data['players']['online'] ?? 0,
                'max_players'    => $data['players']['max'] ?? 0,
                'player_list'    => $playerList,
                'version'        => $data['version']['name'] ?? '',
                'motd'           => $motd,
                'latency_ms'     => (int) $latency,
            ];
        } catch (Throwable $e) {
            return $default;
        }
    }

    private static function readVarInt($socket): int
    {
        $numRead = 0; $result = 0;
        do {
            $byte = fread($socket, 1);
            if ($byte === false || strlen($byte) === 0) return 0;
            $byte = ord($byte);
            $result |= ($byte & 0x7F) << (7 * $numRead);
            $numRead++;
            if ($numRead > 5) return 0;
        } while (($byte & 0x80) !== 0);
        return $result;
    }

    private static function packVarInt(int $value): string
    {
        $value &= 0xFFFFFFFF;
        $result = '';
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            if ($value !== 0) $byte |= 0x80;
            $result .= chr($byte);
        } while ($value !== 0);
        return $result;
    }
}
