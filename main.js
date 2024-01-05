import Scene from './src/scene.js'


const scene = new Scene()

const globalControl = new Vue({
    el: "#globalControl",
    data: {
        mode: '3d',
        edit: true,
        data: {},
        changed: false
    },
    watch: {
        mode() {
            this.updateData()
            this.buildScene()
        }
    },
    created() {
        this.load()
    },
    methods: {
        buildScene(e) {
            if (e) e.srcElement.blur()
            scene.build(this.data, {
                mode: this.mode,
                edit: this.edit,
                didChange: this.didChange
            })
        },
        async load() {
            let result = await Promise.all([
                fetch("http://localhost:8000/data"),
                scene.loader.loadFont() // 加载字体很慢，预先加载
            ])
            this.data = await result[0].json()
            this.buildScene()
            this.$message.success('加载成功');
        },
        async save(e) {
            if (e) e.srcElement.blur()

            this.updateData('save')
 
            await fetch("http://localhost:8000/save", {
                method: "POST",
                body: JSON.stringify(this.data)
            })
            this.changed = false
            this.$message.success('提交成功');
        },
        updateData(oper) {
            if (!this.edit) return

            this.data.objects = []
            this.data.templates = []

            for (let object of scene.objects) {
                /** @type {MetaObject} */
                let meta = object.meta
                if (meta.isTemplate) this.data.templates.push(meta.toTemplate())
                else this.data.objects.push(meta.toJson())
            }

            if (oper !== 'save' && this.changed) this.$message.info('已暂存');
        },
        changeEdit(e) {
            if (e) e.srcElement.blur()
            this.updateData()
            this.edit = !this.edit
            this.buildScene()
        },
        didChange() {
            this.changed = true
        }
    }
})
