/**
 * 登录页
 */
const LoginPage = {
    emits: ['login-success'],
    template: `
        <div class="login-wrap">
            <div class="login-card">
                <div class="login-brand">
                    <svg class="login-brand__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L8 6v4l-4 4v6h16v-6l-4-4V6l-4-4z" fill="currentColor" opacity="0.1"/>
                        <path d="M12 2L8 6v4l-4 4v6h16v-6l-4-4V6l-4-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                        <path d="M12 2v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <rect x="10" y="12" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.4"/>
                    </svg>
                    <h1>Beacon</h1>
                </div>
                <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
                    <el-form-item label="用户名" prop="username">
                        <el-input v-model="form.username" autocomplete="username" />
                    </el-form-item>
                    <el-form-item label="密码" prop="password">
                        <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
                    </el-form-item>
                    <el-button type="primary" style="width: 100%;" :loading="loading" @click="submit">登录</el-button>
                </el-form>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const { ref, reactive } = Vue
        const formRef = ref(null)
        const loading = ref(false)
        const form = reactive({ username: '', password: '' })
        const rules = {
            username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
            password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
        }
        async function submit() {
            await formRef.value?.validate?.()
            loading.value = true
            try {
                const res = await AdminApi.post('/auth/login', {
                    username: form.username.trim(),
                    password: form.password,
                })
                const token = res.data?.token
                const user = res.data?.user
                if (!token || !user) {
                    ElementPlus.ElMessage.error('登录响应异常')
                    return
                }
                AdminStore.setAuth(token, user)
                emit('login-success')
            } catch (e) {
                const msg = e.response?.data?.message || e.message || '登录失败'
                if (e.response?.status === 401) {
                    ElementPlus.ElMessage.error(msg)
                }
            } finally {
                loading.value = false
            }
        }
        return { formRef, loading, form, rules, submit }
    },
}
