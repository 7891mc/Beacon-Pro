/**
 * 留言管理
 */
const CommentsPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">留言</h2>
            </div>
            <app-search-bar
                :status-options="statusOptions"
                status-placeholder="审核状态"
                :show-keyword="true"
                @search="onSearch"
                @reset="onReset"
            />
            <div class="card-box">
                <el-table v-if="!store.isMobile" v-loading="loading" :data="items" stripe>
                    <el-table-column prop="id" label="ID" width="70" />
                    <el-table-column prop="nickname" label="昵称" width="120" />
                    <el-table-column prop="email" label="邮箱" width="160" show-overflow-tooltip />
                    <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
                    <el-table-column label="状态" width="100">
                        <template #default="{ row }">
                            <app-status-tag type="comment" :status="row.status" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="admin_reply" label="回复" min-width="120" show-overflow-tooltip />
                    <el-table-column prop="created_at" label="时间" width="170" />
                    <el-table-column label="操作" width="90" fixed="right" align="center">
                        <template #default="{ row }">
                            <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                <el-button link>更多<el-icon style="margin-left: 4px;"><ArrowDown /></el-icon></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="approve" :disabled="row.status !== 'pending'"><el-icon><Select /></el-icon>通过</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="row.status !== 'pending'"><el-icon><CloseBold /></el-icon>拒绝</el-dropdown-item>
                                        <el-dropdown-item command="reply"><el-icon><ChatDotRound /></el-icon>回复</el-dropdown-item>
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
                                <span style="font-weight:600;font-size:13.5px;">{{ row.nickname }}</span>
                                <app-status-tag type="comment" :status="row.status" />
                            </div>
                            <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                <el-button circle size="small"><el-icon><MoreFilled /></el-icon></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="approve" :disabled="row.status !== 'pending'"><el-icon><Select /></el-icon>通过</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="row.status !== 'pending'"><el-icon><CloseBold /></el-icon>拒绝</el-dropdown-item>
                                        <el-dropdown-item command="reply"><el-icon><ChatDotRound /></el-icon>回复</el-dropdown-item>
                                        <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                        <div style="font-size:13px;color:var(--text-primary);line-height:1.5;margin-bottom:4px;">{{ row.content }}</div>
                        <div v-if="row.admin_reply" style="font-size:12px;color:var(--text-secondary);background:var(--bg-surface);padding:8px 10px;border-radius:6px;margin-bottom:4px;line-height:1.4;">
                            <span style="color:var(--text-muted);font-weight:500;">回复:</span> {{ row.admin_reply }}
                        </div>
                        <div class="mobile-card__footer">
                            <span class="mobile-card__time">{{ row.email || '' }}</span>
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
            <el-dialog v-model="replyVisible" title="管理员回复" width="480px" @closed="replyText = ''">
                <el-input v-model="replyText" type="textarea" rows="4" placeholder="回复内容" />
                <template #footer>
                    <el-button @click="replyVisible = false">取消</el-button>
                    <el-button type="primary" :loading="replyLoading" @click="submitReply">保存</el-button>
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

        const replyVisible = ref(false)
        const replyLoading = ref(false)
        const replyText = ref('')
        const replyTarget = ref(null)

        async function loadList() {
            loading.value = true
            try {
                const res = await AdminApi.get('/comments', {
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

        async function approve(row) {
            await AdminApi.put('/comments/' + row.id + '/approve', {})
            ElementPlus.ElMessage.success('已通过')
            loadList()
        }
        async function reject(row) {
            await AdminApi.put('/comments/' + row.id + '/reject', {})
            ElementPlus.ElMessage.success('已拒绝')
            loadList()
        }
        function openReply(row) {
            replyTarget.value = row
            replyText.value = row.admin_reply || ''
            replyVisible.value = true
        }
        async function submitReply() {
            if (!replyTarget.value) return
            replyLoading.value = true
            try {
                await AdminApi.put('/comments/' + replyTarget.value.id + '/reply', {
                    admin_reply: replyText.value,
                })
                ElementPlus.ElMessage.success('已保存回复')
                replyVisible.value = false
                loadList()
            } finally {
                replyLoading.value = false
            }
        }
        async function remove(row) {
            await ElementPlus.ElMessageBox.confirm('确定删除该留言？', '提示', { type: 'warning' })
            await AdminApi.delete('/comments/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            loadList()
        }

        function onAction(cmd, row) {
            if (cmd === 'approve') approve(row)
            else if (cmd === 'reject') reject(row)
            else if (cmd === 'reply') openReply(row)
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
            replyVisible,
            replyLoading,
            replyText,
            onSearch,
            onReset,
            onPageChange,
            approve,
            reject,
            openReply,
            submitReply,
            remove,
            onAction,
        }
    },
}
