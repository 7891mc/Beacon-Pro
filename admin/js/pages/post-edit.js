/**
 * 新建 / 编辑动态
 */
const PostEditPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">{{ isEdit ? '编辑动态' : '新建动态' }}</h2>
                <el-space>
                    <el-button @click="back">返回列表</el-button>
                    <el-button type="primary" :loading="saving" @click="save">保存</el-button>
                </el-space>
            </div>
            <div class="card-box" v-loading="loading">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 900px;">
                    <el-form-item label="标题" prop="title">
                        <el-input v-model="form.title" maxlength="200" show-word-limit />
                    </el-form-item>
                    <el-form-item label="分类">
                        <el-select v-model="form.category_id" clearable placeholder="未分类" style="width: 240px;">
                            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="封面图">
                        <app-image-upload v-model="form.cover_image" />
                    </el-form-item>
                    <el-form-item label="状态" prop="status">
                        <el-radio-group v-model="form.status">
                            <el-radio label="draft">草稿</el-radio>
                            <el-radio label="published">发布</el-radio>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="置顶">
                        <el-switch v-model="form.is_pinned" />
                    </el-form-item>
                    <el-form-item label="正文" prop="content">
                        <app-rich-editor v-model="form.content" />
                    </el-form-item>
                </el-form>
            </div>
        </div>
    `,
    setup() {
        const { ref, reactive, computed, onMounted } = Vue

        function getQueryId() {
            const h = location.hash.slice(1) || ''
            const q = h.includes('?') ? h.split('?')[1] : ''
            const params = new URLSearchParams(q)
            const id = params.get('id')
            return id && /^\d+$/.test(id) ? id : null
        }

        const loading = ref(false)
        const saving = ref(false)
        const formRef = ref(null)
        const categories = ref([])
        const editId = ref(null)

        const isEdit = computed(() => !!editId.value)

        const form = reactive({
            title: '',
            category_id: null,
            cover_image: '',
            status: 'published',
            is_pinned: false,
            content: '',
        })

        const rules = {
            title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
            content: [{ required: true, message: '请输入正文', trigger: 'blur' }],
            status: [{ required: true, message: '请选择状态', trigger: 'change' }],
        }

        async function loadCategories() {
            const res = await AdminApi.get('/posts/categories')
            categories.value = res.data || []
        }

        async function loadPost(id) {
            loading.value = true
            try {
                const res = await AdminApi.get('/posts/' + id)
                const d = res.data || {}
                form.title = d.title || ''
                form.category_id = d.category_id
                form.cover_image = d.cover_image || ''
                form.status = d.status || 'published'
                form.is_pinned = !!d.is_pinned
                form.content = d.content || ''
            } finally {
                loading.value = false
            }
        }

        function syncRouteId() {
            editId.value = getQueryId()
            if (editId.value) {
                loadPost(editId.value)
            } else {
                form.title = ''
                form.category_id = null
                form.cover_image = ''
                form.status = 'published'
                form.is_pinned = false
                form.content = ''
            }
        }

        function back() {
            AdminStore.navigate('/posts')
        }

        async function save() {
            await formRef.value?.validate?.()
            saving.value = true
            try {
                const payload = {
                    title: form.title.trim(),
                    category_id: form.category_id,
                    cover_image: form.cover_image || null,
                    status: form.status,
                    is_pinned: form.is_pinned ? 1 : 0,
                    content: form.content,
                }
                if (editId.value) {
                    await AdminApi.put('/posts/' + editId.value, payload)
                    ElementPlus.ElMessage.success('已保存')
                } else {
                    const res = await AdminApi.post('/posts', payload)
                    ElementPlus.ElMessage.success('已创建')
                    const nid = res.data?.id
                    if (nid) {
                        location.hash = '#/posts/edit?id=' + nid
                        editId.value = String(nid)
                    } else {
                        AdminStore.navigate('/posts')
                    }
                }
            } finally {
                saving.value = false
            }
        }

        onMounted(async () => {
            await loadCategories()
            syncRouteId()
            window.addEventListener('hashchange', syncRouteId)
        })

        Vue.onBeforeUnmount(() => {
            window.removeEventListener('hashchange', syncRouteId)
        })

        return {
            loading,
            saving,
            formRef,
            form,
            rules,
            categories,
            isEdit,
            back,
            save,
        }
    },
}
