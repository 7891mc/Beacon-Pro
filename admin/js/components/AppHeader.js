/**
 * 顶栏：折叠、用户菜单
 */
const AppHeader = {
    template: `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; height: 100%; padding: 0 8px 0 16px;">
            <el-button v-if="store.isMobile" :icon="Operation" circle text @click="store.toggleMobileMenu()" />
            <el-button v-else :icon="store.sidebarCollapsed ? Expand : Fold" circle text @click="store.sidebarCollapsed = !store.sidebarCollapsed" />
            <div v-if="store.isMobile" class="header-brand" @click="store.navigate('/dashboard')" style="cursor:pointer;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L8 6v4l-4 4v6h16v-6l-4-4V6l-4-4z" fill="currentColor" opacity="0.12"/>
                    <path d="M12 2L8 6v4l-4 4v6h16v-6l-4-4V6l-4-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    <path d="M12 2v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <rect x="10" y="12" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5"/>
                </svg>
                <span>Beacon</span>
            </div>
            <div class="header-right">
                <el-button v-if="!store.isMobile" text @click="goFrontend" style="color: var(--text-secondary); font-size: 13px;">
                    <el-icon style="margin-right: 4px;"><Monitor /></el-icon>访问前台
                </el-button>
                <span v-if="!store.isMobile" style="color: var(--border-light);">|</span>
                <span v-if="!store.isMobile" style="color: var(--text-secondary); font-size: 13px; font-weight: 500;">{{ store.user?.nickname || store.user?.username || '管理员' }}</span>
                <el-dropdown trigger="click" @command="onCommand">
                    <el-button circle>
                        <el-icon><User /></el-icon>
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item v-if="store.isMobile" command="frontend">
                                <el-icon><Monitor /></el-icon>访问前台
                            </el-dropdown-item>
                            <el-dropdown-item command="password"><el-icon><Lock /></el-icon>修改密码</el-dropdown-item>
                            <el-dropdown-item command="logout" divided><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
            <el-dialog v-model="pwdVisible" title="修改密码" :width="store.isMobile ? '90%' : '400px'" @closed="resetPwdForm">
                <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
                    <el-form-item label="当前密码" prop="old_password">
                        <el-input v-model="pwdForm.old_password" type="password" show-password autocomplete="off" />
                    </el-form-item>
                    <el-form-item label="新密码" prop="new_password">
                        <el-input v-model="pwdForm.new_password" type="password" show-password autocomplete="off" />
                    </el-form-item>
                    <el-form-item label="确认新密码" prop="new_password2">
                        <el-input v-model="pwdForm.new_password2" type="password" show-password autocomplete="off" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="pwdVisible = false">取消</el-button>
                    <el-button type="primary" :loading="pwdLoading" @click="submitPwd">保存</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, reactive } = Vue
        const store = AdminStore
        const Fold = ElementPlusIconsVue.Fold
        const Expand = ElementPlusIconsVue.Expand
        const Monitor = ElementPlusIconsVue.Monitor
        const Operation = ElementPlusIconsVue.Operation
        const pwdVisible = ref(false)
        const pwdLoading = ref(false)
        const pwdFormRef = ref(null)
        const pwdForm = reactive({
            old_password: '',
            new_password: '',
            new_password2: '',
        })
        const pwdRules = {
            old_password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
            new_password: [
                { required: true, message: '请输入新密码', trigger: 'blur' },
                { min: 6, message: '至少 6 位', trigger: 'blur' },
            ],
            new_password2: [
                { required: true, message: '请再次输入新密码', trigger: 'blur' },
                {
                    validator: (_r, v, cb) => {
                        if (v !== pwdForm.new_password) cb(new Error('两次密码不一致'))
                        else cb()
                    },
                    trigger: 'blur',
                },
            ],
        }
        function resetPwdForm() {
            pwdForm.old_password = ''
            pwdForm.new_password = ''
            pwdForm.new_password2 = ''
            pwdFormRef.value?.resetFields?.()
        }
        async function submitPwd() {
            await pwdFormRef.value?.validate?.()
            pwdLoading.value = true
            try {
                await AdminApi.put('/auth/password', {
                    old_password: pwdForm.old_password,
                    new_password: pwdForm.new_password,
                })
                ElementPlus.ElMessage.success('密码已更新')
                pwdVisible.value = false
            } finally {
                pwdLoading.value = false
            }
        }
        async function onCommand(cmd) {
            if (cmd === 'frontend') {
                window.open('/', '_blank')
                return
            } else if (cmd === 'password') {
                setTimeout(() => { pwdVisible.value = true }, 150)
                return
            } else if (cmd === 'logout') {
                try {
                    await AdminApi.post('/auth/logout', {})
                } catch (_) {}
                store.clearAuth()
                location.hash = ''
            }
        }
        function goFrontend() {
            window.open('/', '_blank')
        }
        return {
            store,
            Fold,
            Expand,
            Monitor,
            Operation,
            goFrontend,
            pwdVisible,
            pwdLoading,
            pwdFormRef,
            pwdForm,
            pwdRules,
            resetPwdForm,
            submitPwd,
            onCommand,
        }
    },
}
