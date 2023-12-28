import * as THREE from 'three'

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
        cell = 1, colorMain = 0x444444, colorSub = 0x888888
    }) {
        colorMain = new THREE.Color(colorMain);
        colorSub = new THREE.Color(colorSub);

        const vertices = [], colors = [];
        for (let i = 0, j = 0; i <= Math.max(width, height); i += cell) {
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
