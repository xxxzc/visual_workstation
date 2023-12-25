import * as THREE from 'three'

import { GLTFLoader } from './lib/three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from './lib/three/addons/geometries/TextGeometry.js';
import { FontLoader } from './lib/three/addons/loaders/FontLoader.js';

const fontLoader = new FontLoader()
const gltfLoader = new GLTFLoader()
var fontObj = undefined // 字体文件对象

class Template {
    constructor(t) {
        this.category = t.category // 模板类别

        this.tid = t.tid // 模板id
        this.name = t.name // 模板名称

        this.size = t.size // 物体尺寸
        this.color = t.color // 平面物体颜色
        this.text = t.text // 平面物体标签

        this.model = t.model // 立体模型
        this.scale = t.scale // 立体模型缩放
    }
}

const Mode = {
    Edit: "编辑模式", // 编辑模式
    Text: "平面预览", // 2D展示
    Model: "立体展示" // 3D展示
}

class ObjMeta extends Template {
    constructor(o, t) {
        let ot = Object.assign({}, o || {}, t || {})
        super(ot)
        this.id = ot.id // 物体id
        this.position = ot.position // 物体位置
    }

    build = (mode) => {
        // @type {THREE.Object3D} obj
        let obj
        if (mode === Mode.Edit) {
            obj = this.buildEdit()
        }
        obj.position.set(...this.position)
        return obj
    }

    buildEdit = () => {
        return Box(this)
    }
}


/**
 * 基本 3D 盒子
 * @param {ObjMeta} meta
 * @returns 
 */
function Box(meta) {
    const geometry = new THREE.BoxGeometry(...meta.size)
    const material = new THREE.MeshBasicMaterial({ color: meta.color })
    return new THREE.Mesh(geometry, material)
}

function strLen(str) {
    var count = 0;
    for (var i = 0, len = str.length; i < len; i++)
        count += str.charCodeAt(i) < 256 ? 1 : 2;
    return count;
}

/**
 * 基本文字
 * @param {*} param0 
 * @returns 
 */
async function Text({ width, height, text = "自定义", color = "#aabbcc" }) {
    const group = new THREE.Group()

    if (text) {
        if (!fontObj) fontObj = await fontLoader.loadAsync('fonts/AlibabaPuHuiTi_Regular.json')

        function Text(t, y) {
            let mesh = new THREE.Mesh(
                new TextGeometry(t, {
                    font: fontObj, size: 0.3, height: 0.1
                }), new THREE.MeshBasicMaterial({ color: 0x000000 })
            )
            mesh.position.set(-width / 2, y, 0.5)
            return mesh
        }
        let length = strLen(text)
        let per = width * 3
        if (length != text.length)
            per = width * 2
        let offset = length > per ? 0.1 : 0

        group.add(Text(text.slice(0, per), offset))
        if (length > per) {
            const text2 = Text(text.slice(per), offset - height / 2)
            group.add(text2)
        }
    }
    return group
}

async function TextBox(object) {
    let group = await Text(object)
    group.add(Box(object))
    return group
}

/**
 * 修改已支持长宽不一致的网格
 */
class MyGridHelper extends THREE.LineSegments {

    constructor(width, height, colorMain = 0x444444, colorSub = 0x888888) {
        colorMain = new THREE.Color(colorMain);
        colorSub = new THREE.Color(colorSub);

        const vertices = [], colors = [];
        for (let i = 0, j = 0; i <= Math.max(width, height); i += 2) {
            if (i <= height) {
                vertices.push(0, i, 0, width, i, 0);
                const color = i === height / 2 || i == 0 || i == height ? colorMain : colorSub;
                color.toArray(colors, j); j += 3;
                color.toArray(colors, j); j += 3;
            }
            if (i <= width) {
                vertices.push(i, 0, 0, i, height, 0);
                const color = i === width / 2 || i == 0 || i == width ? colorMain : colorSub;
                color.toArray(colors, j); j += 3;
                color.toArray(colors, j); j += 3;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const material = new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false });
        super(geometry, material);
        this.type = 'GridHelper';
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }

}

export default { THREE, TextBox, Box, MyGridHelper }