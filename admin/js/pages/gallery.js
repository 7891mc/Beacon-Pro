/**
 * 图集管理
 */
const GalleryPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">图集</h2>
                <el-space>
                    <el-button @click="openCatDialog">分类管理</el-button>
                    <el-button type="primary" @click="openUpload">上传图片</el-button>
                </el-space>
            </div>
            <app-search-bar
                :show-keyword="true"
                :status-options="categoryFilterOptions"
                status-placeholder="分类"
                @search="onSearch"
                @reset="onReset"
            />
            <div class="card-box">
                <el-table v-if="!store.isMobile" v-loading="loading" :data="items" stripe>
                    <el-table-column prop="id" label="ID" width="70" />
                    <el-table-column label="缩略图" width="100">
                        <template #default="{ row }">
                            <el-image
                                v-if="row.thumb_path || row.file_path"
                                :src="imgUrl(row.thumb_path || row.file_path)"
                                style="width: 56px; height: 56px; border-radius: 4px;"
                                fit="cover"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column prop="title" label="标题" min-width="120" />
                    <el-table-column prop="category_name" label="分类" width="120" />
                    <el-table-column prop="sort_order" label="排序" width="80" />
                    <el-table-column prop="created_at" label="创建时间" width="170" />
                    <el-table-column label="操作" width="160" fixed="right">
                        <template #default="{ row }">
                            <el-button type="primary" link @click="editRow(row)">编辑</el-button>
                            <el-button type="danger" link @click="removeImg(row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <div v-else v-loading="loading" class="mobile-list">
                    <div v-for="row in items" :key="row.id" class="mobile-card" style="flex-direction:row;display:flex;gap:12px;align-items:center;">
                        <el-image
                            v-if="row.thumb_path || row.file_path"
                            :src="imgUrl(row.thumb_path || row.file_path)"
                            class="mobile-card__thumb"
                            fit="cover"
                        />
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                                <span class="mobile-card__title" style="margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ row.title || '未命名' }}</span>
                                <div class="mobile-card__actions" style="flex-shrink:0;margin-left:8px;">
                                    <el-button type="primary" link size="small" @click="editRow(row)">编辑</el-button>
                                    <el-button type="danger" link size="small" @click="removeImg(row)">删除</el-button>
                                </div>
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);">{{ row.category_name || '未分类' }} · {{ row.created_at }}</div>
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

            <el-dialog v-model="uploadVisible" title="上传图片" width="520px" @closed="resetUpload">
                <el-form label-width="80px">
                    <el-form-item label="分类">
                        <el-select v-model="uploadForm.category_id" clearable placeholder="未分类" style="width: 100%;">
                            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="标题">
                        <el-input v-model="uploadForm.title" />
                    </el-form-item>
                    <el-form-item label="描述">
                        <el-input v-model="uploadForm.description" type="textarea" rows="2" />
                    </el-form-item>
                    <el-form-item label="图片" required>
                        <app-image-upload v-model="uploadForm.file_path" />
                    </el-form-item>
                    <el-form-item label="排序">
                        <el-input-number v-model="uploadForm.sort_order" :min="0" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="uploadVisible = false">取消</el-button>
                    <el-button type="primary" :loading="uploadSaving" @click="submitUpload">确定</el-button>
                </template>
            </el-dialog>

            <el-dialog v-model="editVisible" title="编辑图片" width="520px">
                <el-form label-width="80px">
                    <el-form-item label="分类">
                        <el-select v-model="editForm.category_id" clearable placeholder="未分类" style="width: 100%;">
                            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="标题">
                        <el-input v-model="editForm.title" />
                    </el-form-item>
                    <el-form-item label="描述">
                        <el-input v-model="editForm.description" type="textarea" rows="2" />
                    </el-form-item>
                    <el-form-item label="排序">
                        <el-input-number v-model="editForm.sort_order" :min="0" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="editVisible = false">取消</el-button>
                    <el-button type="primary" :loading="editSaving" @click="submitEdit">保存</el-button>
                </template>
            </el-dialog>

            <el-dialog v-model="catVisible" title="分类管理" width="480px" @open="onCatDialogOpen">
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
        const { ref, reactive, onMounted, computed } = Vue
        const loading = ref(false)
        const items = ref([])
        const meta = ref({ total: 0, current_page: 1, per_page: 15, last_page: 1 })
        const categories = ref([])
        const query = reactive({ page: 1, per_page: 15, keyword: '', category_id: '' })

        const categoryFilterOptions = computed(() =>
            categories.value.map((c) => ({ label: c.name, value: String(c.id) }))
        )

        const uploadVisible = ref(false)
        const uploadSaving = ref(false)
        const uploadForm = reactive({
            category_id: null,
            title: '',
            description: '',
            file_path: '',
            sort_order: 0,
        })

        const editVisible = ref(false)
        const editSaving = ref(false)
        const editForm = reactive({ id: null, category_id: null, title: '', description: '', sort_order: 0 })

        const catVisible = ref(false)
        const catRows = ref([])

        function imgUrl(p) {
            if (!p) return ''
            return p.startsWith('http') ? p : '/' + p.replace(/^\//, '')
        }

        async function loadCategories() {
            const res = await AdminApi.get('/gallery/categories')
            categories.value = res.data || []
        }

        async function loadList() {
            loading.value = true
            try {
                const params = {
                    page: query.page,
                    per_page: query.per_page,
                    keyword: query.keyword || undefined,
                    category_id: query.category_id || undefined,
                }
                const res = await AdminApi.get('/gallery/images', params)
                items.value = res.data || []
                if (res.meta) meta.value = { ...meta.value, ...res.meta }
            } finally {
                loading.value = false
            }
        }

        function onSearch({ keyword, status }) {
            query.keyword = keyword
            query.category_id = status
            query.page = 1
            loadList()
        }
        function onReset() {
            query.keyword = ''
            query.category_id = ''
            query.page = 1
            loadList()
        }
        function onPageChange({ page, perPage }) {
            query.page = page
            query.per_page = perPage
            loadList()
        }

        function openUpload() {
            resetUpload()
            uploadVisible.value = true
        }
        function resetUpload() {
            uploadForm.category_id = null
            uploadForm.title = ''
            uploadForm.description = ''
            uploadForm.file_path = ''
            uploadForm.sort_order = 0
        }
        async function submitUpload() {
            if (!uploadForm.file_path) {
                ElementPlus.ElMessage.warning('请先上传图片文件')
                return
            }
            uploadSaving.value = true
            try {
                await AdminApi.post('/gallery/images', { ...uploadForm })
                ElementPlus.ElMessage.success('已添加')
                uploadVisible.value = false
                loadList()
                loadCategories()
            } finally {
                uploadSaving.value = false
            }
        }

        function editRow(row) {
            editForm.id = row.id
            editForm.category_id = row.category_id
            editForm.title = row.title || ''
            editForm.description = row.description || ''
            editForm.sort_order = row.sort_order ?? 0
            editVisible.value = true
        }
        async function submitEdit() {
            editSaving.value = true
            try {
                await AdminApi.put('/gallery/images/' + editForm.id, {
                    category_id: editForm.category_id,
                    title: editForm.title,
                    description: editForm.description,
                    sort_order: editForm.sort_order,
                })
                ElementPlus.ElMessage.success('已保存')
                editVisible.value = false
                loadList()
            } finally {
                editSaving.value = false
            }
        }

        async function removeImg(row) {
            await ElementPlus.ElMessageBox.confirm('确定删除该图片？', '提示', { type: 'warning' })
            await AdminApi.delete('/gallery/images/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            loadList()
            loadCategories()
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
                            await AdminApi.put('/gallery/categories/' + row.id, {
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
            await AdminApi.post('/gallery/categories', { name, sort_order: catRows.value.length })
            ElementPlus.ElMessage.success('已添加')
            newCatName.value = ''
            await loadCategories()
            catRows.value = categories.value.map((c) => ({ ...c }))
        }
        async function saveCat(row) {
            if (!row.name || !row.name.trim()) return
            if (!row.id) return
            try {
                await AdminApi.put('/gallery/categories/' + row.id, {
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
            await AdminApi.delete('/gallery/categories/' + row.id)
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
            categoryFilterOptions,
            uploadVisible,
            uploadSaving,
            uploadForm,
            editVisible,
            editSaving,
            editForm,
            catVisible,
            catRows,
            categories,
            imgUrl,
            onSearch,
            onReset,
            onPageChange,
            openUpload,
            resetUpload,
            submitUpload,
            editRow,
            submitEdit,
            removeImg,
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
