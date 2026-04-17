/**
 * 功能开关
 */
const FeatureTogglePage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">功能开关</h2>
                <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </div>
            <div class="card-box" v-loading="loading">
                <el-table v-if="!store.isMobile" :data="items" stripe>
                    <el-table-column prop="feature" label="标识" width="140" />
                    <el-table-column prop="label" label="名称" min-width="160" />
                    <el-table-column label="启用" width="120">
                        <template #default="{ row }">
                            <el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" />
                        </template>
                    </el-table-column>
                </el-table>
                <div v-else class="mobile-list">
                    <div v-for="row in items" :key="row.feature" class="mobile-card" style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:13.5px;font-weight:600;color:var(--text-primary);">{{ row.label }}</div>
                            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">{{ row.feature }}</div>
                        </div>
                        <el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" />
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, onMounted } = Vue
        const loading = ref(false)
        const saving = ref(false)
        const items = ref([])

        async function load() {
            loading.value = true
            try {
                const res = await AdminApi.get('/settings/features')
                items.value = (res.data || []).map((r) => ({
                    ...r,
                    is_enabled: Number(r.is_enabled) ? 1 : 0,
                }))
            } finally {
                loading.value = false
            }
        }

        async function save() {
            saving.value = true
            try {
                await AdminApi.put('/settings/features', {
                    toggles: items.value.map((r) => ({
                        feature: r.feature,
                        is_enabled: r.is_enabled ? 1 : 0,
                    })),
                })
                ElementPlus.ElMessage.success('已保存')
            } finally {
                saving.value = false
            }
        }

        onMounted(() => {
            if (!AdminStore.isSuperAdmin) {
                ElementPlus.ElMessage.error('无权访问')
                AdminStore.navigate('/dashboard')
                return
            }
            load()
        })
        const store = AdminStore
        return { store, loading, saving, items, save }
    },
}
