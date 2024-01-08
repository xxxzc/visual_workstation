import * as THREE from 'three'

function addLineShape( shape, color, x, y, z, rx, ry, rz, s ) {
    // lines
    shape.autoClose = true;
    const points = shape.getPoints();
    const geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
    // solid line
    let line = new THREE.Line( geometryPoints, new THREE.LineBasicMaterial( { color: color } ) );
    line.position.set( x, y, z );
    line.rotation.set( rx, ry, rz );
    line.scale.set( s, s, s );
    return line
}

function addShape( shape, color, x, y, z, rx, ry, rz, s ) {
    let geometry = new THREE.ShapeGeometry( shape );
    let mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: color } ) );
    mesh.position.set( x, y, z );
    mesh.rotation.set( rx, ry, rz );
    mesh.scale.set( s, s, s );
    return mesh
}

function roundedRect( x, y, width, height, radius ) {
    let ctx = new THREE.Shape()
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

export default function RoundPlane(width, height, radius, color, lineOnly=false) {
    let shape = roundedRect(0, 0, width, height, radius)
    let func = lineOnly ? addLineShape : addShape
    let plane = func(shape, color, 0, 0, 0, 0, 0, 0, 1)
    return plane
}