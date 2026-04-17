/**
 * 服务器查询配置
 */
const ServerConfigPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">服务器配置</h2>
                <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </div>
            <div class="card-box" v-loading="loading">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="max-width: 640px;">
                    <el-form-item label="服务器名称" prop="server_name">
                        <el-input v-model="form.server_name" />
                    </el-form-item>
                    <el-form-item label="主机地址" prop="host">
                        <el-input v-model="form.host" placeholder="IP 或域名" />
                    </el-form-item>
                    <el-form-item label="游戏端口" prop="port">
                        <el-input-number v-model="form.port" :min="1" :max="65535" />
                    </el-form-item>
                    <el-form-item label="Query 端口">
                        <el-input-number v-model="form.query_port" :min="1" :max="65535" :controls="true" />
                        <span style="margin-left: 8px; color: var(--text-muted); font-size: 12px;">留空则与游戏端口相同</span>
                    </el-form-item>
                    <el-form-item label="协议类型" prop="protocol">
                        <el-radio-group v-model="form.protocol">
                            <el-radio label="java">Java 版</el-radio>
                            <el-radio label="bedrock">基岩版</el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-form>
            </div>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const loading = ref(false)
        const saving = ref(false)
        const formRef = ref(null)
        const form = reactive({
            id: null,
            server_name: '',
            host: '',
            port: 25565,
            query_port: null,
            protocol: 'java',
        })
        const rules = {
            server_name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            host: [{ required: true, message: '请输入主机', trigger: 'blur' }],
            port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
            protocol: [{ required: true, message: '请选择协议', trigger: 'change' }],
        }

        async function fetchConfig() {
            loading.value = true
            try {
                const res = await AdminApi.get('/server/config')
                const d = res.data || {}
                form.id = d.id
                form.server_name = d.server_name || ''
                form.host = d.host || ''
                form.port = d.port != null ? Number(d.port) : 25565
                form.query_port = d.query_port != null && d.query_port !== '' ? Number(d.query_port) : null
                form.protocol = d.protocol || 'java'
            } finally {
                loading.value = false
            }
        }

        async function save() {
            await formRef.value?.validate?.()
            saving.value = true
            try {
                await AdminApi.put('/server/config', {
                    server_name: form.server_name,
                    host: form.host,
                    port: form.port,
                    query_port: form.query_port,
                    protocol: form.protocol,
                })
                ElementPlus.ElMessage.success('已保存')
                fetchConfig()
            } finally {
                saving.value = false
            }
        }

        onMounted(fetchConfig)
        return { loading, saving, formRef, form, rules, save }
    },
}
