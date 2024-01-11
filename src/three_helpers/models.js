import * as THREE from 'three'

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

const MeshBasicMaterialOption = { 
    color: 0xffffff, opacity: 1, transparent: true, visible: true 
}

function splitColor(color) {
    if (color && typeof color === 'string') {
        if (color.startsWith('#') && color.length === 9) {
            return [color.slice(0, 7), parseInt(color.slice(7), 16) / 255]
        }
    }
    return [color, 1.0]
}

/**
 * 处理选项
 * @returns {Object}
 */
function processOptions(...options) {
    options = Object.assign({}, ...options.map(x => x || {}))
    let [color, opacity] = splitColor(options.color)
    options.color = color
    if (options.opacity === 1)
        options.opacity = opacity
    return options
}

function meshBasicMaterial(option) {
    option = processOptions(MeshBasicMaterialOption, option)
    return new THREE.MeshBasicMaterial(option)
}

/**
 * 绘制 2d 平面
 * @param {number} width 
 * @param {number} height 
 * @param {Object} options 
 * @returns {THREE.Object3D}
 */
function plane(width, height, options) {
    return new THREE.Mesh(
        new THREE.PlaneGeometry(width || 1, height || 1),
        meshBasicMaterial(options)
    )
}

/**
 * 绘制 3d 立方体
 * @param {number[]} size 
 * @param {Object} options 
 * @returns {THREE.Object3D}
 */
function box(size, options) {
    let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size), 
        meshBasicMaterial(options))
    mesh.position.z = size[2] / 2
    return mesh
}

/**
 * 绘制文字
 * @param {string} content 
 * @param {Object} font
 * @param {number} size
 * @param {Object} options 
 * @returns {THREE.Object3D}
 */
function text(content, font, size, color) {
    size = size || 0.5
    return new THREE.Mesh(
        new TextGeometry(content, { font, size, height: 0.1 }), 
        meshBasicMaterial({ color })
    )
}

/**
 * 绘制边框
 * @param {number} width 
 * @param {number} height 
 * @param {any} color 
 * @returns {THREE.Object3D}
 */
function border(width, height, color) {
    const points = []
    points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
    points.push(new THREE.Vector3(-width / 2,  height / 2, 0))
    points.push(new THREE.Vector3( width / 2,  height / 2, 0))
    points.push(new THREE.Vector3( width / 2, -height / 2, 0))
    points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
    // 边框颜色不支持透明度（应该，没研究过）
    if (color instanceof String) color = color.slice(0, 7)
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points), 
        new THREE.LineBasicMaterial({color})
    )
}

/**
 * 绘制边框
 * @param {number} width 
 * @param {number} height 
 * @param {any} color 
 * @returns {THREE.Object3D}
 */
function fatborder(width, height, color, linewidth) {
    linewidth = linewidth || 0.1
    let planeL = plane(linewidth, height, { color })
    let planeU = plane(width, linewidth, { color })
    let planeR = planeL.clone()
    let planeD = planeU.clone()
    planeL.position.x = -width / 2 + linewidth / 2
    planeR.position.x = width / 2 - linewidth / 2
    planeU.position.y = height / 2 - linewidth / 2
    planeD.position.y = -height / 2 + linewidth / 2
    const line = new THREE.Group()
    line.add(planeL, planeU, planeR, planeD)
    return line
}

function circular(radius, color) {
    const geometry = new THREE.CircleGeometry( radius, 32 )
    const material = new THREE.MeshBasicMaterial( { color } )
    const circle = new THREE.Mesh( geometry, material )
    return circle
}

export default {
    plane, box, text, border, fatborder, circular
}