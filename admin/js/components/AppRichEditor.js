/**
 * wangEditor 5 富文本
 */
const AppRichEditor = {
    props: {
        modelValue: { type: String, default: '' },
    },
    emits: ['update:modelValue'],
    template: `
        <div class="rich-editor-wrap">
            <div ref="toolbarRef" style="border-bottom: 1px solid var(--border-subtle);"></div>
            <div ref="editorRef" style="height: 320px;"></div>
        </div>
    `,
    setup(props, { emit }) {
        const toolbarRef = Vue.ref(null)
        const editorRef = Vue.ref(null)
        let editor = null
        let toolbar = null
        let syncing = false

        function getWang() {
            const w = window.wangEditor || window.WangEditor
            if (w && typeof w.createEditor === 'function') return w
            if (w && w.default && typeof w.default.createEditor === 'function') return w.default
            return null
        }

        function destroyEditor() {
            if (toolbar && typeof toolbar.destroy === 'function') {
                try {
                    toolbar.destroy()
                } catch (_) {}
            }
            if (editor && typeof editor.destroy === 'function') {
                try {
                    editor.destroy()
                } catch (_) {}
            }
            toolbar = null
            editor = null
        }

        Vue.onMounted(() => {
            const WE = getWang()
            if (!WE || !WE.createEditor || !WE.createToolbar) {
                console.error('wangEditor 未加载')
                return
            }
            const editorConfig = {
                placeholder: '请输入正文...',
                onChange(ed) {
                    if (syncing) return
                    const html = ed.getHtml()
                    emit('update:modelValue', html)
                },
            }
            editor = WE.createEditor({
                selector: editorRef.value,
                html: props.modelValue || '',
                config: editorConfig,
                mode: 'default',
            })
            toolbar = WE.createToolbar({
                editor,
                selector: toolbarRef.value,
                config: {},
                mode: 'default',
            })
        })

        Vue.onBeforeUnmount(() => {
            destroyEditor()
        })

        Vue.watch(
            () => props.modelValue,
            (v) => {
                if (!editor) return
                const cur = editor.getHtml()
                if (cur === (v || '')) return
                syncing = true
                try {
                    editor.setHtml(v || '')
                } finally {
                    syncing = false
                }
            }
        )

        return { toolbarRef, editorRef }
    },
}
