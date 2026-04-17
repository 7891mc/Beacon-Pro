/**
 * 状态标签（与前台 STATUS_MAP 语义一致）
 */
const STATUS_MAP = {
    comment: {
        pending: { type: 'warning', text: '待审核' },
        approved: { type: 'success', text: '已通过' },
        rejected: { type: 'danger', text: '已拒绝' },
    },
    whitelist: {
        pending: { type: 'warning', text: '待审核' },
        approved: { type: 'success', text: '已通过' },
        rejected: { type: 'danger', text: '已拒绝' },
    },
    post: {
        draft: { type: 'info', text: '草稿' },
        published: { type: 'success', text: '已发布' },
    },
    user: {
        1: { type: 'success', text: '正常' },
        0: { type: 'danger', text: '禁用' },
    },
    generic: {
        online: { type: 'success', text: '在线' },
        offline: { type: 'danger', text: '离线' },
    },
}

const AppStatusTag = {
    props: {
        type: { type: String, required: true },
        status: { type: [String, Number], required: true },
    },
    template: `
        <el-tag :type="cfg.type" size="small">{{ cfg.text }}</el-tag>
    `,
    setup(props) {
        const cfg = Vue.computed(() => {
            const map = STATUS_MAP[props.type] || {}
            const key = props.status
            return map[key] || { type: 'info', text: String(key) }
        })
        return { cfg }
    },
}
