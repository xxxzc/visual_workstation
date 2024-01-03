import * as THREE from 'three'

export default class MetaObject {

    constructor(...metas) {
        let t = Object.assign({}, ...metas.map(x => x || {}))

        this.category = t.category // 模板类别
        this.tid = t.tid // 模板id
        this.name = t.name // 模板名称

        this.size = t.size // 物体尺寸
        this.color = t.color // 平面物体颜色
        this.text = t.text // 平面物体标签
        this.model2d = t.model2d // 平面模型
        this.model3d = t.model3d // 立体模型
        this.scale = t.scale // 立体模型缩放
        this.rotate = 0 // 物体旋转角度

        this.id = t.id // 物体 id
        this.position = t.position // 物体位置
    }

    asTemplate = () => {
        return {
            category: this.category,
            tid: this.tid, name: this.name, text: this.text,
            model2d: this.model2d, size: this.size, color: this.color,
            model3d: this.model3d, scale: this.scale, rotate: this.rotate
        }
    }

    asMeta = () => {
        let meta = this.asTemplate()
        meta.id = this.id
        meta.position = this.position
        return meta
    }

    build2d = async () => {
        const geometry = new THREE.BoxGeometry(...this.size)
        const material = new THREE.MeshBasicMaterial({ color: this.color || 0xff0000, opacity: 0.5, transparent: true })
        return new THREE.Mesh(geometry, material)
    }

    build3d = async (ctx) => {
        if (!this.model3d) return this.build2d()
        let model = await ctx.loader.load(this.model3d)
        // let group = new THREE.Group()
        // group.add(model.scene)
        // group.add(await this.build2d())
        return model.scene
    }

    // buildText = async () => {
    //     let group = await Text(this)
    //     group.add(this.buildBox())
    //     return group
    // }
}


