/**
 * 动态列表 + 分类管理
 */
const PostsPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">动态</h2>
                <el-space>
                    <el-button @click="openCatDialog">分类管理</el-button>
                    <el-button type="primary" @click="goNew">新建动态</el-button>
                </el-space>
            </div>
            <app-search-bar
                :show-keyword="true"
                :status-options="statusOptions"
                status-placeholder="发布状态"
                @search="onSearch"
                @reset="onReset"
            />
            <div class="filter-bar" style="margin-top: -8px;">
                <el-select v-model="query.category_id" clearable placeholder="动态分类" style="width: 160px;" @change="onCatChange">
                    <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
            </div>
            <div class="card-box">
                <el-table v-if="!store.isMobile" v-loading="loading" :data="items" stripe>
                    <el-table-column prop="id" label="ID" width="70" />
                    <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
                    <el-table-column label="分类" width="100">
                        <template #default="{ row }">{{ row.category_name || row.category?.name || '—' }}</template>
                    </el-table-column>
                    <el-table-column label="状态" width="100">
                        <template #default="{ row }">
                            <app-status-tag type="post" :status="row.status" />
                        </template>
                    </el-table-column>
                    <el-table-column label="置顶" width="70">
                        <template #default="{ row }">{{ row.is_pinned ? '是' : '否' }}</template>
                    </el-table-column>
                    <el-table-column prop="published_at" label="发布时间" width="170" />
                    <el-table-column label="操作" width="140" fixed="right">
                        <template #default="{ row }">
                            <el-button type="primary" link @click="goEdit(row)">编辑</el-button>
                            <el-button type="danger" link @click="removePost(row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <div v-else v-loading="loading" class="mobile-list">
                    <div v-for="row in items" :key="row.id" class="mobile-card">
                        <div class="mobile-card__header">
                            <div class="mobile-card__header-left">
                                <span class="mobile-card__id">#{{ row.id }}</span>
                                <app-status-tag type="post" :status="row.status" />
                                <el-tag v-if="row.is_pinned" size="small" type="warning" style="border:none;">置顶</el-tag>
                            </div>
                            <div class="mobile-card__actions">
                                <el-button type="primary" link size="small" @click="goEdit(row)">编辑</el-button>
                                <el-button type="danger" link size="small" @click="removePost(row)">删除</el-button>
                            </div>
                        </div>
                        <div class="mobile-card__title">{{ row.title }}</div>
                        <div class="mobile-card__footer">
                            <span class="mobile-card__time">{{ row.category_name || row.category?.name || '未分类' }} · {{ row.published_at || '未发布' }}</span>
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

            <el-dialog v-model="catVisible" title="动态分类管理" width="480px" @open="onCatDialogOpen">
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <el-input v-model="newCatName" placeholder="输入分类名称" @keyup.enter="addCat" />
                    <el-button type="primary" :disabled="!newCatName.trim()" @click="addCat">添加</el-button>
                </div>
                <div v-if="catRows.length === 0" style="text-align:center;color:var(--text-muted);padding:24px 0;font-size:13px;">暂无分类</div>
                <div ref="catListRef" style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
                    <div v-for="(row, idx) in catRows" :key="row.id || idx" :data-id="row.id" class="cat-sortable-item" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-surface);border-radius:10px;border:1px solid var(--border-subtle);transition:box-shadow 0.2s;">
                        <el-icon class="drag-handle" style="cursor:grab;color:var(--text-muted);font-size:16px;flex-shrink:0;"><Rank /></el-icon>
                        <el-input v-model="row.name" size="small" style="flex:1;" @blur="saveCat(row)" @keyup.enter="$event.target.blur()" />
                        <el-button circle size="small" @click="delCat(row)" style="flex-shrink:0;">
                            <el-icon><Delete /></el-icon>
                        </el-button>
                    </div>
                </div>
                <template #footer>
                    <el-button @click="catVisible = false">关闭</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const loading = ref(false)
        const items = ref([])
        const meta = ref({ total: 0, current_page: 1, per_page: 15, last_page: 1 })
        const categories = ref([])
        const query = reactive({
            page: 1,
            per_page: 15,
            keyword: '',
            status: '',
            category_id: '',
        })
        const statusOptions = [
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
        ]

        const catVisible = ref(false)
        const catRows = ref([])

        async function loadCategories() {
            const res = await AdminApi.get('/posts/categories')
            categories.value = res.data || []
        }

        async function loadList() {
            loading.value = true
            try {
                const res = await AdminApi.get('/posts', {
                    page: query.page,
                    per_page: query.per_page,
                    keyword: query.keyword || undefined,
                    status: query.status || undefined,
                    category_id: query.category_id || undefined,
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
            query.category_id = ''
            query.page = 1
            loadList()
        }
        function onCatChange() {
            query.page = 1
            loadList()
        }
        function onPageChange({ page, perPage }) {
            query.page = page
            query.per_page = perPage
            loadList()
        }

        function goNew() {
            AdminStore.navigate('/posts/edit')
        }
        function goEdit(row) {
            location.hash = '#/posts/edit?id=' + row.id
            AdminStore.currentRoute = '/posts/edit'
        }

        async function removePost(row) {
            await ElementPlus.ElMessageBox.confirm('确定删除该动态？', '提示', { type: 'warning' })
            await AdminApi.delete('/posts/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            loadList()
        }

        async function openCatDialog() {
            catVisible.value = true
            await loadCategories()
            catRows.value = categories.value.map((c) => ({ ...c }))
        }
        const newCatName = ref('')
        const catListRef = ref(null)
        let catSortable = null

        async function onCatDialogOpen() {
            await loadCategories()
            catRows.value = categories.value.map((c) => ({ ...c }))
            Vue.nextTick(() => initCatSortable())
        }

        function initCatSortable() {
            if (catSortable) catSortable.destroy()
            const el = catListRef.value?.$el || catListRef.value
            if (!el || typeof Sortable === 'undefined') return
            catSortable = Sortable.create(el, {
                handle: '.drag-handle',
                animation: 200,
                ghostClass: 'cat-sortable-ghost',
                onEnd: async (evt) => {
                    if (evt.oldIndex === evt.newIndex) return
                    const moved = catRows.value.splice(evt.oldIndex, 1)[0]
                    catRows.value.splice(evt.newIndex, 0, moved)
                    for (let i = 0; i < catRows.value.length; i++) {
                        const row = catRows.value[i]
                        if (row.id && row.sort_order !== i) {
                            row.sort_order = i
                            await AdminApi.put('/posts/categories/' + row.id, {
                                name: row.name.trim(),
                                sort_order: i,
                            })
                        }
                    }
                    await loadCategories()
                    ElementPlus.ElMessage.success('排序已保存')
                },
            })
        }

        async function addCat() {
            const name = newCatName.value.trim()
            if (!name) return
            await AdminApi.post('/posts/categories', { name, sort_order: catRows.value.length })
            ElementPlus.ElMessage.success('已添加')
            newCatName.value = ''
            await loadCategories()
            catRows.value = categories.value.map((c) => ({ ...c }))
        }
        async function saveCat(row) {
            if (!row.name || !row.name.trim()) return
            if (!row.id) return
            try {
                await AdminApi.put('/posts/categories/' + row.id, {
                    name: row.name.trim(),
                    sort_order: row.sort_order ?? 0,
                })
                await loadCategories()
            } catch (e) {
                ElementPlus.ElMessage.error('保存失败')
            }
        }
        async function delCat(row) {
            if (!row.id) {
                catRows.value = catRows.value.filter((r) => r !== row)
                return
            }
            await ElementPlus.ElMessageBox.confirm(`确定删除分类「${row.name}」？`, '提示', { type: 'warning' })
            await AdminApi.delete('/posts/categories/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            catRows.value = catRows.value.filter((r) => r.id !== row.id)
            await loadCategories()
        }

        onMounted(() => {
            loadCategories()
            loadList()
        })

        const store = AdminStore
        return {
            store,
            loading,
            items,
            meta,
            query,
            categories,
            statusOptions,
            catVisible,
            catRows,
            onSearch,
            onReset,
            onCatChange,
            onPageChange,
            goNew,
            goEdit,
            removePost,
            openCatDialog,
            loadCategories,
            newCatName,
            catListRef,
            onCatDialogOpen,
            addCat,
            saveCat,
            delCat,
        }
    },
}
