/**
 * 仪表盘
 */
const DashboardPage = {
    template: `
        <div class="page-container">
            <div v-if="hasUpdate" class="dash-update-banner" @click="go('/update')">
                <div class="dash-update-banner__text">
                    <el-icon><Upload /></el-icon>
                    <span>Beacon v{{ latestVersion }} 已发布，点击前往更新</span>
                </div>
                <el-icon><ArrowRight /></el-icon>
            </div>
            <div class="dash-welcome">
                <div class="dash-welcome__content">
                    <div class="dash-welcome__text">
                        <h2 class="dash-welcome__title">{{ greeting }}，{{ store.user?.nickname || store.user?.username || '管理员' }}</h2>
                        <p class="dash-welcome__sub">{{ todayText }}｜服务器当前 <strong>{{ stats.server_online ? '运行中' : '已离线' }}</strong></p>
                    </div>
                    <div class="dash-welcome__actions">
                        <el-button type="primary" @click="go('/posts/edit')"><el-icon><EditPen /></el-icon>发布动态</el-button>
                        <el-button type="primary" @click="go('/comments')"><el-icon><ChatDotRound /></el-icon>审核留言</el-button>
                    </div>
                </div>
                <div class="dash-welcome__indicator" :class="stats.server_online ? 'online' : 'offline'">
                    <span class="dash-welcome__dot"></span>
                </div>
            </div>

            <div class="dash-stats" v-loading="loading">
                <div class="dash-stat-card">
                    <div class="dash-stat-card__icon"><el-icon><User /></el-icon></div>
                    <div class="dash-stat-card__body">
                        <div class="dash-stat-card__value">{{ stats.online_players }}<span class="dash-stat-card__unit"> / {{ stats.max_players }}</span></div>
                        <div class="dash-stat-card__label">当前在线</div>
                    </div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-card__icon"><el-icon><TrendCharts /></el-icon></div>
                    <div class="dash-stat-card__body">
                        <div class="dash-stat-card__value">{{ stats.peak_today }}</div>
                        <div class="dash-stat-card__label">今日峰值</div>
                    </div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-card__icon"><el-icon><Document /></el-icon></div>
                    <div class="dash-stat-card__body">
                        <div class="dash-stat-card__value">{{ stats.posts_total }}</div>
                        <div class="dash-stat-card__label">动态总数</div>
                    </div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-card__icon"><el-icon><Bell /></el-icon></div>
                    <div class="dash-stat-card__body">
                        <div class="dash-stat-card__value">{{ pendingTotal }}</div>
                        <div class="dash-stat-card__label">待处理</div>
                    </div>
                </div>
            </div>

            <div class="dash-grid">
                <div class="card-box dash-grid__main">
                    <h3>24 小时在线趋势</h3>
                    <div ref="chartRef" style="height: 320px;"></div>
                </div>
                <div class="dash-grid__side">
                    <div class="card-box">
                        <h3>待处理事项</h3>
                        <div class="dash-pending-item" @click="go('/comments')">
                            <span>待审核留言</span>
                            <span class="dash-pending-badge" :class="{ active: stats.pending_comments > 0 }">{{ stats.pending_comments }}</span>
                        </div>
                        <div class="dash-pending-item" @click="go('/whitelist')">
                            <span>待审核白名单</span>
                            <span class="dash-pending-badge" :class="{ active: stats.pending_whitelist > 0 }">{{ stats.pending_whitelist }}</span>
                        </div>
                    </div>
                    <div class="card-box">
                        <h3>快捷操作</h3>
                        <div class="dash-shortcuts">
                            <div class="dash-shortcut" @click="go('/posts/edit')">
                                <el-icon><EditPen /></el-icon><span>发布动态</span>
                            </div>
                            <div class="dash-shortcut" @click="go('/gallery')">
                                <el-icon><Picture /></el-icon><span>图集管理</span>
                            </div>
                            <div class="dash-shortcut" @click="go('/server')">
                                <el-icon><Cpu /></el-icon><span>服务器</span>
                            </div>
                            <div class="dash-shortcut" @click="go('/settings/site')">
                                <el-icon><Setting /></el-icon><span>站点设置</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, onMounted, onBeforeUnmount } = Vue
        const loading = ref(true)
        const hasUpdate = ref(false)
        const latestVersion = ref('')
        const stats = ref({
            server_online: false,
            online_players: 0,
            max_players: 0,
            peak_today: 0,
            posts_total: 0,
            pending_comments: 0,
            pending_whitelist: 0,
        })
        const chartRef = ref(null)
        let chart = null

        async function load() {
            loading.value = true
            try {
                const res = await AdminApi.get('/dashboard/stats')
                Object.assign(stats.value, res.data || {})
                const chartRes = await AdminApi.get('/dashboard/chart')
                const series = chartRes.data || []
                Vue.nextTick(() => renderChart(series))
            } catch (e) {
                console.error('[Dashboard] load() 失败:', e?.response?.status, e?.message)
            } finally {
                loading.value = false
            }
        }

        function renderChart(series) {
            if (!chartRef.value || !window.echarts) return
            if (!chart) {
                chart = echarts.init(chartRef.value)
            }
            const times = series.map((x) => x.time)
            const avg = series.map((x) => x.avg_players)
            const max = series.map((x) => x.max_players)
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: ['平均在线', '峰值在线'], textStyle: { color: '#999' } },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: { type: 'category', boundaryGap: false, data: times, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }, axisLabel: { color: '#999' } },
                yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { color: '#999' } },
                series: [
                    { name: '平均在线', type: 'line', smooth: true, data: avg, itemStyle: { color: '#111' }, lineStyle: { width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,0,0,0.06)' }, { offset: 1, color: 'transparent' }] } } },
                    { name: '峰值在线', type: 'line', smooth: true, data: max, itemStyle: { color: '#bbb' }, lineStyle: { width: 1.5, type: 'dashed' } },
                ],
            })
        }

        function go(path) {
            AdminStore.navigate(path)
        }

        async function checkUpdate() {
            if (!AdminStore.isSuperAdmin) return
            try {
                const res = await AdminApi.get('/update/check')
                if (res.data?.has_update) {
                    hasUpdate.value = true
                    latestVersion.value = res.data.latest_version
                }
            } catch (_) {}
        }

        onMounted(() => {
            load()
            checkUpdate()
            window.addEventListener('resize', onResize)
        })
        onBeforeUnmount(() => {
            window.removeEventListener('resize', onResize)
            chart?.dispose()
            chart = null
        })
        function onResize() {
            chart?.resize()
        }

        const store = AdminStore
        const hour = new Date().getHours()
        const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
        const days = ['日', '一', '二', '三', '四', '五', '六']
        const now = new Date()
        const todayText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`
        const pendingTotal = Vue.computed(() => (stats.value.pending_comments || 0) + (stats.value.pending_whitelist || 0))

        return { loading, stats, chartRef, go, store, greeting, todayText, pendingTotal, hasUpdate, latestVersion }
    },
}
