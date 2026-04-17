<?php
/**
 * 定时任务脚本
 *
 * 支持两种调用方式：
 * 1. 宝塔计划任务（Shell）：每分钟执行 php /www/wwwroot/minecraft-site/cron.php
 *    - 每分钟查询两次 MC 服务器状态（第0秒 + 第30秒）
 * 2. 按需自动触发（访问首页时）：由 index.php 在 Setting::get('cron_auto_trigger') === '1' 时自动包含
 *    - 每次触发仅查询一次，相邻两次查询间隔由后台「计划任务 → 触发间隔」控制
 *    - 可在后台「系统设置 → 计划任务」中通过开关开启或关闭按需触发
 *
 * 功能：
 * 1. 查询 MC 服务器状态并写入数据库日志
 * 2. 写入缓存文件供 API 读取
 * 3. 清理过期的状态日志和限频缓存
 */

require_once __DIR__ . '/core/helpers.php';

if (!file_exists(__DIR__ . '/config.php')) {
    echo "未安装，请先运行 install.php\n";
    exit(1);
}

load_core();
date_default_timezone_set('Asia/Shanghai');

// 查询并存储
function queryAndStore(): void
{
    $config = DB::fetch("SELECT * FROM server_configs LIMIT 1");
    if (!$config) {
        echo "[" . date('H:i:s') . "] 未配置服务器信息，跳过\n";
        return;
    }

    $status = mc_query($config['host'], (int) $config['port'], $config['protocol']);

    DB::insert('server_status_logs', [
        'online_players' => $status['online_players'],
        'max_players'    => $status['max_players'],
        'player_list'    => json_encode($status['player_list']),
        'version'        => $status['version'],
        'motd'           => $status['motd'],
        'latency_ms'     => $status['latency_ms'],
        'is_online'      => $status['is_online'] ? 1 : 0,
        'recorded_at'    => date('Y-m-d H:i:s'),
    ]);

    // 写缓存文件
    $cacheData = array_merge($status, [
        'server_name' => $config['server_name'],
        'query_time'  => date('Y-m-d H:i:s'),
    ]);
    @file_put_contents(
        ROOT_PATH . '/cache/mc_status.json',
        json_encode($cacheData, JSON_UNESCAPED_UNICODE)
    );

    $onlineText = $status['is_online'] ? '在线' : '离线';
    echo "[" . date('H:i:s') . "] {$onlineText} | 人数: {$status['online_players']}/{$status['max_players']}\n";
}

// 清理过期数据（每天凌晨3点执行一次）
function cleanOldData(): void
{
    $hour = (int) date('H');
    $minute = (int) date('i');

    if ($hour !== 3 || $minute !== 0) return;

    // 清理 7 天前的状态日志
    $cutoff = date('Y-m-d H:i:s', strtotime('-7 days'));
    $deleted = DB::delete('server_status_logs', 'recorded_at < ?', [$cutoff]);
    echo "已清理 {$deleted} 条过期状态日志\n";

    // 清理过期的限频缓存文件
    $cacheDir = ROOT_PATH . '/cache';
    foreach (glob($cacheDir . '/throttle_*.json') as $file) {
        if (filemtime($file) < time() - 3600) {
            @unlink($file);
        }
    }
}

// 执行
$isCli = php_sapi_name() === 'cli';

echo "=== MC 状态查询 " . date('Y-m-d H:i:s') . " ===\n";

queryAndStore();

// Shell 计划任务模式：30 秒后再查一次（更精准）
if ($isCli) {
    sleep(30);
    queryAndStore();
}

cleanOldData();

echo "=== 完成 ===\n";
