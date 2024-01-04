import * as THREE from 'three'

import { TextGeometry } from '../../lib/three/addons/geometries/TextGeometry.js';
import { FontLoader } from '../../lib/three/addons/loaders/FontLoader.js';

const fontLoader = new FontLoader()
var fontObj = undefined // 字体文件对象

/**
 * 基本文字
 * @returns 
 */
export default async function Text({ size, text = "自定义", color = "#aabbcc" }) {
    const group = new THREE.Group()
    let width = size[0]
    let height = size[1]
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

        function strLen(str) {
            var count = 0;
            for (let i = 0, len = str.length; i < len; i++)
                count += str.charCodeAt(i) < 256 ? 1 : 2;
            return count;
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
