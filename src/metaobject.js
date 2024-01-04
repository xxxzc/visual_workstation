import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import Text from './three_helpers/text'
import Loader from './three_helpers/loader'

function toVec(a) {
    return new THREE.Vector3(...a)
}

function toRad(x) {
    return Math.PI * x / 180
}

function toDeg(x) {
    return Math.round(x / Math.PI * 180)
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
        this.scale = t.scale || [1, 1, 1]

        this.id = t.id // 物体 id
        this.position = t.position // 物体位置
    }

    toJson = () => {
        return {
            category: this.category,
            tid: this.tid, name: this.name, label: this.label, showLabel: this.showLabel,
            model2d: this.model2d, rotate2d: this.rotate2d, color: this.color,
            model3d: this.model3d, rotate3d: this.rotate3d,
            rotate: this.rotate, scale: this.scale,
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
        this.scale = object.scale.toArray()
    }

    /**
     * 
     * @param {string} mode
     * @param {Loader} loader 
     */
    build = async (mode, loader) => {
        let group = new THREE.Group()
        if (mode === '2d' || !this.model3d) {
            this._model2d = await loader.load(this.model2d)
            group.add(this.#build2d())
        } else {
            this._model3d = await loader.load(this.model3d)
            group.add(this.#build3d())
        }

        if (this.rotate) group.rotation.set(...this.rotate.map(toRad))
        // group.scale.set(...this.scale)
        if (mode === '2d' || !this._model3d) {
            group.scale.set(...this.scale)
            if (this.showLabel) {
                group.add(
                    new THREE.Mesh(
                        new TextGeometry(this.label, {
                            font: await loader.loadFont(), size: 0.1, height: 0.1
                        }), new THREE.MeshBasicMaterial({ color: 0x000000 })
                    )
                )
            }

        } else if (mode === '3d') {
            group.scale.multiplyScalar(this.scale[0])
        }
        group.position.set(...this.position)
        group.meta = this
        return group
    }

    #build2d = () => {
        if (!this._model2d) {
            const geometry = new THREE.BoxGeometry(1, 1, 1)
            const material = new THREE.MeshBasicMaterial({ color: this.color || 0xff0000, opacity: 0.5, transparent: true })
            return new THREE.Mesh(geometry, material)
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
        object.scale.multiplyScalar(1 / Math.max(size.x, size.y))

        return object
    }
}


