import * as THREE from 'three'

import { GLTFLoader } from '../lib/three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from '../lib/three/addons/geometries/TextGeometry.js';
import { FontLoader } from '../lib/three/addons/loaders/FontLoader.js';

const fontLoader = new FontLoader()
const gltfLoader = new GLTFLoader()
var fontObj = undefined // 字体文件对象

const Mode = {
    D2: "D2",
    D3: "D3"
}

export default class MetaObject {

    constructor(...metas) {
        let t = Object.assign({}, ...metas.map(x => x || {}))

        this.category = t.category // 模板类别
        this.tid = t.tid // 模板id
        this.name = t.name // 模板名称

        this.size = t.size // 物体尺寸
        this.color = t.color // 平面物体颜色
        this.text = t.text // 平面物体标签

        this.model = t.model // 立体模型
        this.scale = t.scale // 立体模型缩放

        this.id = t.id // 物体 id
        this.position = t.position // 物体位置
    }

    asTemplate = () => {
        return {
            category: this.category,
            tid: this.tid, name: this.name,
            size: this.size,
            color: this.color, text: this.text,
            model: this.model, scale: this.scale
        }
    }

    asMeta = () => {
        let meta = this.asTemplate()
        meta.id = this.id
        meta.position = this.position
        return meta
    }

    build = async (mode) => {
        /**
         * @type {THREE.Object3D} obj
         */
        let obj
        if (mode === Mode.D3) {
            obj = await this.buildText()
        } else obj = this.build2d()
        obj.position.set(...this.position)
        obj.meta = this.asMeta()
        return obj
    }

    build2d = () => {
        const geometry = new THREE.BoxGeometry(...this.size)
        const material = new THREE.MeshBasicMaterial({ color: this.color })
        return new THREE.Mesh(geometry, material)
    }

    build3d = () => {

    }

    // buildText = async () => {
    //     let group = await Text(this)
    //     group.add(this.buildBox())
    //     return group
    // }
}


