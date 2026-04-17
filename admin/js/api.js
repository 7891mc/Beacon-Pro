/**
 * 后台 API 客户端（axios + Bearer Token）
 */
const AdminApi = {
    baseURL: '/admin/api/index.php',

    get token() {
        return localStorage.getItem('admin_token') || ''
    },
    set token(v) {
        if (v) localStorage.setItem('admin_token', v)
        else localStorage.removeItem('admin_token')
    },

    _client() {
        const instance = axios.create({
            baseURL: this.baseURL,
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' },
        })

        instance.interceptors.request.use((config) => {
            const t = localStorage.getItem('admin_token') || ''
            if (t) {
                config.headers.Authorization = `Bearer ${t}`
                // 备用头：部分服务器 Nginx 不透传 Authorization，用此绕过
                config.headers['X-Admin-Token'] = t
            }
            return config
        })

        instance.interceptors.response.use(
            (res) => {
                const d = res.data
                if (d && typeof d.code === 'number' && d.code !== 200) {
                    const err = new Error(d.message || '请求失败')
                    err.response = res
                    err._body = d
                    return Promise.reject(err)
                }
                return res
            },
            (err) => {
                const status = err.response?.status
                const body = err.response?.data
                if (status === 401) {
                    const url = err.config?.url || ''
                    const isLoginFail = url.indexOf('/auth/login') !== -1
                    // ---- 调试日志：帮助排查 401 根因 ----
                    const sentAuth  = err.config?.headers?.['Authorization'] || '(未发送)'
                    const sentToken = err.config?.headers?.['X-Admin-Token'] || '(未发送)'
                    const lsToken   = localStorage.getItem('admin_token') || '(localStorage 为空)'
                    console.group('[Beacon 401 Debug]')
                    console.log('请求 URL :', url)
                    console.log('Authorization 头 :', sentAuth)
                    console.log('X-Admin-Token 头 :', sentToken)
                    console.log('localStorage token :', lsToken ? lsToken.slice(0, 16) + '...' : '(空)')
                    console.log('服务端响应 body :', body)
                    console.groupEnd()
                    // ------------------------------------
                    if (!isLoginFail) {
                        localStorage.removeItem('admin_token')
                        localStorage.removeItem('admin_user')
                        if (typeof AdminStore !== 'undefined') {
                            AdminStore.token = ''
                            AdminStore.user = null
                        }
                        ElementPlus.ElMessage.error(body?.message || '登录已过期，请重新登录')
                    }
                } else if (status === 422) {
                    const msg = body?.message || (Array.isArray(body?.data) ? body.data[0] : null) || '验证失败'
                    ElementPlus.ElMessage.error(msg)
                } else if (status === 403) {
                    ElementPlus.ElMessage.error(body?.message || '权限不足')
                }
                return Promise.reject(err)
            }
        )

        return instance
    },

    async request(method, url, data = null, config = {}) {
        const client = this._client()
        const m = method.toLowerCase()
        try {
            let res
            if (m === 'get') {
                res = await client.get(url, { params: data, ...config })
            } else if (m === 'delete') {
                res = await client.delete(url, { params: data, ...config })
            } else if (m === 'put') {
                res = await client.put(url, data, config)
            } else if (m === 'post') {
                res = await client.post(url, data, config)
            } else {
                throw new Error('Unsupported method: ' + method)
            }
            return res.data
        } catch (e) {
            const st = e.response?.status
            if (st !== 401 && st !== 422 && st !== 403) {
                const msg = e.response?.data?.message || e.message || '网络错误'
                ElementPlus.ElMessage.error(msg)
            }
            throw e
        }
    },

    get(url, params) {
        return this.request('get', url, params)
    },
    post(url, data) {
        return this.request('post', url, data)
    },
    put(url, data) {
        return this.request('put', url, data)
    },
    delete(url, params) {
        return this.request('delete', url, params)
    },

    async upload(url, formData) {
        const client = this._client()
        try {
            const res = await client.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            const d = res.data
            if (d && typeof d.code === 'number' && d.code !== 200) {
                ElementPlus.ElMessage.error(d.message || '上传失败')
                throw new Error(d.message)
            }
            return d
        } catch (e) {
            const st = e.response?.status
            if (st !== 401 && st !== 422 && st !== 403) {
                const msg = e.response?.data?.message || e.message || '上传失败'
                ElementPlus.ElMessage.error(msg)
            }
            throw e
        }
    },
}
