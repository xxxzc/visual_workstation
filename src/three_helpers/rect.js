import * as THREE from 'three'

function roundedRect( x, y, width, height, radius ) {
    let ctx = new THREE.Shape()
    x -= width / 2
    y -= height / 2
    ctx.moveTo( x, y + radius );
    ctx.lineTo( x, y + height - radius );
    ctx.quadraticCurveTo( x, y + height, x + radius, y + height );
    ctx.lineTo( x + width - radius, y + height );
    ctx.quadraticCurveTo( x + width, y + height, x + width, y + height - radius );
    ctx.lineTo( x + width, y + radius );
    ctx.quadraticCurveTo( x + width, y, x + width - radius, y );
    ctx.lineTo( x + radius, y );
    ctx.quadraticCurveTo( x, y, x, y + radius );
    return ctx
}

/**
 * 构建平面
 * @param {number} width 
 * @param {number} height 
 * @param {number} radius 
 * @param {string} borderColor 
 * @param {string} planeColor 
 * @param {boolean} showBorder 
 * @param {boolean} showPlane 
 * @returns {THREE.Object3D}
 */
export default function Rect(width, height, radius = 0, borderColor = '#333333', planeColor = '#ffffff', showBorder = true, showPlane = true) {
    const group = new THREE.Group()
    if (radius > 0) {
        const shape = roundedRect(0, 0, width, height, radius)
        shape.autoClose = true
        if (showBorder) {
            group.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(shape.getPoints()), 
                new THREE.LineBasicMaterial({ color: planeColor })
            ))
        }
        if (showPlane) {
            group.add(new THREE.Mesh(
                new THREE.ShapeGeometry( shape ),
                new THREE.MeshPhongMaterial( { color: borderColor } ) 
            ))
        }
        return group
    } 
    
    if (showBorder) {
        const points = []
        points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
        points.push(new THREE.Vector3(-width / 2,  height / 2, 0))
        points.push(new THREE.Vector3( width / 2,  height / 2, 0))
        points.push(new THREE.Vector3( width / 2, -height / 2, 0))
        points.push(new THREE.Vector3(-width / 2, -height / 2, 0))
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: borderColor || 0x333333, linewidth: 1, visible: showBorder })
        )
        group.add(line)
    }

    if (showPlane) {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: planeColor || 0xffffff, opacity: 0.8, transparent: true, visible: showPlane })
        )
        group.add(plane)
    }
    return group
}