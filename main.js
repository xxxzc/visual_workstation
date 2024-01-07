import Scene from './src/scene.js'


const scene = new Scene()

const globalControl = new Vue({
    el: "#globalControl",
    data: {
        mode: '2d',
        edit: true,
        data: {},
        changed: false
    },
    watch: {
        mode() {
            scene.switchMode(this.mode)
        }
    },
    created() {
        this.load()
    },
    methods: {
        /**
         * 加载完数据或者点击Undo时，重新构建场景
         * @param {Event} e 
         */
        buildScene(e) {
            if (e) e.target.blur()
            this.changed = false // 构建场景说明使用的是服务器的数据
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
            if (e) e.target.blur()

            this.data.objects = []
            this.data.templates = []

            for (let object of scene.objects) {
                /** @type {MetaObject} */
                let meta = object.meta
                if (meta.isTemplate) this.data.templates.push(meta.toTemplate())
                else this.data.objects.push(meta.toJson())
            }

            await fetch("http://localhost:8000/save", {
                method: "POST",
                body: JSON.stringify(this.data)
            })
            this.changed = false
            this.$message.success('提交成功');
        },
        changeEdit(e) {
            if (e) e.target.blur()
            this.edit = !this.edit
            scene.toggleEdit(this.edit)
        },
        didChange() {
            this.changed = true
        }
    }
})
