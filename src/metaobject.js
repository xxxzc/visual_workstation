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
     * @param {string} mode 模式 edit/2d/3d
     * @param {Loader} loader 
     */
    build = async (mode, loader) => {
        let group = new THREE.Group()

        let model
        if (mode === '2d' || !this.model3d) {
            this._model2d = await loader.load(this.model2d)
            model = this.#build2d()
        } else {
            this._model3d = await loader.load(this.model3d)
            model = this.#build3d()
        }
        group.add(model)

        if (this.rotate) group.rotation.set(...this.rotate.map(toRad))

        if (mode === '2d' || !this._model3d) {
            if (this.showLabel) {
                let _group = group
                let text = new THREE.Mesh(
                    new TextGeometry(this.label, {
                        font: await loader.loadFont(), size: 0.6, height: 0.1
                    }), new THREE.MeshBasicMaterial({ color: 0x666666 })
                )
                text.position.set(-0.5, -0.1, 0)
                group = new THREE.Group()
                group.add(_group)
                group.add(text)
            }
        }
        group.position.set(...this.position)
        group.meta = this
        return group
    }

    #build2d = () => {
        if (!this._model2d) {
            const geometry = new THREE.BoxGeometry(...this.size)
            const material = new THREE.MeshBasicMaterial({ color: this.color || 0x888888, opacity: 0.5, transparent: true })
            let mesh = new THREE.Mesh(geometry, material)
            return mesh
        }
    }

    #build3d = () => {
        if (!this._model3d) return this.#build2d()

        let model = this._model3d
        /** @type {THREE.Object3D} */
        let object = model.scene.clone()

        if (this.rotate3d) object.rotation.set(...this.rotate3d.map(toRad))
        // shrink to size
        let box = new THREE.Box3().setFromObject(object)
        let size = box.max.sub(box.min)
        object.scale.multiplyScalar(Math.min(this.size[0], this.size[1]) / Math.max(size.x, size.y) * 0.95)

        return object
    }
}


