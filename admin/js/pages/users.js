/**
 * 用户管理（仅超级管理员）
 */
const UsersPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">用户</h2>
                <el-button type="primary" @click="openCreate">新增用户</el-button>
            </div>
            <app-search-bar
                :show-keyword="true"
                :status-options="statusOptions"
                status-placeholder="账号状态"
                @search="onSearch"
                @reset="onReset"
            />
            <div class="card-box">
                <el-table v-if="!store.isMobile" v-loading="loading" :data="items" stripe>
                    <el-table-column prop="id" label="ID" width="70" />
                    <el-table-column prop="username" label="用户名" width="140" />
                    <el-table-column prop="nickname" label="昵称" width="120" />
                    <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
                    <el-table-column label="角色" width="120">
                        <template #default="{ row }">
                            {{ row.role === 'super_admin' ? '超级管理员' : '内容管理员' }}
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" width="90">
                        <template #default="{ row }">
                            <app-status-tag type="user" :status="row.status" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="last_login_at" label="最后登录" width="170" />
                    <el-table-column label="操作" width="90" fixed="right" align="center">
                        <template #default="{ row }">
                            <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                <el-button link>更多<el-icon style="margin-left: 4px;"><ArrowDown /></el-icon></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="edit"><el-icon><Edit /></el-icon>编辑</el-dropdown-item>
                                        <el-dropdown-item command="resetPwd"><el-icon><Key /></el-icon>重置密码</el-dropdown-item>
                                        <el-dropdown-item :command="row.status == 1 ? 'disable' : 'enable'"><el-icon><component :is="row.status == 1 ? 'Lock' : 'Unlock'" /></el-icon>{{ row.status == 1 ? '禁用' : '启用' }}</el-dropdown-item>
                                        <el-dropdown-item command="delete" :disabled="row.id === store.user?.id" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
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
                                <span class="mobile-card__title" style="margin-bottom:0;">{{ row.nickname || row.username }}</span>
                            </div>
                            <div class="mobile-card__actions">
                                <app-status-tag type="user" :status="row.status" />
                                <el-dropdown trigger="click" @command="(cmd) => onAction(cmd, row)">
                                    <el-button circle size="small"><el-icon><MoreFilled /></el-icon></el-button>
                                    <template #dropdown>
                                        <el-dropdown-menu>
                                            <el-dropdown-item command="edit"><el-icon><Edit /></el-icon>编辑</el-dropdown-item>
                                            <el-dropdown-item command="resetPwd"><el-icon><Key /></el-icon>重置密码</el-dropdown-item>
                                            <el-dropdown-item :command="row.status == 1 ? 'disable' : 'enable'"><el-icon><component :is="row.status == 1 ? 'Lock' : 'Unlock'" /></el-icon>{{ row.status == 1 ? '禁用' : '启用' }}</el-dropdown-item>
                                            <el-dropdown-item command="delete" :disabled="row.id === store.user?.id" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                                        </el-dropdown-menu>
                                    </template>
                                </el-dropdown>
                            </div>
                        </div>
                        <div class="mobile-card__body">
                            <div class="mobile-card__row">
                                <span class="mobile-card__label">用户名</span>
                                <span class="mobile-card__value">{{ row.username }}</span>
                            </div>
                            <div v-if="row.email" class="mobile-card__row">
                                <span class="mobile-card__label">邮箱</span>
                                <span class="mobile-card__value mobile-card__value--secondary">{{ row.email }}</span>
                            </div>
                            <div class="mobile-card__row">
                                <span class="mobile-card__label">角色</span>
                                <span class="mobile-card__value mobile-card__value--secondary">{{ row.role === 'super_admin' ? '超级管理员' : '内容管理员' }}</span>
                            </div>
                        </div>
                        <div v-if="row.last_login_at" class="mobile-card__footer">
                            <span class="mobile-card__time">最后登录: {{ row.last_login_at }}</span>
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
            <el-dialog v-model="dialogVisible" :title="editId ? '编辑用户' : '新增用户'" width="480px" @closed="resetForm">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
                    <el-form-item label="用户名" prop="username">
                        <el-input v-model="form.username" :disabled="!!editId" autocomplete="off" />
                    </el-form-item>
                    <el-form-item :label="editId ? '新密码' : '密码'" prop="password">
                        <el-input v-model="form.password" type="password" show-password :placeholder="editId ? '留空则不修改' : ''" autocomplete="new-password" />
                    </el-form-item>
                    <el-form-item label="昵称" prop="nickname">
                        <el-input v-model="form.nickname" />
                    </el-form-item>
                    <el-form-item label="邮箱">
                        <el-input v-model="form.email" />
                    </el-form-item>
                    <el-form-item label="角色" prop="role">
                        <el-select v-model="form.role" style="width: 100%;">
                            <el-option label="超级管理员" value="super_admin" />
                            <el-option label="内容管理员" value="content_admin" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="状态" prop="status">
                        <el-radio-group v-model="form.status">
                            <el-radio :label="1">正常</el-radio>
                            <el-radio :label="0">禁用</el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const store = AdminStore
        const loading = ref(false)
        const items = ref([])
        const meta = ref({ total: 0, current_page: 1, per_page: 15, last_page: 1 })
        const query = reactive({ page: 1, per_page: 15, keyword: '', status: '' })
        const statusOptions = [
            { label: '正常', value: '1' },
            { label: '禁用', value: '0' },
        ]

        const dialogVisible = ref(false)
        const saving = ref(false)
        const editId = ref(null)
        const formRef = ref(null)
        const form = reactive({
            username: '',
            password: '',
            nickname: '',
            email: '',
            role: 'content_admin',
            status: 1,
        })

        const rules = {
            username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
            password: [
                {
                    validator: (_r, v, cb) => {
                        const s = v ? String(v) : ''
                        if (!editId.value) {
                            if (s.length < 6) cb(new Error('密码至少 6 位'))
                            else cb()
                        } else {
                            if (s !== '' && s.length < 6) cb(new Error('密码至少 6 位'))
                            else cb()
                        }
                    },
                    trigger: 'blur',
                },
            ],
            nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
            role: [{ required: true, message: '请选择角色', trigger: 'change' }],
            status: [{ required: true, message: '请选择状态', trigger: 'change' }],
        }

        async function loadList() {
            loading.value = true
            try {
                const res = await AdminApi.get('/users', {
                    page: query.page,
                    per_page: query.per_page,
                    keyword: query.keyword || undefined,
                    status: query.status !== '' && query.status !== undefined ? query.status : undefined,
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

        function resetForm() {
            editId.value = null
            form.username = ''
            form.password = ''
            form.nickname = ''
            form.email = ''
            form.role = 'content_admin'
            form.status = 1
            formRef.value?.resetFields?.()
        }
        function openCreate() {
            resetForm()
            dialogVisible.value = true
        }
        function openEdit(row) {
            editId.value = row.id
            form.username = row.username
            form.password = ''
            form.nickname = row.nickname || ''
            form.email = row.email || ''
            form.role = row.role
            form.status = Number(row.status)
            dialogVisible.value = true
        }
        async function submit() {
            await formRef.value?.validate?.()
            saving.value = true
            try {
                if (editId.value) {
                    const payload = {
                        nickname: form.nickname,
                        email: form.email || null,
                        role: form.role,
                        status: form.status,
                    }
                    if (form.password) payload.password = form.password
                    await AdminApi.put('/users/' + editId.value, payload)
                    ElementPlus.ElMessage.success('已保存')
                } else {
                    await AdminApi.post('/users', {
                        username: form.username.trim(),
                        password: form.password,
                        nickname: form.nickname.trim(),
                        email: form.email || null,
                        role: form.role,
                        status: form.status,
                    })
                    ElementPlus.ElMessage.success('已创建')
                }
                dialogVisible.value = false
                loadList()
            } finally {
                saving.value = false
            }
        }
        async function remove(row) {
            await ElementPlus.ElMessageBox.confirm('确定删除该用户？', '提示', { type: 'warning' })
            await AdminApi.delete('/users/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            loadList()
        }

        async function resetPwd(row) {
            const { value } = await ElementPlus.ElMessageBox.prompt('请输入新密码（至少 6 位）', '重置密码', {
                inputType: 'password',
                inputValidator: (v) => (v && v.length >= 6) || '密码至少 6 位',
                confirmButtonText: '确定',
                cancelButtonText: '取消',
            })
            await AdminApi.put('/users/' + row.id, { password: value })
            ElementPlus.ElMessage.success('密码已重置')
        }

        async function toggleStatus(row) {
            const newStatus = row.status == 1 ? 0 : 1
            const label = newStatus === 0 ? '禁用' : '启用'
            await ElementPlus.ElMessageBox.confirm(`确定${label}该用户？`, '提示', { type: 'warning' })
            await AdminApi.put('/users/' + row.id, { status: newStatus, nickname: row.nickname || row.username, role: row.role })
            ElementPlus.ElMessage.success(`已${label}`)
            loadList()
        }

        function onAction(cmd, row) {
            if (cmd === 'edit') openEdit(row)
            else if (cmd === 'resetPwd') resetPwd(row)
            else if (cmd === 'disable' || cmd === 'enable') toggleStatus(row)
            else if (cmd === 'delete') remove(row)
        }

        onMounted(() => {
            if (!AdminStore.isSuperAdmin) {
                ElementPlus.ElMessage.error('无权访问')
                AdminStore.navigate('/dashboard')
                return
            }
            loadList()
        })
        return {
            store,
            loading,
            items,
            meta,
            query,
            statusOptions,
            dialogVisible,
            saving,
            editId,
            formRef,
            form,
            rules,
            onSearch,
            onReset,
            onPageChange,
            openCreate,
            openEdit,
            submit,
            remove,
            resetPwd,
            toggleStatus,
            onAction,
        }
    },
}
