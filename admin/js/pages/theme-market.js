/**
 * 主题管理：商城列表 + 启用 + 个性化设置
 */
const ThemeMarketPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">主题</h2>
                <el-button :loading="loading" @click="loadAll(true)">
                    <el-icon><Refresh /></el-icon>刷新
                </el-button>
            </div>

            <!-- 骨架屏 -->
            <div v-if="loading && !themes.length" class="tm-grid">
                <div v-for="i in 4" :key="i" class="card-box tm-card">
                    <el-skeleton :rows="4" animated style="padding:20px" />
                </div>
            </div>

            <!-- 主题网格 -->
            <div v-else-if="themes.length" class="tm-grid">
                <div v-for="t in themes" :key="t.slug" class="card-box tm-card">
                    <!-- 缩略图 -->
                    <div class="tm-card__cover" v-if="t.thumbnail_url" :style="{ backgroundImage: 'url(' + t.thumbnail_url + ')' }">
                        <div class="tm-card__tags">
                            <span v-if="t.slug === currentTheme" class="tm-tag tm-tag--active">使用中</span>
                            <span v-else-if="t.is_installed" class="tm-tag tm-tag--installed">已安装</span>
                            <span v-if="t.has_update" class="tm-tag tm-tag--update">有更新</span>
                            <span class="tm-tag">{{ themeTypeLabel(t) }}</span>
                            <span v-if="t.is_builtin" class="tm-tag">默认</span>
                        </div>
                    </div>

                    <div class="tm-card__top" :style="t.thumbnail_url ? {} : {}">
                        <div v-if="!t.thumbnail_url" class="tm-card__icon">{{ t.name.charAt(0) }}</div>
                        <div class="tm-card__meta">
                            <h3 class="tm-card__name">{{ t.name }}</h3>
                            <span class="tm-card__author">{{ themeMetaLine(t) }}</span>
                        </div>
                        <div v-if="!t.thumbnail_url" class="tm-card__tags">
                            <span v-if="t.slug === currentTheme" class="tm-tag tm-tag--active">使用中</span>
                            <span v-else-if="t.is_installed" class="tm-tag tm-tag--installed">已安装</span>
                            <span v-if="t.has_update" class="tm-tag tm-tag--update">有更新</span>
                            <span class="tm-tag">{{ themeTypeLabel(t) }}</span>
                            <span v-if="t.is_builtin" class="tm-tag">默认</span>
                        </div>
                    </div>

                    <p class="tm-card__desc">{{ t.description || '暂无介绍' }}</p>

                    <div class="tm-card__stats">
                        <span class="tm-stat">
                            <el-rate :model-value="t.rating_avg" disabled text-color="#f59e0b" :max="5" size="small" />
                            <span>{{ t.rating_avg > 0 ? t.rating_avg.toFixed(1) : '-' }} ({{ t.rating_count }})</span>
                        </span>
                        <span class="tm-stat"><el-icon><Download /></el-icon>{{ t.install_count }}</span>
                    </div>

                    <div class="tm-card__actions">
                        <el-button v-if="t.has_update && t.is_installed" size="small" type="primary"
                            @click="installTheme(t)" :loading="installing === t.slug">
                            更新到 v{{ t.latest_version }}
                        </el-button>
                        <el-button v-else-if="!t.is_installed" size="small" type="primary"
                            :loading="installing === t.slug" @click="installTheme(t)">
                            安装
                        </el-button>
                        <el-button v-else-if="t.slug === currentTheme" size="small" disabled>使用中</el-button>
                        <el-button v-else-if="t.is_installed" size="small" type="primary"
                            :loading="applying === t.slug" @click="applyTheme(t)">
                            启用
                        </el-button>

                        <el-button v-if="t.is_installed" size="small" @click="openSettings(t)">设置</el-button>
                        <el-button size="small" @click="openDetail(t)">详情</el-button>

                        <el-button v-if="t.is_installed && t.slug !== 'starter'" size="small"
                            :loading="uninstalling === t.slug" @click="uninstallTheme(t)">
                            卸载
                        </el-button>
                    </div>
                </div>
            </div>

            <div v-else class="card-box" style="text-align:center;padding:48px;color:var(--text-muted)">
                <el-icon style="font-size:40px;margin-bottom:12px"><Box /></el-icon>
                <p>暂无可用主题</p>
            </div>

            <!-- ===== 主题设置抽屉 ===== -->
            <el-drawer v-model="settingsDrawerVisible" :title="settingsDrawerTitle" size="520px" direction="rtl" destroy-on-close>
                <div v-loading="settingsLoading" style="min-height:120px">
                    <p v-if="settingsThemeDesc" style="color: var(--text-muted); margin: -8px 0 16px; font-size: 13px;">{{ settingsThemeDesc }}</p>
                    <template v-if="settingsSchema.length > 0">
                        <el-form label-width="140px" style="max-width: 100%;">
                            <template v-for="field in settingsSchema" :key="field.key">
                                <el-form-item :label="field.label" v-if="field.type === 'select' && isVisible(field)">
                                    <el-select v-model="settingsForm[field.key]" style="width: 100%;">
                                        <el-option
                                            v-for="opt in field.options"
                                            :key="opt.value"
                                            :label="opt.label"
                                            :value="opt.value"
                                            :disabled="isOptionDisabled(opt)"
                                        />
                                    </el-select>
                                </el-form-item>
                                <el-form-item :label="field.label" v-if="field.type === 'switch' && isVisible(field)">
                                    <el-switch v-model="settingsForm[field.key]" />
                                </el-form-item>
                                <el-form-item :label="field.label" v-if="field.type === 'input' && isVisible(field)">
                                    <el-input v-model="settingsForm[field.key]" :placeholder="field.placeholder || ''" />
                                </el-form-item>
                                <el-form-item :label="field.label" v-if="field.type === 'textarea' && isVisible(field)">
                                    <el-input v-model="settingsForm[field.key]" type="textarea" :rows="4" :placeholder="field.placeholder || ''" />
                                </el-form-item>
                                <el-form-item :label="field.label" v-if="field.type === 'color' && isVisible(field)">
                                    <el-color-picker v-model="settingsForm[field.key]" />
                                </el-form-item>
                                <el-form-item :label="field.label" v-if="field.type === 'image' && isVisible(field)">
                                    <div style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
                                        <app-image-upload v-model="settingsForm[field.key]" />
                                        <el-input v-model="settingsForm[field.key]" :placeholder="field.placeholder || '图片路径或URL'" style="flex:1;" />
                                    </div>
                                </el-form-item>
                            </template>
                        </el-form>
                        <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                            <el-button type="primary" :loading="settingsSaving" @click="saveSettings">保存设置</el-button>
                        </div>
                    </template>
                    <p v-else-if="!settingsLoading && settingsTheme" style="color: var(--text-muted); font-size: 13px;">该主题暂无可配置项。</p>
                </div>
            </el-drawer>

            <!-- ===== 详情抽屉 ===== -->
            <el-drawer v-model="drawerVisible" :title="drawerTheme ? drawerTheme.name : ''" size="480px" direction="rtl">
                <template v-if="drawerTheme">
                    <div class="drawer-section" v-if="drawerTheme.screenshots && drawerTheme.screenshots.length">
                        <h4 class="drawer-section-title">截图预览</h4>
                        <div class="screenshot-gallery">
                            <div v-for="(src, i) in drawerTheme.screenshots" :key="i"
                                class="screenshot-thumb" @click="previewImage(src)">
                                <img :src="src" loading="lazy">
                            </div>
                        </div>
                    </div>

                    <div class="drawer-section">
                        <h4 class="drawer-section-title">主题信息</h4>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                            <span class="tm-tag">{{ themeSourceLabel(drawerTheme) }}</span>
                            <span v-if="drawerTheme.is_builtin" class="tm-tag">默认主题</span>
                            <span v-if="drawerTheme.slug === currentTheme" class="tm-tag tm-tag--active">当前启用</span>
                        </div>
                        <div style="color:var(--text-muted);font-size:13px;line-height:1.7;">
                            {{ themeInfoText(drawerTheme) }}
                        </div>
                    </div>

                    <div class="drawer-section">
                        <h4 class="drawer-section-title">版本日志</h4>
                        <div class="changelog-box">
                            <div class="changelog-version">v{{ drawerTheme.latest_version }} · {{ drawerTheme.released_at }}</div>
                            <div class="changelog-content" v-html="formatChangelog(drawerTheme.changelog)"></div>
                        </div>
                    </div>

                    <div v-if="drawerTheme.is_market" class="drawer-section">
                        <h4 class="drawer-section-title">{{ myReview.rating > 0 ? '修改我的评价' : '发表评价' }}</h4>
                        <div class="review-form">
                            <el-rate v-model="myReview.rating" :max="5" show-text
                                :texts="['很差', '较差', '一般', '不错', '非常好']" />
                            <el-input v-model="myReview.nickname" placeholder="昵称（可选）" style="margin-top:10px" size="small" />
                            <el-input v-model="myReview.content" type="textarea" placeholder="写下你的使用感受（可选）"
                                :rows="3" style="margin-top:8px" size="small" />
                            <el-button type="primary" size="small" style="margin-top:10px" :loading="submittingReview"
                                @click="submitReview" :disabled="!myReview.rating">提交评价</el-button>
                        </div>
                    </div>

                    <div v-if="drawerTheme.is_market" class="drawer-section">
                        <h4 class="drawer-section-title">用户评价</h4>
                        <div v-if="reviews.length" class="review-list">
                            <div v-for="r in reviews" :key="r.created_at" class="review-item">
                                <div class="review-item__header">
                                    <span class="review-item__nick">{{ r.nickname || '匿名用户' }}</span>
                                    <el-rate :model-value="r.rating" disabled size="small" />
                                    <span class="review-item__time">{{ r.created_at?.slice(0,10) }}</span>
                                </div>
                                <p v-if="r.content" class="review-item__content">{{ r.content }}</p>
                            </div>
                            <div v-if="reviewTotal > reviews.length" style="text-align:center;margin-top:12px">
                                <el-button size="small" @click="loadMoreReviews">加载更多</el-button>
                            </div>
                        </div>
                        <div v-else style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">
                            暂无评价，成为第一个评价的人吧
                        </div>
                    </div>

                    <div v-if="drawerTheme.is_market" class="drawer-section">
                        <h4 class="drawer-section-title">提交反馈</h4>
                        <el-select v-model="feedbackForm.type" size="small" style="width:100%;margin-bottom:8px">
                            <el-option label="Bug 反馈" value="bug" />
                            <el-option label="功能建议" value="feature" />
                            <el-option label="使用问题" value="question" />
                            <el-option label="其他" value="other" />
                        </el-select>
                        <el-input v-model="feedbackForm.content" type="textarea" placeholder="描述你的问题或建议"
                            :rows="3" size="small" />
                        <el-input v-model="feedbackForm.contact" placeholder="联系方式（可选，如 QQ/邮箱）"
                            style="margin-top:8px" size="small" />
                        <el-button type="primary" size="small" style="margin-top:10px" :loading="submittingFeedback"
                            @click="submitFeedback" :disabled="!feedbackForm.content">提交反馈</el-button>
                    </div>

                    <div v-else class="drawer-section">
                        <h4 class="drawer-section-title">主题来源</h4>
                        <div style="color:var(--text-muted);font-size:13px;line-height:1.7;">{{ themeInfoText(drawerTheme) }}</div>
                    </div>
                </template>
            </el-drawer>

            <teleport to="body">
                <div v-if="previewSrc" class="tm-preview-overlay" @click="previewSrc = ''">
                    <img :src="previewSrc" class="tm-preview-img" @click.stop>
                    <div class="tm-preview-close" @click="previewSrc = ''">×</div>
                </div>
            </teleport>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted, computed } = Vue

        const themes = ref([])
        const loading = ref(false)
        const installing = ref('')
        const uninstalling = ref('')
        const applying = ref('')
        const currentTheme = ref('')

        const settingsDrawerVisible = ref(false)
        const settingsTheme = ref(null)
        const settingsSchema = ref([])
        const settingsForm = reactive({})
        const settingsLoading = ref(false)
        const settingsSaving = ref(false)
        const settingsThemeDesc = ref('')

        const settingsDrawerTitle = computed(() => {
            if (!settingsTheme.value) return '主题设置'
            return (settingsTheme.value.name || settingsTheme.value.slug) + ' · 设置'
        })

        const drawerVisible = ref(false)
        const drawerTheme = ref(null)
        const previewSrc = ref('')
        const reviews = ref([])
        const reviewPage = ref(1)
        const reviewTotal = ref(0)
        const submittingReview = ref(false)
        const submittingFeedback = ref(false)

        const myReview = reactive({ rating: 0, content: '', nickname: '' })
        const feedbackForm = reactive({ type: 'bug', content: '', contact: '' })

        function normalizeLocalTheme(localTheme, current) {
            const slug = localTheme.id
            const isStarter = slug === 'starter'
            return {
                slug,
                id: slug,
                name: isStarter ? 'Starter 默认主题' : (localTheme.name || slug),
                description: isStarter ? 'Beacon 内置默认主题，适合作为安装后的初始主题。' : '本地已安装主题，当前未发布到主题商城。',
                author: isStarter ? 'Beacon Team' : '本地主题',
                latest_version: '本地',
                local_version: null,
                released_at: '',
                changelog: isStarter ? '- Beacon 内置默认主题\n- 适合作为安装后的初始主题' : '- 本地已安装主题\n- 当前未发布到主题商城',
                rating_avg: 0,
                rating_count: 0,
                install_count: 0,
                is_installed: true,
                has_update: false,
                is_market: false,
                is_builtin: isStarter,
                my_rating: 0,
                price_type: 'local',
                thumbnail_url: '',
                screenshots: [],
                is_active: slug === current,
            }
        }

        function mergeThemes(marketThemes, localThemes, current) {
            const merged = new Map()

            ;(marketThemes || []).forEach((theme) => {
                merged.set(theme.slug, {
                    ...theme,
                    is_market: true,
                    is_builtin: theme.slug === 'starter',
                    price_type: theme.price_type || 'free',
                    is_active: theme.slug === current,
                })
            })

            ;(localThemes || []).forEach((theme) => {
                const slug = theme.id
                if (!slug) return
                if (!merged.has(slug)) {
                    merged.set(slug, normalizeLocalTheme(theme, current))
                    return
                }
                const existing = merged.get(slug)
                merged.set(slug, {
                    ...existing,
                    id: existing.id || slug,
                    name: theme.name || existing.name || slug,
                    is_installed: true,
                    is_active: slug === current,
                })
            })

            return Array.from(merged.values()).sort((a, b) => {
                const weight = (theme) => {
                    if (theme.slug === current) return 0
                    if (theme.is_installed) return 1
                    return 2
                }
                const diff = weight(a) - weight(b)
                if (diff !== 0) return diff
                return (a.name || a.slug).localeCompare(b.name || b.slug, 'zh-CN')
            })
        }

        function themeTypeLabel(theme) {
            if (theme.is_builtin) return '内置'
            if (!theme.is_market) return '本地'
            return theme.price_type === 'free' ? '免费' : '付费'
        }

        function themeSourceLabel(theme) {
            if (theme.is_builtin) return '内置主题'
            if (!theme.is_market) return '本地主题'
            return '主题商城'
        }

        function themeMetaLine(theme) {
            const author = theme.author || '未知作者'
            const version = theme.latest_version || '未知版本'
            return `${author} · v${version}`
        }

        function themeInfoText(theme) {
            if (theme.is_builtin) {
                return '这是 Beacon 随程序附带的默认主题，适合安装完成后直接启用，也可以继续按需自定义。'
            }
            if (!theme.is_market) {
                return '这是本地已安装主题，当前未上架到主题商城，因此不会显示商城评分、反馈与远程更新信息。'
            }
            return '该主题来自主题商城，可直接安装、启用、配置，并查看评价与更新记录。'
        }

        async function loadAll(refresh = false) {
            loading.value = true
            try {
                const [listRes, curRes] = await Promise.all([
                    AdminApi.get('/theme-market/list' + (refresh ? '?refresh=1' : '')),
                    AdminApi.get('/settings/themes'),
                ])
                currentTheme.value = curRes.data?.current || ''
                themes.value = mergeThemes(listRes.data || [], curRes.data?.themes || [], currentTheme.value)
            } catch (_) {
                // AdminApi.request already shows error toast
            } finally {
                loading.value = false
            }
        }

        async function loadThemeSettingsForSlug(slug) {
            if (!slug) return
            settingsLoading.value = true
            try {
                const res = await AdminApi.get(`/themes/${slug}/settings`)
                const d = res.data || {}
                settingsSchema.value = d.schema || []
                settingsThemeDesc.value = d.description || ''
                Object.keys(settingsForm).forEach((k) => delete settingsForm[k])
                const values = d.values || {}
                settingsSchema.value.forEach((field) => {
                    if (field.type === 'switch') {
                        settingsForm[field.key] =
                            values[field.key] === true || values[field.key] === '1' || values[field.key] === 'true'
                    } else {
                        settingsForm[field.key] = values[field.key] ?? field.default ?? ''
                    }
                })
            } catch (_) {
                settingsSchema.value = []
                settingsThemeDesc.value = ''
            } finally {
                settingsLoading.value = false
            }
        }

        async function applyTheme(t) {
            applying.value = t.slug
            try {
                await AdminApi.put('/settings/theme', { theme: t.slug })
                ElementPlus.ElMessage.success('主题已启用')
                currentTheme.value = t.slug
                await loadAll(true)
                if (settingsDrawerVisible.value && settingsTheme.value && settingsTheme.value.slug === t.slug) {
                    await loadThemeSettingsForSlug(t.slug)
                }
            } catch (_) {
            } finally {
                applying.value = ''
            }
        }

        async function openSettings(t) {
            settingsTheme.value = t
            settingsDrawerVisible.value = true
            await loadThemeSettingsForSlug(t.slug)
        }

        async function saveSettings() {
            const slug = settingsTheme.value?.slug
            if (!slug) return
            settingsSaving.value = true
            try {
                await AdminApi.put(`/themes/${slug}/settings`, { values: { ...settingsForm } })
                ElementPlus.ElMessage.success('主题设置已保存')
            } finally {
                settingsSaving.value = false
            }
        }

        function isVisible(field) {
            if (!field.show_when) return true
            const depVal = settingsForm[field.show_when.key]
            if (Array.isArray(field.show_when.value)) {
                return field.show_when.value.includes(depVal)
            }
            return depVal === field.show_when.value
        }

        function isOptionDisabled(opt) {
            if (!opt.disable_when) return false
            const depVal = settingsForm[opt.disable_when.key]
            if (Array.isArray(opt.disable_when.value)) {
                return opt.disable_when.value.includes(depVal)
            }
            return depVal === opt.disable_when.value
        }

        async function installTheme(t) {
            const isUpdate = t.has_update
            try {
                await ElementPlus.ElMessageBox.confirm(
                    isUpdate
                        ? `确定将 ${t.name} 从 v${t.local_version} 更新到 v${t.latest_version}？`
                        : `确定安装主题「${t.name}」v${t.latest_version}？`,
                    isUpdate ? '更新主题' : '安装主题',
                    { confirmButtonText: isUpdate ? '确认更新' : '确认安装', cancelButtonText: '取消' }
                )
            } catch (_) {
                return
            }

            installing.value = t.slug
            try {
                const res = await AdminApi.post(`/theme-market/install/${t.slug}`, {})
                ElementPlus.ElMessage.success(res.message || '安装成功')
                await loadAll(true)
                if (settingsDrawerVisible.value && settingsTheme.value && settingsTheme.value.slug === t.slug) {
                    await loadThemeSettingsForSlug(t.slug)
                }
            } catch (_) {
            } finally {
                installing.value = ''
            }
        }

        async function uninstallTheme(t) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `「${t.name}」的主题文件将被删除且不可恢复，确定继续？`,
                    '卸载主题',
                    {
                        confirmButtonText: '卸载',
                        cancelButtonText: '取消',
                        showClose: false,
                        customClass: 'uninstall-confirm-dialog',
                    }
                )
            } catch (_) {
                return
            }

            uninstalling.value = t.slug
            try {
                await AdminApi.post(`/theme-market/uninstall/${t.slug}`, {})
                ElementPlus.ElMessage({ message: '已卸载', type: 'info', plain: true })
                await loadAll(true)
                if (settingsTheme.value && settingsTheme.value.slug === t.slug) {
                    settingsDrawerVisible.value = false
                    settingsTheme.value = null
                }
            } catch (_) {
            } finally {
                uninstalling.value = ''
            }
        }

        async function openDetail(t) {
            drawerTheme.value = t
            drawerVisible.value = true
            reviews.value = []
            reviewPage.value = 1
            reviewTotal.value = 0
            myReview.rating = t.my_rating || 0
            myReview.content = ''
            myReview.nickname = ''
            feedbackForm.type = 'bug'
            feedbackForm.content = ''
            feedbackForm.contact = ''
            if (t.is_market) {
                await loadReviews(t.slug, 1)
            }
        }

        async function loadReviews(slug, page) {
            try {
                const res = await AdminApi.get(`/theme-market/reviews/${slug}?page=${page}`)
                const d = res.data || {}
                if (page === 1) reviews.value = d.reviews || []
                else reviews.value.push(...(d.reviews || []))
                reviewTotal.value = d.total || 0
                reviewPage.value = page
            } catch (_) {}
        }

        async function loadMoreReviews() {
            if (drawerTheme.value) {
                await loadReviews(drawerTheme.value.slug, reviewPage.value + 1)
            }
        }

        async function submitReview() {
            if (!myReview.rating) return
            submittingReview.value = true
            try {
                await AdminApi.post(`/theme-market/review/${drawerTheme.value.slug}`, {
                    rating: myReview.rating,
                    content: myReview.content,
                    nickname: myReview.nickname,
                })
                ElementPlus.ElMessage.success('评价提交成功')
                await loadReviews(drawerTheme.value.slug, 1)
                await loadAll()
            } catch (_) {
            } finally {
                submittingReview.value = false
            }
        }

        async function submitFeedback() {
            if (!feedbackForm.content) return
            submittingFeedback.value = true
            try {
                await AdminApi.post(`/theme-market/feedback/${drawerTheme.value.slug}`, {
                    type: feedbackForm.type,
                    content: feedbackForm.content,
                    contact: feedbackForm.contact,
                })
                ElementPlus.ElMessage.success('反馈已提交，感谢！')
                feedbackForm.content = ''
                feedbackForm.contact = ''
            } catch (_) {
            } finally {
                submittingFeedback.value = false
            }
        }

        function previewImage(src) {
            previewSrc.value = src
        }

        function formatChangelog(text) {
            if (!text) return '<span style="color:var(--text-muted)">暂无更新日志</span>'
            const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            return escaped
                .replace(
                    /^### (.+)$/gm,
                    '<strong style="display:block;margin:10px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)">$1</strong>'
                )
                .replace(/^[-*] (.+)$/gm, '<div style="padding:2px 0 2px 12px;font-size:13px;color:var(--text-secondary);">· $1</div>')
                .replace(/\n/g, '')
        }

        onMounted(() => {
            if (!AdminStore.isSuperAdmin) {
                ElementPlus.ElMessage.error('无权访问')
                AdminStore.navigate('/dashboard')
                return
            }
            loadAll()
        })

        return {
            themes,
            loading,
            installing,
            uninstalling,
            applying,
            currentTheme,
            settingsDrawerVisible,
            settingsTheme,
            settingsSchema,
            settingsForm,
            settingsLoading,
            settingsSaving,
            settingsThemeDesc,
            settingsDrawerTitle,
            drawerVisible,
            drawerTheme,
            previewSrc,
            reviews,
            reviewTotal,
            submittingReview,
            submittingFeedback,
            myReview,
            feedbackForm,
            loadAll,
            applyTheme,
            openSettings,
            saveSettings,
            isVisible,
            isOptionDisabled,
            installTheme,
            uninstallTheme,
            openDetail,
            previewImage,
            loadMoreReviews,
            submitReview,
            submitFeedback,
            formatChangelog,
            themeTypeLabel,
            themeSourceLabel,
            themeMetaLine,
            themeInfoText,
        }
    },
}
