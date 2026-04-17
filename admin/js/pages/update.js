/**
 * 系统更新
 */
const UpdatePage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">系统更新</h2>
                <el-button :loading="checking" @click="checkUpdate">
                    <el-icon><Refresh /></el-icon>检查更新
                </el-button>
            </div>

            <div class="card-box">
                <h3>版本信息</h3>
                <div class="update-version-grid">
                    <div class="update-version-item">
                        <span class="update-version-label">当前版本</span>
                        <span class="update-version-value">{{ info.current || '...' }}</span>
                    </div>
                    <div class="update-version-item">
                        <span class="update-version-label">PHP 版本</span>
                        <span class="update-version-value">{{ info.php_version || '...' }}</span>
                    </div>
                    <div class="update-version-item" v-if="info.pending_migrations > 0">
                        <span class="update-version-label">待执行迁移</span>
                        <span class="update-version-value" style="color:#d97706;">{{ info.pending_migrations }} 个</span>
                    </div>
                </div>
            </div>

            <div v-if="updateInfo" class="card-box">
                <div v-if="updateInfo.has_update" class="update-available">
                    <div class="update-available__header">
                        <div>
                            <div class="update-available__badge">有新版本</div>
                            <h3 style="margin:8px 0 4px;">v{{ updateInfo.latest_version }}</h3>
                            <p style="color:var(--text-muted);font-size:12px;margin:0;">
                                发布于 {{ updateInfo.released_at || '未知' }}
                            </p>
                        </div>
                        <el-button type="primary" size="large" :loading="updating" :disabled="updating" @click="confirmUpdate">
                            <el-icon v-if="!updating"><Upload /></el-icon>
                            {{ updating ? updateStatus : '立即更新' }}
                        </el-button>
                    </div>
                    <div v-if="updateInfo.changelog" class="update-changelog">
                        <h3>更新日志</h3>
                        <div class="update-changelog__content" v-html="renderChangelog(updateInfo.changelog)"></div>
                    </div>
                </div>
                <div v-else class="update-latest">
                    <el-icon style="font-size:40px;color:var(--text-muted);"><CircleCheck /></el-icon>
                    <div>
                        <p style="font-size:15px;font-weight:600;margin:0 0 4px;">已是最新版本</p>
                        <p style="font-size:13px;color:var(--text-muted);margin:0;">当前 v{{ updateInfo.current }}，无需更新</p>
                    </div>
                </div>
                <div v-if="updateInfo.error" style="margin-top:12px;">
                    <el-alert :title="updateInfo.error" type="warning" :closable="false" show-icon />
                </div>
            </div>

            <div v-if="updateResult" class="card-box">
                <h3>更新结果</h3>
                <div v-for="(step, i) in updateResult.steps" :key="i" class="update-step">
                    <el-icon v-if="step.status === 'ok'" style="color:#10b981;"><CircleCheck /></el-icon>
                    <el-icon v-else-if="step.status === 'error'" style="color:#ef4444;"><CircleClose /></el-icon>
                    <el-icon v-else><Loading /></el-icon>
                    <span>{{ stepLabel(step.step) }}</span>
                    <span v-if="step.file" style="color:var(--text-muted);font-size:12px;margin-left:8px;">{{ step.file }}</span>
                </div>
                <div v-if="updateResult.steps && updateResult.steps.length > 0" style="margin-top:16px;">
                    <el-alert title="更新完成，建议刷新页面以加载新版本。" type="success" show-icon>
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
        const checking = ref(false)
        const updating = ref(false)
        const updateStatus = ref('')
        const info = reactive({ current: '', php_version: '', pending_migrations: 0 })
        const updateInfo = ref(null)
        const updateResult = ref(null)
        const backups = ref([])

        async function loadInfo() {
            try {
                const res = await AdminApi.get('/update/version')
                Object.assign(info, res.data || {})
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
                updateInfo.value = res.data || {}
            } catch (e) {
                updateInfo.value = { has_update: false, error: '检查失败: ' + (e.message || '未知错误') }
            } finally {
                checking.value = false
            }
        }

        async function confirmUpdate() {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    '更新将自动备份当前版本，然后下载并安装新版本。确定继续？',
                    '确认更新',
                    { type: 'warning', confirmButtonText: '开始更新', cancelButtonText: '取消' }
                )
            } catch (_) { return }

            updating.value = true
            updateResult.value = null
            updateStatus.value = '备份中...'
            try {
                updateStatus.value = '更新中...'
                const res = await AdminApi.post('/update/apply', {})
                updateResult.value = res.data || {}
                updateInfo.value = null
                await loadInfo()
                await loadBackups()
                ElementPlus.ElMessage.success('更新成功！')
            } catch (e) {
                ElementPlus.ElMessage.error('更新失败: ' + (e.message || '未知错误'))
            } finally {
                updating.value = false
                updateStatus.value = ''
            }
        }

        function stepLabel(step) {
            const labels = { backup: '备份当前版本', download: '下载更新包', install: '安装更新' }
            return labels[step] || step
        }

        function renderChangelog(text) {
            if (!text) return ''
            return text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/^### (.+)$/gm, '<h4 style="margin:16px 0 6px;font-size:14px;">$1</h4>')
                .replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 16px;font-size:13px;color:var(--text-secondary);">· $1</div>')
                .replace(/\n/g, '')
        }

        function reloadPage() {
            location.reload()
        }

        onMounted(() => {
            if (!AdminStore.isSuperAdmin) {
                ElementPlus.ElMessage.error('无权访问')
                AdminStore.navigate('/dashboard')
                return
            }
            loadInfo()
            loadBackups()
            checkUpdate()
        })

        return {
            store, checking, updating, updateStatus, info,
            updateInfo, updateResult, backups,
            checkUpdate, confirmUpdate, stepLabel, renderChangelog, reloadPage,
        }
    },
}
