import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { generateUUID } from 'three/src/math/MathUtils.js';
import RoundPlane from './three_helpers/rounded';

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

function addLineShape(shape, color, x, y, z, rx, ry, rz, s) {

    // lines
    shape.autoClose = true;

    const points = shape.getPoints();
    const geometryPoints = new THREE.BufferGeometry().setFromPoints(points);
    // solid line
    let line = new THREE.Line(geometryPoints, new THREE.LineBasicMaterial({ color: color }));
    line.position.set(x, y, z - 25);
    line.rotation.set(rx, ry, rz);
    line.scale.set(s, s, s);
    return line
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
        this.color = t.color || '#aaaaaa' // 平面物体颜色
        this.textColor = t.textColor || '#333333' // 文本颜色

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
            isTemplate: true
        }
    }

    toJson = () => {
        return Object.assign({}, this.toTemplate(), {
            id: this.id, name: this.name,
            position: [...this.position.toArray()],
            rotate: this.rotate,
            isTemplate: false
        })
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
    build = async ({ mode, loader, edit = false }) => {
        this.group.clear()

        const is3d = mode === '3d'

        let group = this.group

        let model2d = this.#build2d(await loader.load(this.model2d))
        let model3d = this.#build3d(await loader.load(this.model3d))

        const maxLen = Math.max(this.size[0], this.size[1])

        // 碰撞体积
        let box;
        if (mode === '3d') box = MetaObject.buildBox(this.size, this.color)
        else {
            box = MetaObject.buildRect(this.size[0], this.size[1], this.color, !edit)
            box.position.z += 0.1
        }
        if (edit) {
            // 编辑模式，必显示碰撞体积
            box.visible = true
        } else if (model2d || model3d) {
            box.visible = false
        }
        box._visible = box.visible

        group.add(box)
        let name = this.isTemplate ? this.tname : this.name
        let text = MetaObject.buildText(name,
            await loader.loadFont(), 0.6, this.textColor)
        text.visible = box.visible && (this.showLabel || this.isTemplate)
        text.rotation.set(...this.rotate.map(x => -toRad(x)))
        function strLen(str) {
            var count = 0;
            for (let i = 0, len = str.length; i < len; i++)
                count += str.charCodeAt(i) < 256 ? 1 : 2;
            return count;
        }
        let len = strLen(name)
        let textScale = 1
        if (len > Math.min(this.size[0], this.size[1]) && !this.isTemplate) {
            textScale = Math.min(this.size[0], this.size[1]) / len * 1.5
            text.scale.multiplyScalar(textScale)
        }
        text.position.set(-this.size[0] / 2 + 0.2 * textScale, this.size[1] / 2 - 0.9 * textScale,
            is3d ? this.size[2] : 0.2)
        group.add(text)

        if (mode === '2d') {
            if (model2d) group.add(model2d)
            else if (model3d) {
                group.add(model3d)
            }
        } else if (mode === '3d') {
            if (model3d || model2d) group.add(model3d || model2d)
        }

        group.scale.set(1, 1, 1)
        group.rotation.set(...this.rotate.map(toRad))
        this.position.z = 0 // 不考虑 z 轴，默认所有都落地
        group.position.set(this.position.x, this.position.y, 0)

        var rect = null
        if (this.isTemplate) {
            // 模板只有在编辑模式才显示
            this.group.visible = edit
            // 将文本置于模型底部
            text.position.set(-1.8, -2.3, 0)
            // 限制模型大小到 2 以下
            rect = MetaObject.buildRect(4.5, 4.5, 0x999999)
            rect.position.y -= 0.5
            if (maxLen > 2) {
                group.scale.multiplyScalar(2 / maxLen)
                text.scale.multiplyScalar(maxLen / 2)
                text.position.multiplyScalar(maxLen / 2)
                rect.scale.multiplyScalar(maxLen / 2)
                rect.position.multiplyScalar(maxLen / 2)
            }

            group.add(rect)
        }
        if (!is3d) {
            group.scale.z = 0.1
        }
        return group
    }

    /**
     * highlight this
     * @param {string} color 
     */
    highlight = (color) => {
        this.group.children[0].visible = true
        let mesh = this.group.children[0]
        if (!('material' in mesh)) mesh = mesh.children[0]
        mesh.material.color.set(color)
    }

    delight = () => {
        this.highlight(this.color)
        this.group.children[0].visible = this.group.children[0]._visible
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

    static buildRect(width, height, color, showPlane = false) {
        const points = []
        points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
        points.push(new THREE.Vector3(-width / 2, height / 2, 0))
        points.push(new THREE.Vector3(width / 2, height / 2, 0))
        points.push(new THREE.Vector3(width / 2, -height / 2, 0))
        points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
        let line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: color, linewidth: 2 })
        )

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, visible: showPlane }))

        let group = new THREE.Group()
        group.add(
            line,
            plane
        )
        return group
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

        if (this.rotate3d) object.rotation.set(...this.rotate3d.map(toRad))
        // shrink to size
        let box = new THREE.Box3().setFromObject(object)
        let size = box.max.sub(box.min)
        const scalar = Math.min(this.size[0], this.size[1]) / Math.max(size.x, size.y)
        object.scale.multiplyScalar(scalar)
        object.position.z = size.z / 2 * scalar
        return object
    }
}


