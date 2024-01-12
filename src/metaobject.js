import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { generateUUID, degToRad } from 'three/src/math/MathUtils.js'
import Loader from './three_helpers/loader'
import models from './three_helpers/models'

/**
 * @returns {number[]}
 */
function f(a) {
    return [...a]
}

/**
 * 物体元信息，用于构建 THREE.Object3D
 */
export default class MetaObject {
    static ctx = {
        mode: '2d', // 展示模式 2d/3d
        edit: false, // 是否启用编辑
        /** @type {Loader} 模型加载器 */
        loader: new Loader(),
        render: null // 渲染函数
    }

    constructor(...metas) {
        let t = Object.assign({}, ...metas.map(x => x || {}))

        this.category = t.category // 模板类别
        this.tid = t.tid // 模板id
        this.tname = t.tname // 模板名称
        this.showLabel = t.showLabel || false // 是否显示标签

        this.size = f(t.size || [1, 1, 1])

        this.model2d = t.model2d // 平面模型
        this.rotate2d = f(t.rotate2d || [0, 0, 0]) // 平面模型旋转角度

        this.model3d = t.model3d // 立体模型
        this.rotate3d = f(t.rotate3d || [0, 0, 0]) // 立体模型旋转角度

        // 当没有模型时，将构建平面/立方体
        this.color = t.color || '#ffffff' // 平面物体颜色
        this.textColor = t.textColor || '#333333' // 文本颜色
        this.isTemplate = t.isTemplate || false // 是否为模板
        if (this.isTemplate) this.name = this.tname
        this.inCount = t.inCount
        if (!('inCount' in t)) this.inCount = true

        // 下面这些是物体才有的属性
        this.id = t.id || generateUUID() // 物体 id
        this.name = t.name || this.tname // 物体标签
        /** @type {number[]} */
        this.rotate = f(t.rotate || [0, 0, 0]) // 物体旋转角度

        /** @type {number[]} */
        this.position = f(t.position || [0, 0, 0.01])

        /** @type {THREE.Object3D}  */
        this.object3d = new THREE.Group() // 物体组
        this.object3d.position.set(...this.position)

        this.object3d.meta = this
        this.border = null // 用于 highlight
    }

    /**
     * fitting object to this size, return bounding box
     * @param {THREE.Object3D} object
     * @returns {THREE.Box3}
     */
    fitting = (object, size) => {
        size = size || this.size
        let box = new THREE.Box3().setFromObject(object)
        let boxSize = box.max.sub(box.min)

        // 应该确认每条边
        let scalar = 1
        if (boxSize.x > size[0]) {
            scalar *= size[0] / boxSize.x
            boxSize = boxSize.multiplyScalar(size[0] / boxSize.x)
        }
        if (boxSize.y > size[1]) {
            scalar *= size[1] / boxSize.y
            boxSize = boxSize.multiplyScalar(size[1] / boxSize.y)
        }
        if (boxSize.z > size[2]) {
            scalar *= size[2] / boxSize.z
            boxSize = boxSize.multiplyScalar(size[2] / boxSize.z)
        }

        if (scalar < 1 || this.isTemplate)
            object.scale.multiplyScalar(scalar * 0.99)
        return box
    }

    /**
     * 构建 Object3D
     * async 用于加载模型
     * @returns {THREE.Object3D}
     */
    build = async () => {
        const { mode, edit, loader, render } = MetaObject.ctx

        this.object3d.visible = true
        if (!edit && this.isTemplate) {
            this.object3d.visible = false
        }

        const is3d = mode === '3d'
        const [width, height, z] = [this.size[0], this.size[1], this.size[2]]

        const group = this.getObject3D()
        group.scale.set(1, 1, 1)
        group.clear()
        this.border = null

        // 构建文字
        if (this.showLabel) {
            const text = models.text(this.isTemplate ? this.tname : this.name || this.tname,
                await loader.loadFont(), 0.5, this.textColor)

            // 调整文字以 fit 到 box 里
            this.fitting(text, [width - 0.5, height - 0.5, z])
            text.position.set(
                -width / 2 + 0.2 * text.scale.x,
                height / 2 - 1 * text.scale.y,
                is3d ? z : 2)
            text.rotation.set(...this.rotate.map(x => -degToRad(x)))
            group.add(text)
        }

        // 构建模型
        let model = null
        if (this.category === 'Path') {
            // 过道类型
            model = models.plane(width, height, { color: this.color, opacity: 0.8 })
            model.position.z = 0.01
        } else if (this.category === 'Room') {
            // 房间类型
            const linewidth = 0.15
            let boxBottom = models.box([width, linewidth, z], { color: this.color })
            let boxLeft = models.box([linewidth, height, z], { color: this.color })
            boxBottom.position.set(0, -height / 2 + linewidth/2, z / 2)
            let boxTop = boxBottom.clone()
            boxTop.position.set(0, height / 2 - linewidth/2, z / 2)
            boxLeft.position.set(-width / 2 + linewidth/2, 0, z / 2)
            let boxRight = boxLeft.clone()
            boxRight.position.set(width / 2 - linewidth/2, 0, z / 2)
            let ground = models.plane(width, height, { color: this.color, opacity: 0.5 })
            model = new THREE.Group()
            model.add(
                boxTop, boxBottom, boxLeft, boxRight, ground
            )
            model.position.z = 0.01
        } else if (this.category === 'Seat') {
            // 工位特别处理
            model = new THREE.Group()
            // desktop
            let desktop = models.plane(width * 0.9, height * 0.4, { color: '#fefefe' })
            desktop.position.y += height * 0.2
            desktop.position.z = 0.1
            // desktop border
            let line = models.border(width * 0.9, height * 0.4, this.color)
            line.position.y += height * 0.2
            line.position.z = 0.2
            let seat = models.plane(0.3, 0.2, { color: this.name === '工位' ? '#06C687' : '#175c99' })
            // let seat = models.circular(0.15, this.name === '工位' ? '#06C687' : '#175c99')
            seat.position.y -= 0.1
            seat.position.z = 0.2
            // seat status
            // let seatStatus = models.circular(0.1, 
            //     this.name === '工位' ? '#06C687' : '#279aff')
            // seatStatus.position.set(-0.3, 0.3, 0.2)
            // seat.rotateZ(degToRad(20))
            model.add(desktop, line, seat)
        } else if (is3d) {
            model = this.#build3d(await loader.load(this.model3d))
            if (!model) model = this.#build2d(await loader.load(this.model2d))
            if (!model) {
                model = models.box(this.size, { color: this.color, opacity: 0.8 })
                model.position.z = this.size[2] / 2 + 0.01
            }
        } else {
            model = this.#build2d(await loader.load(this.model2d))
            if (!model) model = this.#build3d(await loader.load(this.model3d))
            if (!model) {
                model = models.plane(width, height, { color: this.color, opacity: 0.8 })
            }
            model.position.z = 0.01
        }
        if (model) {
            group.add(model)
        }

        group.add(models.plane(width, height, { visible: false }))

        group.rotation.set(...this.rotate.map(degToRad))
        group.position.set(...this.position)

        // 2d模式直接压缩显示
        if (!is3d) {
            group.scale.z = 0.1
            group.position.z *= 0.1
        }

        if (this.isTemplate) {
            const object3d = group.clone()
            group.clear()

            // 限制模板的模型大小到 2
            this.fitting(object3d, [2.5, 2.5, 2.5])
            object3d.position.set(0, 0, this.position[2])
            group.add(object3d)

            // 显示模板名称
            let text = models.text(this.tname, await loader.loadFont(), 0.6, '#333333')
            text.position.set(-2, -2.3, 0)
            group.add(text)

            // 显示外圈
            let plane = models.plane(4.5, 4.5, { color: '#ffffff', opacity: 1 })
            plane.position.y -= 0.5
            plane.position.z = -0.1
            group.add(plane)
            group.position.z = 0.01
        }
        this.render()
        return group
    }

    #build2d = (model) => {
        if (!model) return null
        const material = new THREE.SpriteMaterial({ map: model, color: 0xffffff });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(...this.size)
        return sprite
    }

    #build3d = (model) => {
        if (!model) return null
        /** @type {THREE.Object3D} */
        let object = model.scene.clone()
        if (this.rotate3d) object.rotation.set(...this.rotate3d.map(degToRad))
        // shrink to size
        let box = this.fitting(object)
        return object
    }

    render = () => {
        // if (MetaObject.ctx.render) MetaObject.ctx.render()
    }

    /**
     * highlight this
     * @param {string} color 
     */
    highlight = (color) => {
        color = color || '#FFFF33'
        this.delight()
        let group = this.getObject3D()
        this.border = models.fatborder(this.size[0], this.size[1], color, 
                0.05 * Math.sqrt(Math.min(this.size[0], this.size[1])))
        this.border.position.z = this.size[2] + 0.05
        if (this.isTemplate) this.fitting(this.border, [2.5, 2.5, 2.5])
        group.add(this.border)
        this.render()
    }

    delight = () => {
        if (this.border) this.getObject3D().remove(this.border)
        this.render()
    }

    /**
     * 返回作为模板时的属性
     * @returns {Object}
     */
    toTemplate = () => {
        return {
            category: this.category, tid: this.tid, tname: this.tname,
            showLabel: this.showLabel, position: [...this.position],
            model2d: this.model2d, rotate2d: [...this.rotate2d],
            model3d: this.model3d, rotate3d: [...this.rotate3d],
            color: this.color, size: [...this.size],
            isTemplate: true, inCount: this.inCount
        }
    }

    /**
     * 返回作为 Object 时的属性
     * @returns {Object}
     */
    toJson = () => {
        return Object.assign({}, this.toTemplate(), {
            id: this.id, name: this.name,
            rotate: [...this.rotate], isTemplate: false
        })
    }

    /**
     * @returns {THREE.Object3D}
     */
    getObject3D = () => {
        return this.object3d
    }

    static setContext(ctx) {
        MetaObject.ctx = ctx
    }
}


