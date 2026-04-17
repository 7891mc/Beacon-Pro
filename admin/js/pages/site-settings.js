/**
 * 系统设置（站点设置 + 计划任务 + 系统更新 + 备份）
 */
const SiteSettingsPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">系统设置</h2>
                <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>站点信息</h3>
                <el-form ref="formRef" :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="站点名称">
                        <el-input v-model="form.site_name" />
                    </el-form-item>
                    <el-form-item label="站点描述">
                        <el-input v-model="form.site_description" type="textarea" rows="2" />
                    </el-form-item>
                    <el-form-item label="关键词">
                        <el-input v-model="form.site_keywords" placeholder="逗号分隔" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="cronLoading">
                <h3>计划任务</h3>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                    <span style="width: 8px; height: 8px; border-radius: 50; display: inline-block;" :style="{ background: cron.is_running ? '#10b981' : '#ef4444', borderRadius: '50%' }"></span>
                    <span style="font-size: 14px; font-weight: 600;">{{ cron.is_running ? '运行中' : '未运行' }}</span>
                    <span v-if="cron.cache_age_seconds != null" style="font-size: 13px; color: var(--text-muted); margin-left: 8px;">{{ formatAge(cron.cache_age_seconds) }}</span>
                </div>
                <el-descriptions :column="1" border size="small" style="max-width: 720px;">
                    <el-descriptions-item label="最后执行时间">{{ cron.last_run || '从未执行' }}</el-descriptions-item>
                    <el-descriptions-item label="最后日志时间">{{ cron.last_log || '无记录' }}</el-descriptions-item>
                    <el-descriptions-item label="今日查询次数">{{ cron.today_logs }}</el-descriptions-item>
                    <el-descriptions-item label="历史总记录数">{{ cron.total_logs }}</el-descriptions-item>
                    <el-descriptions-item label="Shell 命令">
                        <code style="font-size: 12px; background: var(--bg-deep); padding: 4px 10px; border-radius: 6px; user-select: all;">{{ cron.cron_command }}</code>
                    </el-descriptions-item>
                    <el-descriptions-item label="URL 调用">
                        <code style="font-size: 12px; background: var(--bg-deep); padding: 4px 10px; border-radius: 6px; user-select: all;">{{ cron.cron_url }}</code>
                    </el-descriptions-item>
                    <el-descriptions-item label="自动触发">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <el-switch
                                v-model="cronAutoTrigger"
                                :loading="cronAutoTriggerSaving"
                                @change="handleCronAutoTriggerChange"
                            />
                            <span :style="{ color: cronAutoTrigger ? '#10b981' : '#9ca3af', fontSize: '13px', fontWeight: '500' }">
                                {{ cronAutoTrigger ? '已开启' : '已关闭' }}
                            </span>
                            <template v-if="cronAutoTrigger">
                                <span style="font-size: 12px; color: var(--text-muted);">触发间隔</span>
                                <el-input-number
                                    v-model="cronIntervalMinutes"
                                    :min="1"
                                    :max="60"
                                    size="small"
                                    style="width: 90px;"
                                    @change="saveCronInterval"
                                />
                                <span style="font-size: 12px; color: var(--text-muted);">分钟</span>
                                <span v-if="cronIntervalSaving" style="font-size: 11px; color: var(--text-muted);">保存中…</span>
                            </template>
                        </div>
                    </el-descriptions-item>
                </el-descriptions>
                <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted); line-height: 1.8;">
                    <p>
                        <strong style="color: #10b981;">访问自动触发已开启</strong>——有人访问网站首页时自动查询 MC 服务器状态，无需配置宝塔计划任务。
                        可在上方设置触发间隔（分钟），每次触发后距下次查询至少间隔{{ Math.max(1, cronIntervalMinutes) }}分钟。
                    </p>
                    <p style="margin-top: 6px;">
                        也可在宝塔「计划任务」中添加 Shell 脚本，执行周期设为<strong style="color: var(--text-secondary);">每 1 分钟</strong>：
                        <code style="font-size: 11px; background: var(--bg-deep); padding: 2px 6px; border-radius: 4px; user-select: all;">{{ cron.cron_command }}</code>
                    </p>
                </div>
            </div>

            <div class="card-box">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                    <h3 style="margin:0 !important;">系统更新</h3>
                    <el-button :loading="checking" size="small" @click="checkUpdate">
                        <el-icon><Refresh /></el-icon>检查更新
                    </el-button>
                </div>
                <div class="update-version-grid" style="margin-bottom:20px;">
                    <div class="update-version-item">
                        <span class="update-version-label">当前版本</span>
                        <span class="update-version-value">{{ updateInfoBar.current || '...' }}</span>
                    </div>
                    <div class="update-version-item">
                        <span class="update-version-label">PHP 版本</span>
                        <span class="update-version-value">{{ updateInfoBar.php_version || '...' }}</span>
                    </div>
                    <div class="update-version-item" v-if="updateInfoBar.pending_migrations > 0">
                        <span class="update-version-label">待执行迁移</span>
                        <span class="update-version-value" style="color:#d97706;">{{ updateInfoBar.pending_migrations }} 个</span>
                    </div>
                </div>

                <div v-if="updateCheck">
                    <div v-if="updateCheck.has_update" class="update-available">
                        <div class="update-available__header">
                            <div>
                                <div class="update-available__badge">有新版本</div>
                                <h3 style="margin:8px 0 4px;">v{{ updateCheck.latest_version }}</h3>
                                <p style="color:var(--text-muted);font-size:12px;margin:0;">发布于 {{ updateCheck.released_at || '未知' }}</p>
                            </div>
                            <el-button type="primary" :loading="updating" :disabled="updating" @click="confirmUpdate">
                                <el-icon v-if="!updating"><Upload /></el-icon>
                                {{ updating ? updateStatus : '立即更新' }}
                            </el-button>
                        </div>
                        <div v-if="updateCheck.changelog" class="update-changelog">
                            <h3>更新日志</h3>
                            <div class="update-changelog__content" v-html="renderChangelog(updateCheck.changelog)"></div>
                        </div>
                    </div>
                    <div v-else class="update-latest">
                        <el-icon style="font-size:36px;color:var(--text-muted);"><CircleCheck /></el-icon>
                        <div>
                            <p style="font-size:14px;font-weight:600;margin:0 0 2px;">已是最新版本</p>
                            <p style="font-size:12.5px;color:var(--text-muted);margin:0;">当前 v{{ updateCheck.current }}，无需更新</p>
                        </div>
                    </div>
                    <div v-if="updateCheck.error" style="margin-top:12px;">
                        <el-alert :title="updateCheck.error" type="warning" :closable="false" show-icon />
                    </div>
                </div>

                <div v-if="updateResult" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);">
                    <h3>更新结果</h3>
                    <div v-for="(step, i) in updateResult.steps" :key="i" class="update-step">
                        <el-icon v-if="step.status === 'ok'" style="color:#10b981;"><CircleCheck /></el-icon>
                        <el-icon v-else-if="step.status === 'error'" style="color:#ef4444;"><CircleClose /></el-icon>
                        <el-icon v-else><Loading /></el-icon>
                        <span>{{ stepLabel(step.step) }}</span>
                        <span v-if="step.file" style="color:var(--text-muted);font-size:12px;margin-left:8px;">{{ step.file }}</span>
                    </div>
                    <el-alert v-if="updateResult.steps && updateResult.steps.length > 0" title="更新完成，建议刷新页面以加载新版本。" type="success" show-icon style="margin-top:12px;">
                        <el-button size="small" style="margin-top:8px;" @click="reloadPage">刷新页面</el-button>
                    </el-alert>
                </div>
            </div>

            <div class="card-box" v-if="backups.length > 0">
                <h3>版本备份</h3>
                <el-table v-if="!store.isMobile" :data="backups" stripe>
                    <el-table-column prop="file" label="文件名" min-width="200" />
                    <el-table-column prop="size_human" label="大小" width="100" />
                    <el-table-column prop="created_at" label="备份时间" width="170" />
                </el-table>
                <div v-else class="mobile-list">
                    <div v-for="b in backups" :key="b.file" class="mobile-card">
                        <div style="font-size:13px;font-weight:600;word-break:break-all;">{{ b.file }}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">{{ b.size_human }} · {{ b.created_at }}</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const store = AdminStore
        const loading = ref(false)
        const saving = ref(false)
        const formRef = ref(null)
        const form = reactive({
            site_name: '',
            site_description: '',
            site_keywords: '',
        })

        const cronLoading = ref(false)
        const cronIntervalSaving = ref(false)
        const cronIntervalMinutes = ref(1)
        const cron = reactive({
            is_running: false, last_run: null, last_log: null,
            cache_age_seconds: null, total_logs: 0, today_logs: 0,
            cron_command: '', cron_url: '',
        })

        const checking = ref(false)
        const updating = ref(false)
        const updateStatus = ref('')
        const updateInfoBar = reactive({ current: '', php_version: '', pending_migrations: 0 })
        const updateCheck = ref(null)
        const updateResult = ref(null)
        const backups = ref([])

        function formatAge(seconds) {
            if (seconds == null) return ''
            if (seconds < 60) return seconds + ' 秒前执行'
            if (seconds < 3600) return Math.floor(seconds / 60) + ' 分钟前执行'
            if (seconds < 86400) return Math.floor(seconds / 3600) + ' 小时前执行'
            return Math.floor(seconds / 86400) + ' 天前执行'
        }

        async function load() {
            loading.value = true
            try {
                const res = await AdminApi.get('/settings/site')
                const d = res.data || {}
                Object.keys(form).forEach((k) => { if (d[k] !== undefined && d[k] !== null) form[k] = d[k] })
            } finally { loading.value = false }
        }

        const cronAutoTrigger = ref(true)
        const cronAutoTriggerSaving = ref(false)

        async function loadCron() {
            cronLoading.value = true
            try {
                const res = await AdminApi.get('/cron/status')
                Object.assign(cron, res.data || {})
                if (res.data && res.data.cron_interval_minutes != null) {
                    cronIntervalMinutes.value = parseInt(res.data.cron_interval_minutes, 10) || 1
                }
                if (res.data && res.data.cron_auto_trigger != null) {
                    cronAutoTrigger.value = res.data.cron_auto_trigger === '1' || res.data.cron_auto_trigger === true
                }
            } catch (_) {} finally { cronLoading.value = false }
        }

        async function saveCronInterval(val) {
            if (val == null || isNaN(val) || val < 1) {
                cronIntervalMinutes.value = 1
                val = 1
            }
            cronIntervalSaving.value = true
            try {
                await AdminApi.put('/settings/site', { cron_interval_minutes: String(val) })
                ElementPlus.ElMessage.success('触发间隔已保存为 ' + val + ' 分钟')
            } catch (e) {
                ElementPlus.ElMessage.error('保存失败')
            } finally { cronIntervalSaving.value = false }
        }

        async function handleCronAutoTriggerChange(newVal) {
            // el-switch 会先更新 v-model，再触发 change 事件
            // newVal 是切换后的值（布尔值）
            const boolVal = Boolean(newVal)
            cronAutoTriggerSaving.value = true
            try {
                await AdminApi.put('/settings/site', { cron_auto_trigger: boolVal ? '1' : '0' })
                ElementPlus.ElMessage.success(boolVal ? '自动触发已开启' : '自动触发已关闭')
            } catch (e) {
                // 保存失败，回滚 UI 状态
                cronAutoTrigger.value = !boolVal
                ElementPlus.ElMessage.error('保存失败')
            } finally { cronAutoTriggerSaving.value = false }
        }

        async function save() {
            saving.value = true
            try {
                await AdminApi.put('/settings/site', { ...form })
                ElementPlus.ElMessage.success('已保存')
            } finally { saving.value = false }
        }

        async function loadUpdateInfo() {
            try {
                const res = await AdminApi.get('/update/version')
                Object.assign(updateInfoBar, res.data || {})
            } catch (_) {}
        }

        async function loadBackups() {
            try {
                const res = await AdminApi.get('/update/backups')
                backups.value = res.data || []
            } catch (_) {}
        }

        async function checkUpdate() {
            checking.value = true
            updateResult.value = null
            try {
                const res = await AdminApi.get('/update/check')
                updateCheck.value = res.data || {}
            } catch (e) {
                updateCheck.value = { has_update: false, error: '检查失败: ' + (e.message || '未知错误') }
            } finally { checking.value = false }
        }

        async function confirmUpdate() {
            try {
                await ElementPlus.ElMessageBox.confirm('更新将自动备份当前版本，然后下载并安装新版本。确定继续？', '确认更新', { type: 'warning', confirmButtonText: '开始更新', cancelButtonText: '取消' })
            } catch (_) { return }
            updating.value = true
            updateResult.value = null
            updateStatus.value = '更新中...'
            try {
                const res = await AdminApi.post('/update/apply', {})
                updateResult.value = res.data || {}
                updateCheck.value = null
                await loadUpdateInfo()
                await loadBackups()
                ElementPlus.ElMessage.success('更新成功！')
            } catch (e) {
                ElementPlus.ElMessage.error('更新失败: ' + (e.message || '未知错误'))
            } finally { updating.value = false; updateStatus.value = '' }
        }

        function stepLabel(step) {
            return { backup: '备份当前版本', download: '下载更新包', install: '安装更新' }[step] || step
        }

        function renderChangelog(text) {
            if (!text) return ''
            return text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/^### (.+)$/gm, '<h4 style="margin:16px 0 6px;font-size:14px;">$1</h4>')
                .replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 16px;font-size:13px;color:var(--text-secondary);">· $1</div>')
                .replace(/\n/g, '')
        }

        function reloadPage() { location.reload() }

        onMounted(() => {
            if (!AdminStore.isSuperAdmin) {
                ElementPlus.ElMessage.error('无权访问')
                AdminStore.navigate('/dashboard')
                return
            }
            load()
            loadCron()
            loadUpdateInfo()
            loadBackups()
            checkUpdate()
        })

        return {
            store, loading, saving, formRef, form, save,
            cronLoading, cronIntervalSaving, cronIntervalMinutes, cronAutoTrigger, cronAutoTriggerSaving, cron, formatAge,
            saveCronInterval, handleCronAutoTriggerChange,
            checking, updating, updateStatus, updateInfoBar,
            updateCheck, updateResult, backups,
            checkUpdate, confirmUpdate, stepLabel, renderChangelog, reloadPage,
        }
    },
}
