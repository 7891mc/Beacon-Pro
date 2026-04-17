/**
 * 搜索栏：关键词 + 状态下拉
 */
const AppSearchBar = {
    props: {
        showKeyword: { type: Boolean, default: true },
        statusOptions: {
            type: Array,
            default: () => [],
        },
        statusPlaceholder: { type: String, default: '状态' },
    },
    emits: ['search', 'reset'],
    template: `
        <div class="filter-bar" :class="{ 'filter-bar--mobile': store.isMobile }">
            <el-input
                v-if="showKeyword"
                v-model="local.keyword"
                clearable
                placeholder="关键词"
                :style="store.isMobile ? '' : 'width: 200px;'"
                @keyup.enter="emitSearch"
            />
            <el-select
                v-if="statusOptions.length"
                v-model="local.status"
                clearable
                :placeholder="statusPlaceholder"
                :style="store.isMobile ? '' : 'width: 140px;'"
            >
                <el-option
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                />
            </el-select>
            <div :style="store.isMobile ? 'display:flex;gap:8px;width:100%;' : ''">
                <el-button type="primary" :style="store.isMobile ? 'flex:1;' : ''" @click="emitSearch">搜索</el-button>
                <el-button :style="store.isMobile ? 'flex:1;' : ''" @click="emitReset">重置</el-button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const store = AdminStore
        const local = Vue.reactive({ keyword: '', status: '' })
        function emitSearch() {
            emit('search', { keyword: local.keyword.trim(), status: local.status })
        }
        function emitReset() {
            local.keyword = ''
            local.status = ''
            emit('reset')
            emit('search', { keyword: '', status: '' })
        }
        return { store, local, emitSearch, emitReset }
    },
}
