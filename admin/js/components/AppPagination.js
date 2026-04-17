/**
 * 分页封装
 */
const AppPagination = {
    props: {
        total: { type: Number, default: 0 },
        page: { type: Number, default: 1 },
        perPage: { type: Number, default: 15 },
    },
    emits: ['change'],
    template: `
        <div class="pagination-wrap">
            <el-pagination
                background
                :layout="store.isMobile ? 'total, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
                :total="total"
                :page-size="perPage"
                :current-page="page"
                :page-sizes="[10, 15, 20, 50, 100]"
                :small="store.isMobile"
                @size-change="onSize"
                @current-change="onPage"
            />
        </div>
    `,
    setup(props, { emit }) {
        const store = AdminStore
        function onPage(p) {
            emit('change', { page: p, perPage: props.perPage })
        }
        function onSize(ps) {
            emit('change', { page: 1, perPage: ps })
        }
        return { store, onPage, onSize }
    },
}
