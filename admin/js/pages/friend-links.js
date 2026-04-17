/**
 * 友情链接管理
 */
const FriendLinksPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">友情链接</h2>
            </div>
            <div class="card-box">
                <div :style="store.isMobile ? 'display:flex;flex-direction:column;gap:8px;margin-bottom:20px;' : 'display:flex;gap:8px;margin-bottom:20px;'">
                    <el-input v-model="newForm.name" placeholder="链接名称" :style="store.isMobile ? '' : 'width:160px;'" @keyup.enter="add" />
                    <el-input v-model="newForm.url" placeholder="链接地址 https://..." style="flex:1;" @keyup.enter="add" />
                    <el-input v-if="!store.isMobile" v-model="newForm.description" placeholder="简介（可选）" style="width:180px;" @keyup.enter="add" />
                    <el-button type="primary" :disabled="!newForm.name.trim() || !newForm.url.trim()" @click="add">添加</el-button>
                </div>
                <div v-if="items.length === 0 && !loading" style="text-align:center;color:var(--text-muted);padding:32px 0;font-size:13px;">暂无友情链接</div>
                <div ref="listRef" style="display:flex;flex-direction:column;gap:10px;">
                    <div v-for="(row, idx) in items" :key="row.id" :data-id="row.id" class="cat-sortable-item" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border-radius:10px;border:1px solid var(--border-subtle);">
                        <el-icon v-if="!store.isMobile" class="drag-handle" style="cursor:grab;color:var(--text-muted);font-size:16px;flex-shrink:0;"><Rank /></el-icon>
                        <div style="flex:1;min-width:0;">
                            <div :style="store.isMobile ? 'display:flex;flex-direction:column;gap:6px;margin-bottom:6px;' : 'display:flex;align-items:center;gap:8px;margin-bottom:4px;'">
                                <el-input v-model="row.name" size="small" :style="store.isMobile ? '' : 'width:140px;'" @blur="save(row)" @keyup.enter="$event.target.blur()" />
                                <el-input v-model="row.url" size="small" style="flex:1;" @blur="save(row)" @keyup.enter="$event.target.blur()" />
                            </div>
                            <el-input v-if="!store.isMobile" v-model="row.description" size="small" placeholder="简介（可选）" @blur="save(row)" @keyup.enter="$event.target.blur()" />
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                            <el-switch v-model="row.is_visible" :active-value="1" :inactive-value="0" size="small" @change="save(row)" />
                            <el-button circle size="small" @click="remove(row)">
                                <el-icon><Delete /></el-icon>
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const loading = ref(false)
        const items = ref([])
        const listRef = ref(null)
        const newForm = reactive({ name: '', url: '', description: '' })
        let sortable = null

        async function load() {
            loading.value = true
            try {
                const res = await AdminApi.get('/friend-links')
                items.value = (res.data || []).map(r => ({ ...r, is_visible: Number(r.is_visible) }))
                Vue.nextTick(() => initSortable())
            } finally {
                loading.value = false
            }
        }

        function initSortable() {
            if (sortable) sortable.destroy()
            const el = listRef.value?.$el || listRef.value
            if (!el || typeof Sortable === 'undefined') return
            sortable = Sortable.create(el, {
                handle: '.drag-handle',
                animation: 200,
                ghostClass: 'cat-sortable-ghost',
                onEnd: async (evt) => {
                    if (evt.oldIndex === evt.newIndex) return
                    const moved = items.value.splice(evt.oldIndex, 1)[0]
                    items.value.splice(evt.newIndex, 0, moved)
                    for (let i = 0; i < items.value.length; i++) {
                        const row = items.value[i]
                        if (row.sort_order !== i) {
                            row.sort_order = i
                            await AdminApi.put('/friend-links/' + row.id, { sort_order: i })
                        }
                    }
                    ElementPlus.ElMessage.success('排序已保存')
                },
            })
        }

        async function add() {
            const name = newForm.name.trim()
            const url = newForm.url.trim()
            if (!name || !url) return
            await AdminApi.post('/friend-links', { name, url, description: newForm.description.trim() })
            ElementPlus.ElMessage.success('已添加')
            newForm.name = ''
            newForm.url = ''
            newForm.description = ''
            await load()
        }

        async function save(row) {
            if (!row.name?.trim() || !row.url?.trim()) return
            try {
                await AdminApi.put('/friend-links/' + row.id, {
                    name: row.name.trim(),
                    url: row.url.trim(),
                    description: row.description || '',
                    is_visible: row.is_visible,
                })
            } catch (e) {
                ElementPlus.ElMessage.error('保存失败')
            }
        }

        async function remove(row) {
            await ElementPlus.ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' })
            await AdminApi.delete('/friend-links/' + row.id)
            ElementPlus.ElMessage.success('已删除')
            items.value = items.value.filter(r => r.id !== row.id)
        }

        const store = AdminStore
        onMounted(load)
        return { store, loading, items, listRef, newForm, add, save, remove }
    },
}
