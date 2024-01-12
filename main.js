import Scene from './src/scene.js'


const scene = new Scene()

const globalControl = new Vue({
    el: "#globalControl",
    data: {
        mode: '2d', edit: false, changed: false,
        data: {
            size: [0, 0, 0],
            path: []
        },
        objects: scene.objects,
        searchValue: "",
        loading: false,
        objectCounts: []
    },
    watch: {
        mode() {
            this.loading = true
            requestAnimationFrame(() => {
                scene.switchMode(this.mode).then(() => {
                    this.loading = false
                })
            })
        },
        objects() {
            this.doCount()
        }
    },
    computed: {
        sortedObjects() {
            let objects = this.objects.filter(x => {
                if (!this.edit && x.meta.isTemplate) return false
                return true
            })
            if (this.searchValue) {
                let input = this.searchValue.toLowerCase()
                objects = objects.filter(
                    object => {
                        let searchFields = ['tname', 'name', 'category']
                        let index = searchFields.map(x => object.meta[x]).join("").toLocaleLowerCase()
                        for (let s of input) {
                            if (index.indexOf(s) === -1) return false
                        }
                        return true
                    }
                )
            }
            return objects.sort(
                (x, y) => {
                    let c = x.meta.name < y.meta.name ? -1 : 1
                    c = x.meta.name === y.meta.name ? 0 : c
                    return c
                }
            )
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
        async buildScene(e) {
            if (e) e.target.blur()
            this.changed = false // 构建场景说明使用的是服务器的数据
            this.loading = true
            await scene.build(this.data, this)
            this.loading = false
        },
        applyChange() {
            this.buildScene()
            this.didChange()
        },
        async load() {
            this.loading = true
            let result = await fetch("http://localhost:8000/data")
            this.data = await result.json()
            this.buildScene()
            this.loading = false
            this.$message.success('加载成功');
        },
        async save(e) {
            if (this.loading) {
                this.$message.warning('请勿重复点击！')
            }
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
            setTimeout(() => {
                this.loading = false
                this.$message.success('提交成功')
            }, 500)
            this.doCount()
        },
        handleSearch(value) {
            this.searchValue = value
        },
        select(value) {
            for (let object of scene.objects) {
                if (object.meta.id === value) {
                    scene.lookAtObject(object)
                    return
                }
            }
        },
        unselect() {
            scene.panel.setObject(null)
        },
        async changeEdit(e) {
            if (e) e.target.blur()
            this.edit = !this.edit
            this.loading = true
            scene.toggleEdit(this.edit)
            setTimeout(() => {
                this.loading = false
            }, 500)
        },
        didChange() {
            this.changed = true
            this.doCount()
        },
        doCount() {
            let counts = {}
            for (let object of this.objects) {
                if (object.meta.isTemplate || !object.meta.inCount) continue
                let category = object.meta.tname
                if (counts[category]) counts[category]++
                else counts[category] = 1
            }
            let result = []
            for (let [key, value] of Object.entries(counts)) {
                result.push({ key, value })
            }
            this.objectCounts = [...result]
        }
    }
})
