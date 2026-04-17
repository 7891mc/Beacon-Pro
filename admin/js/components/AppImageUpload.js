/**
 * 图片上传（multipart），modelValue 为相对路径
 */
const AppImageUpload = {
    props: {
        modelValue: { type: String, default: '' },
        action: { type: String, default: '/upload' },
    },
    emits: ['update:modelValue'],
    template: `
        <div style="position: relative; display: inline-block;">
            <el-upload
                :show-file-list="false"
                :http-request="customUpload"
                accept="image/*"
            >
                <template v-if="previewUrl">
                    <img :src="previewUrl" style="max-width: 200px; max-height: 120px; border-radius: 8px; cursor: pointer; object-fit: cover; display: block;" />
                </template>
                <el-button v-else type="primary" plain>选择图片上传</el-button>
            </el-upload>
            <button
                v-if="modelValue"
                @click.stop="clear"
                title="清除图片"
                style="position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; background: var(--text-primary); color: #fff; border: 2px solid var(--bg-base); font-size: 12px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: opacity 0.2s;"
                onmouseover="this.style.opacity='0.75'"
                onmouseout="this.style.opacity='1'"
            >&times;</button>
        </div>
    `,
    setup(props, { emit }) {
        const previewUrl = Vue.computed(() => {
            if (!props.modelValue) return ''
            if (props.modelValue.startsWith('http')) return props.modelValue
            return props.modelValue.startsWith('/') ? props.modelValue : '/' + props.modelValue
        })
        async function customUpload({ file }) {
            const fd = new FormData()
            fd.append('file', file)
            let uploadPath = props.action || '/upload'
            if (uploadPath.startsWith('/admin/api')) {
                uploadPath = uploadPath.replace(/^\/admin\/api/, '') || '/upload'
            }
            if (!uploadPath.startsWith('/')) uploadPath = '/' + uploadPath
            const res = await AdminApi.upload(uploadPath, fd)
            const path = res.data?.path || res.data?.url?.replace(/^\//, '') || ''
            if (path) {
                const rel = path.startsWith('/') ? path.slice(1) : path
                emit('update:modelValue', rel)
                ElementPlus.ElMessage.success('上传成功')
            }
        }
        function clear() {
            emit('update:modelValue', '')
        }
        return { previewUrl, customUpload, clear }
    },
}
