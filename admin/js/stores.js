/**
 * 全局响应式状态
 */
const AdminStore = Vue.reactive({
    token: localStorage.getItem('admin_token') || '',
    user: (() => {
        try {
            return JSON.parse(localStorage.getItem('admin_user') || 'null')
        } catch {
            return null
        }
    })(),
    sidebarCollapsed: false,
    mobileMenuOpen: false,
    isMobile: window.innerWidth <= 768,
    currentRoute: (() => {
        const raw = (location.hash.slice(1) || '/dashboard').split('?')[0]
        return raw || '/dashboard'
    })(),

    get isLoggedIn() {
        return !!this.token
    },
    get isSuperAdmin() {
        return this.user?.role === 'super_admin'
    },

    setAuth(token, user) {
        this.token = token || ''
        this.user = user || null
        if (token) localStorage.setItem('admin_token', token)
        else localStorage.removeItem('admin_token')
        if (user) localStorage.setItem('admin_user', JSON.stringify(user))
        else localStorage.removeItem('admin_user')
    },

    clearAuth() {
        this.setAuth('', null)
    },

    navigate(path) {
        const p = path.startsWith('#') ? path.slice(1) : path
        const full = p.startsWith('/') ? p : '/' + p
        location.hash = full
        this.currentRoute = full.split('?')[0] || '/dashboard'
        if (this.isMobile) this.mobileMenuOpen = false
    },

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen
    },

    _onResize() {
        const wasMobile = this.isMobile
        this.isMobile = window.innerWidth <= 768
        if (!this.isMobile && wasMobile) this.mobileMenuOpen = false
        if (this.isMobile) this.sidebarCollapsed = false
    },
})

window.addEventListener('resize', () => AdminStore._onResize())
