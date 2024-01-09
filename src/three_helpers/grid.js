import * as THREE from 'three'

/**
 * 构建平面网格
 */
export default class Grid extends THREE.LineSegments {
    /**
     * 修改默认的 GridHelper 已支持长宽不一致的网格
     * @param {number} width 宽度
     * @param {number} height 长度
     * @param {object} options 参数选项
     * @param {number} options.cell 单元格大小，默认为 1
     * @param {string} options.colorMain 中轴线颜色
     * @param {string} options.colorSub 辅助线颜色
     */
    constructor(width, height, {
        cell = 1, colorMain = 0x999999, colorSub = 0xcccccc
    }) {
        colorMain = new THREE.Color(colorMain);
        colorSub = new THREE.Color(colorSub);

        const vertices = [], colors = []
        const max = Math.max(width, height)
        for (let i = 0, j = 0; i <= max; i += cell) {
            if (i <= height) {
                vertices.push(0-width/2, i-height/2, 0, width/2, i-height/2, 0);
                const color = i * 2 === height || i === 0 || i === height ? colorMain : colorSub;
                color.toArray(colors, j); j += 3;
                color.toArray(colors, j); j += 3;
            }
            if (i <= width) {
                vertices.push(i-width/2, 0-height/2, 0, i-width/2, height/2, 0);
                const color = i * 2 === width || i === 0 || i === width ? colorMain : colorSub;
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
