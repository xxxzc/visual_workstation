import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { generateUUID, degToRad } from 'three/src/math/MathUtils.js';
import Loader from './three_helpers/loader'
import Rect from './three_helpers/rect';

/**
 * 物体元信息，用于构建 THREE.Object3D
 */
export default class MetaObject {
    static ctx = {
        mode: '2d', // 展示模式 2d/3d
        edit: false, // 是否启用编辑
        /** @type {Loader} 模型加载器 */
        loader: new Loader()
    }

    constructor(...metas) {
        let t = Object.assign({}, ...metas.map(x => x || {}))

        this.category = t.category // 模板类别
        this.tid = t.tid // 模板id
        this.tname = t.tname // 模板名称
        this.showLabel = t.showLabel || false // 是否显示标签

        this.size = t.size || [1, 1, 1] // 整体大小

        this.model2d = t.model2d // 平面模型
        this.rotate2d = t.rotate2d || [0, 0, 0] // 平面模型旋转角度

        this.model3d = t.model3d // 立体模型
        this.rotate3d = t.rotate3d || [0, 0, 0] // 立体模型旋转角度

        // 当没有模型时，将构建平面/立方体
        this.color = t.color || '#ffffff' // 平面物体颜色
        this.textColor = t.textColor || '#333333' // 文本颜色
        this.isTemplate = t.isTemplate || false // 是否为模板
        if (this.isTemplate) this.name = this.tname

        // 下面这些是物体才有的属性
        this.id = t.id || generateUUID() // 物体 id
        this.name = t.name || this.tname // 物体标签
        /** @type {number[]} */
        this.rotate = t.rotate || [0, 0, 0] // 物体旋转角度

        /** @type {THREE.Object3D}  */
        this.object3d = new THREE.Group() // 物体组
        this.object3d.position.set(...(t.position || [0, 0, 0]))
        /** @type {THREE.Vector3} */
        this.position = this.object3d.position

        this.object3d.meta = this
        this.rect = null // 用于 highlight
    }

    /**
     * fitting object to this size
     * @param {THREE.Object3D} object
     */
    fitting = async (object, size) => {
        let min = Math.min(...(size || this.size))
        let box = new THREE.Box3().setFromObject(object)
        let scalar = min / Math.max(...box.max.sub(box.min).toArray())
        if (scalar < 1)
            object.scale.multiplyScalar(scalar)
    }

    /**
     * 构建 Object3D
     * async 用于加载模型
     * @returns {THREE.Object3D}
     */
    build = async () => {
        const { mode, edit, loader } = MetaObject.ctx

        this.object3d.visible = true
        if (!edit && this.isTemplate) {
            this.object3d.visible = false
        }

        const is3d = mode === '3d'
        const [width, height, z] = [this.size[0], this.size[1], this.size[2]]

        const group = this.getObject3D()
        group.scale.set(1, 1, 1)
        group.clear()
        this.rect = null

        // 构建文字
        if (this.showLabel) {
            const text = MetaObject.buildText(this.name || this.tname, 
                    await loader.loadFont(), 0.5, this.textColor)
            // 调整文字以 fit 到 box 里
            this.fitting(text)
            text.position.set(
                -width / 2 + 0.2 * text.scale.x, 
                height / 2 - 1 * text.scale.y, 
                is3d ? z : 0.4)
            text.rotation.set(...this.rotate.map(x => -degToRad(x)))
            group.add(text)
        }

        // 构建模型
        let model = null
        if (is3d) {
            model = this.#build3d(await loader.load(this.model3d))
            if (!model) model = this.#build2d(await loader.load(this.model2d))
            if (edit || !model) {
                let rect = MetaObject.buildBox(this.size, this.color)
                group.add(rect)
            }
        } else {
            model = this.#build2d(await loader.load(this.model2d))
            if (!model) model = this.#build3d(await loader.load(this.model3d))
            if (edit || !model) {
                let rect = Rect(width, height, 0, this.textColor, this.color, true, true)
                rect.position.z = 0.1
                group.add(rect)
            }
            if (model) model.position.z = 0.3
            group.scale.z = 0.1
        }
        if (model) group.add(model)

        group.rotation.set(...this.rotate.map(degToRad))

        if (this.isTemplate) {
            const object3d = group.clone()
            group.clear()

            // 限制模板的模型大小到 2
            this.fitting(object3d, [2, 2, 2])
            object3d.position.set(0, 0, 0)
            group.add(object3d)

            // 显示模板名称
            let text = MetaObject.buildText(this.tname,
                await loader.loadFont(), 0.6, '#333333')
            text.position.set(-2, -2.3, 0)
            group.add(text)

            // 显示外圈
            let rect = Rect(4.5, 4.5, 0, 0x999999, 0x333333, true, false)
            rect.position.y -= 0.5
            group.add(rect)
        } else {
            group.position.set(...this.position.toArray())
        }

        return group
    }

    /**
     * highlight this
     * @param {string} color 
     */
    highlight = (color) => {
        this.delight()
        let group = this.getObject3D()
        this.rect = Rect(this.size[0], this.size[1], 0, color, this.color, true, false)
        if (this.isTemplate) this.fitting(this.rect, [2, 2, 2])
        this.rect.position.z = 0.2
        group.add(this.rect)
    }

    delight = () => {
        if (this.rect) this.getObject3D().remove(this.rect)
    }


    static buildBox = (size, color) => {
        const geometry = new THREE.BoxGeometry(...size)
        const material = new THREE.MeshBasicMaterial({ color: color || 0x888888, opacity: 0.5, transparent: true })
        let mesh = new THREE.Mesh(geometry, material)
        mesh.position.z = size[2] / 2
        return mesh
    }

    static buildText(content, font, size, color) {
        size = size || 0.5
        color = color || 0x666666
        let text = new THREE.Mesh(
            new TextGeometry(content, {
                font, size, height: 0.1
            }), new THREE.MeshBasicMaterial({ color })
        )
        return text
    }

    #build2d = (map) => {
        if (!map) return null
        const material = new THREE.SpriteMaterial({ map: map, color: 0xffffff });
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
        this.fitting(object)
        return object
    }

    /**
     * 返回作为模板时的属性
     * @returns {Object}
     */
    toTemplate = () => {
        return {
            category: this.category, tid: this.tid, tname: this.tname,
            showLabel: this.showLabel,
            model2d: this.model2d, rotate2d: this.rotate2d,
            model3d: this.model3d, rotate3d: this.rotate3d,
            color: this.color, size: this.size,
            isTemplate: true
        }
    }

    /**
     * 返回作为 Object 时的属性
     * @returns {Object}
     */
    toJson = () => {
        return Object.assign({}, this.toTemplate(), {
            id: this.id, name: this.name,
            position: [...this.position.toArray()],
            rotate: this.rotate,
            isTemplate: false
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


