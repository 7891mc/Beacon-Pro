/**
 * 主布局：侧栏 + 顶栏 + 内容区
 */
const AppLayout = {
    template: `
        <div class="admin-layout" :class="{ 'is-mobile': store.isMobile }">
            <div v-if="store.isMobile && store.mobileMenuOpen" class="mobile-backdrop" @click="store.mobileMenuOpen = false"></div>
            <el-container style="min-height: 100vh;">
                <el-aside
                    v-if="!store.isMobile"
                    :width="store.sidebarCollapsed ? '64px' : '220px'"
                    class="admin-aside"
                    :class="{ collapsed: store.sidebarCollapsed }"
                >
                    <app-sidebar></app-sidebar>
                </el-aside>
                <div v-else class="mobile-sidebar" :class="{ open: store.mobileMenuOpen }">
                    <app-sidebar></app-sidebar>
                </div>
                <el-container direction="vertical">
                    <el-header height="56px" class="admin-header" style="padding: 0;">
                        <app-header></app-header>
                    </el-header>
                    <el-main class="admin-main" style="padding: 0;">
                        <slot></slot>
                    </el-main>
                </el-container>
            </el-container>
        </div>
    `,
    setup() {
        return { store: AdminStore }
    },
}
