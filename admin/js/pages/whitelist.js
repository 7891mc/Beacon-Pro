/**
 * 白名单申请管理
 */
const WhitelistPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">白名单</h2>
            </div>
            <app-search-bar
                :show-keyword="true"
                :status-options="statusOptions"
                status-placeholder="状态"
                @search="onSearch"
                @reset="onReset"
            />
            <div class="card-box">
                <el-table v-if="!store.isMobile" v-loading="loading" :data="items" stripe>
                    <el-table-column prop="id" label="ID" width="70" />
                    <el-table-column prop="player_name" label="游戏 ID" width="140" />
                    <el-table-column label="平台" width="100">
                        <template #default="{ row }">{{ row.platform === 'bedrock' ? '基岩' : 'Java' }}</template>
                    </el-table-column>
                    <el-table-column prop="contact" label="联系方式" width="140" show-overflow-tooltip />
                    <el-table-column prop="reason" label="申请理由" min-width="160" show-overflow-tooltip />
                    <el-table-column label="状态" width="100">
                        <template #default="{ row }">
                            <app-status-tag type="whitelist" :status="row.status" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="admin_note" label="备注" width="120" show-overflow-tooltip />
                    <el-table-column prop="created_at" label="申请时间" width="170" />
                    <el-table-column label="操作" width="90" fixed="right" align="center">
                        <template #default="{ row }">
                            <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                <el-button link>更多<el-icon style="margin-left: 4px;"><ArrowDown /></el-icon></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="approve" :disabled="row.status !== 'pending'"><el-icon><Select /></el-icon>通过</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="row.status !== 'pending'"><el-icon><CloseBold /></el-icon>拒绝</el-dropdown-item>
                                        <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </template>
                    </el-table-column>
                </el-table>
                <div v-else v-loading="loading" class="mobile-list">
                    <div v-for="row in items" :key="row.id" class="mobile-card">
                        <div class="mobile-card__header">
                            <div class="mobile-card__header-left">
                                <span class="mobile-card__id">#{{ row.id }}</span>
                                <span style="font-weight:600;font-size:13.5px;">{{ row.player_name }}</span>
                                <app-status-tag type="whitelist" :status="row.status" />
                            </div>
                            <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                <el-button circle size="small"><el-icon><MoreFilled /></el-icon></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="approve" :disabled="row.status !== 'pending'"><el-icon><Select /></el-icon>通过</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="row.status !== 'pending'"><el-icon><CloseBold /></el-icon>拒绝</el-dropdown-item>
                                        <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                        <div class="mobile-card__body">
                            <div class="mobile-card__row">
                                <span class="mobile-card__label">平台</span>
                                <span class="mobile-card__value">{{ row.platform === 'bedrock' ? '基岩版' : 'Java 版' }}</span>
                            </div>
                            <div v-if="row.contact" class="mobile-card__row">
                                <span class="mobile-card__label">联系方式</span>
                                <span class="mobile-card__value mobile-card__value--secondary">{{ row.contact }}</span>
                            </div>
                            <div v-if="row.reason" class="mobile-card__row">
                                <span class="mobile-card__label">理由</span>
                                <span class="mobile-card__value mobile-card__value--secondary">{{ row.reason }}</span>
                            </div>
                            <div v-if="row.admin_note" class="mobile-card__row">
                                <span class="mobile-card__label">备注</span>
                                <span class="mobile-card__value mobile-card__value--secondary">{{ row.admin_note }}</span>
                            </div>
                        </div>
                        <div class="mobile-card__footer">
                            <span class="mobile-card__time">{{ row.created_at }}</span>
                        </div>
                    </div>
                    <div v-if="!loading && items.length === 0" style="text-align:center;padding:32px 0;color:var(--text-muted);font-size:13px;">暂无数据</div>
                </div>
                <app-pagination
                    :total="meta.total"
                    :page="query.page"
                    :per-page="query.per_page"
                    @change="onPageChange"
                />
            </div>
            <el-dialog v-model="noteVisible" :title="noteAction === 'approve' ? '通过申请' : '拒绝申请'" width="420px">
                <el-input v-model="noteForm.admin_note" type="textarea" rows="3" placeholder="管理员备注（可选）" />
                <template #footer>
                    <el-button @click="noteVisible = false">取消</el-button>
                    <el-button type="primary" :loading="noteLoading" @click="submitNote">确定</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const loading = ref(false)
        const items = ref([])
        const meta = ref({ total: 0, current_page: 1, per_page: 15, last_page: 1 })
        const query = reactive({ page: 1, per_page: 15, keyword: '', status: '' })
        const statusOptions = [
            { label: '待审核', value: 'pending' },
            { label: '已通过', value: 'approved' },
            { label: '已拒绝', value: 'rejected' },
        ]

        const noteVisible = ref(false)
        const noteLoading = ref(false)
        const noteAction = ref('approve')
        const noteTarget = ref(null)
        const noteForm = reactive({ admin_note: '' })

        async function loadList() {
            loading.value = true
            try {
                const res = await AdminApi.get('/whitelist', {
                    page: query.page,
                    per_page: query.per_page,
                    keyword: query.keyword || undefined,
                    status: query.status || undefined,
                })
                items.value = res.data || []
                if (res.meta) meta.value = { ...meta.value, ...res.meta }
            } finally {
                loading.value = false
            }
        }

        function onSearch({ keyword, status }) {
            query.keyword = keyword
            query.status = status
            query.page = 1
            loadList()
        }
        function onReset() {
            query.keyword = ''
            query.status = ''
            query.page = 1
            loadList()
        }
        function onPageChange({ page, perPage }) {
            query.page = page
            query.per_page = perPage
            loadList()
        }

        function approve(row) {
            noteAction.value = 'approve'
            noteTarget.value = row
            noteForm.admin_note = ''
            noteVisible.value = true
        }
        function reject(row) {
            noteAction.value = 'reject'
            noteTarget.value = row
            noteForm.admin_note = ''
            noteVisible.value = true
        }
        async function submitNote() {
            if (!noteTarget.value) return
            noteLoading.value = true
            try {
                const suffix = noteAction.value === 'approve' ? 'approve' : 'reject'
                await AdminApi.put('/whitelist/' + noteTarget.value.id + '/' + suffix, {
                    admin_note: noteForm.admin_note,
                })
                ElementPlus.ElMessage.success(noteAction.value === 'approve' ? '已通过' : '已拒绝')
                noteVisible.value = false
                loadList()
            } finally {
                noteLoading.value = false
            }
        }
        async function remove(row) {
            await ElementPlus.ElMessageBox.confirm('确定删除该记录？', '提示', { type: 'warning' })
            await AdminApi.delete('/whitelist/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            loadList()
        }

        function onAction(cmd, row) {
            if (cmd === 'approve') approve(row)
            else if (cmd === 'reject') reject(row)
            else if (cmd === 'delete') remove(row)
        }

        const store = AdminStore
        onMounted(loadList)
        return {
            store,
            loading,
            items,
            meta,
            query,
            statusOptions,
            noteVisible,
            noteLoading,
            noteAction,
            noteForm,
            onSearch,
            onReset,
            onPageChange,
            approve,
            reject,
            submitNote,
            remove,
            onAction,
        }
    },
}
