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
        this.name = t.name // 模板名称

        this.label = t.label || this.name // 物体标签
        this.showLabel = t.showLabel || false // 是否显示标签

        this.model2d = t.model2d // 平面模型
        this.rotate2d = t.rotate2d || null // 平面模型旋转角度
        this.color = t.color // 平面物体颜色

        this.model3d = t.model3d // 立体模型
        this.rotate3d = t.rotate3d || null // 立体模型旋转角度

        this.rotate = t.rotate || null // 物体旋转角度
        this.size = t.size || [1, 1, 1]

        this.id = t.id || generateUUID() // 物体 id
        this.position = t.position // 物体位置

        this.isTemplate = t.isTemplate || false // 是否为模板

        /** @type {THREE.Object3D}  */
        this.object3d
    }

    toJson = () => {
        return {
            category: this.category,
            tid: this.tid, name: this.name, label: this.label, showLabel: this.showLabel,
            model2d: this.model2d, rotate2d: this.rotate2d, color: this.color,
            model3d: this.model3d, rotate3d: this.rotate3d,
            rotate: this.rotate, size: this.size,
            id: this.id, position: this.position,
        }
    }

    /**
     * 根据 Object3d 更新元数据
     * @param {THREE.Object3D} object 
     * @returns 
     */
    update = (object) => {
        this.position = object.position.toArray()
        this.rotate = object.rotation.toArray().slice(0, 3).map(toDeg)
        this.size = object.scale.toArray()
    }

    /**
     * 构建 Object3D 对象
     * Group [
     * Box, // 碰撞体积
     * Text, Model2D, Model3D
     * ]
     * 
     * @param {string} mode 模式 edit/2d/3d
     * @param {Loader} loader 
     * @returns {THREE.Group}
     */
    build = async (mode, loader) => {
        let group = new THREE.Group()

        let _model2d = await loader.load(this.model2d)
        let _model3d = await loader.load(this.model3d)

        // 碰撞体积
        let box = this.#buildBox()
        if (mode === 'edit') {
            // 编辑模式，必显示碰撞体积
            box.visible = true
        } else if (mode === '2d' && _model2d) {
            // 有 2d 模型
            box.visible = false
        } else if (mode === '3d' && (_model3d || _model2d)) {
            box.visible = false
        }

        group.add(box)

        let text = this.#buildText(await loader.loadFont())
        text.visible = box.visible && this.showLabel
        group.add(text)

        if (_model2d && (mode === '2d' || !_model3d)) {
            let model2d = this.#build2d(_model2d)
            group.add(model2d)
        }

        if (_model3d && mode !== '2d') {
            let model3d = this.#build3d(_model3d)
            group.add(model3d)
        }

        if (this.rotate) group.rotation.set(...this.rotate.map(toRad))

        group.position.set(...this.position)
        group.meta = this

        this.object3d = group
        return group
    }

    #buildBox = () => {
        const geometry = new THREE.BoxGeometry(...this.size)
        const material = new THREE.MeshBasicMaterial({ color: this.color || 0x888888, opacity: 0.5, transparent: true })
        let mesh = new THREE.Mesh(geometry, material)
        return mesh
    }

    #buildText = (font) => {
        let text = new THREE.Mesh(
            new TextGeometry(this.label, {
                font, size: 0.6, height: 0.1
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


