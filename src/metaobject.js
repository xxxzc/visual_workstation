import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { generateUUID } from 'three/src/math/MathUtils.js';

import Loader from './three_helpers/loader'

function toVec(a) {
    return new THREE.Vector3(...a)
}

function toRad(x) {
    return Math.PI * x / 180
}

function toDeg(x) {
    return Math.round(x * 180 / Math.PI)
}

export default class MetaObject {

    constructor(...metas) {
        let t = Object.assign({}, ...metas.map(x => x || {}))

        this.category = t.category // 模板类别
        this.tid = t.tid // 模板id
        this.tname = t.tname // 模板名称

        this.name = t.name || this.tname // 物体标签
        this.showLabel = t.showLabel || false // 是否显示标签

        this.model2d = t.model2d // 平面模型
        this.rotate2d = t.rotate2d || [0, 0, 0] // 平面模型旋转角度
        this.color = t.color // 平面物体颜色

        this.model3d = t.model3d // 立体模型
        this.rotate3d = t.rotate3d || [0, 0, 0] // 立体模型旋转角度

        this.rotate = t.rotate || [0, 0, 0] // 物体旋转角度
        this.size = t.size || [1, 1, 1]

        this.id = t.id || generateUUID() // 物体 id

        this.isTemplate = t.isTemplate || false // 是否为模板

        /** @type {THREE.Object3D}  */
        this.group = new THREE.Group() // 物体组
        this.group.meta = this

        this.group.position.set(...(t.position || [0, 0, 0]))
        /** @type {THREE.Vector3} */
        this.position = this.group.position
    }

    toTemplate = () => {
        return {
            category: this.category, tid: this.tid, tname: this.tname, 
            showLabel: this.showLabel,
            model2d: this.model2d, rotate2d: this.rotate2d,
            model3d: this.model3d, rotate3d: this.rotate3d,
            color: this.color, size: this.size,
            isTemplate: this.isTemplate
        }
    }

    toJson = () => {
        return {
            category: this.category, tid: this.tid, tname: this.tname, 
            name: this.name, showLabel: this.showLabel,
            model2d: this.model2d, model3d: this.model3d,
            color: this.color, size: this.size, rotate: this.rotate,
            id: this.id, position: [...this.position.toArray()],
            isTemplate: this.isTemplate
        }
    }

    /**
     * 构建 Object3D 对象
     * Group [
     * Box, // 碰撞体积
     * Text, Model2D, Model3D
     * ]
     * @param {Object} ctx 
     * @param {string} ctx.mode 模式 2d/3d
     * @param {Loader} ctx.loader 模型加载器
     * @param {boolean} ctx.edit 是否为编辑模式
     * @returns {THREE.Group}
     */
    build = async ({ mode, loader, edit=false }) => {
        this.group.clear()

        let group = this.group

        let _model2d = await loader.load(this.model2d)
        let _model3d = await loader.load(this.model3d)

        // 碰撞体积
        let box = this.#buildBox()
        if (edit) {
            // 编辑模式，必显示碰撞体积
            box.visible = true
        } else if (mode === '2d' && _model2d) {
            // 有 2d 模型
            box.visible = false
        } else if (mode === '3d' && (_model3d || _model2d)) {
            box.visible = false
        }

        group.add(box)

        let text = MetaObject.buildText(this.name, await loader.loadFont(), 0.6)
        text.visible = box.visible && this.showLabel
        text.rotation.set(...this.rotate.map(x => -toRad(x)))
        if (this.isTemplate) text.position.y -= 2
        group.add(text)

        if (_model2d && (mode === '2d' || !_model3d)) {
            let model2d = this.#build2d(_model2d)
            group.add(model2d)
        }

        if (_model3d && mode === '3d') {
            let model3d = this.#build3d(_model3d)
            group.add(model3d)
        }

        group.rotation.set(...this.rotate.map(toRad))
        group.position.set(...this.position)

        return group
    }

    #buildBox = () => {
        const geometry = new THREE.BoxGeometry(...this.size)
        const material = new THREE.MeshBasicMaterial({ color: this.color || 0x888888, opacity: 0.5, transparent: true })
        let mesh = new THREE.Mesh(geometry, material)
        return mesh
    }

    static buildText(content, font, size) {
        size = size || 0.6
        let text = new THREE.Mesh(
            new TextGeometry(content, {
                font, size, height: 0.1
            }), new THREE.MeshBasicMaterial({ color: 0x666666 })
        )
        text.position.set(-0.5, -0.1, 0)
        return text
    }

    #build2d = (model) => {
        if (!model) return null
        return null
    }

    #build3d = (model) => {
        if (!model) return null

        /** @type {THREE.Object3D} */
        let object = model.scene.clone()

        if (this.rotate3d) object.rotation.set(...this.rotate3d.map(toRad))
        // shrink to size
        let box = new THREE.Box3().setFromObject(object)
        let size = box.max.sub(box.min)
        object.scale.multiplyScalar(Math.min(this.size[0], this.size[1]) / Math.max(size.x, size.y) * 0.98)

        return object
    }
}


