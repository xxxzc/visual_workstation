import Floor from './floor.js'
import helper from './objecter.js'

const floor = new Floor()

const Panel = new Vue({
    el: "#panel",
    data() {
        return {
            data: {},
            templates: {},
            template: {}, temp: null
        }
    },
    created() {
        fetch("http://localhost:8000/data").then(res => res.json()).then(data => {
            this.data = data
            this.templates = JSON.parse(JSON.stringify(data.templates))
            this.template = this.templates["NormalSeat"]

            floor.init(data)
            floor.render()

            document.addEventListener("mousedown", async (event) => {
                if (this.temp && this.temp.meta) {
                    this.template = Object.assign({}, this.temp.meta)
                }
            })
            floor.dragControl.addEventListener("hoveron", (event) => {
                this.temp = event.object
            })
            floor.dragControl.addEventListener("hoveroff", (event) => {
                this.temp = null
            })
        })
    },
    methods: {
        onSizeChange() { },
        onAdd() {
            floor.addObject(
                Object.assign({
                    id: Math.round(Math.random() * 10000)
                }, this.template, {
                    x: -20, y: 20
                })
            )
        },
        onDelete() {
            floor.deleteObject(this.template.id)
        },
        onSaveAll() {
            this.data.objects = floor.objects.map(obj => {
                obj.meta.x = obj.position.x - obj.meta.width / 2
                obj.meta.y = obj.position.y - obj.meta.height / 2
                return obj.meta
            })
            fetch("http://localhost:8000/save", {
                method: "POST",
                body: JSON.stringify(this.data)
            })
        }
    }
})

