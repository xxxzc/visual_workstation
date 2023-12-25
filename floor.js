import * as THREE from 'three'
import { OrbitControls } from './lib/three/addons/controls/OrbitControls.js';
import { DragControls } from './lib/three/addons/controls/DragControls.js';

import helper from './objecter.js'

const Mode = {
    Edit: "Edit", Text: "Text", Model: "Model"
}

export default class Floor {
    /**
     * 
     * @param {Object} data 
     * @param {string} mode 
     */
    init({ width, height, objects, templates }, mode) {
        this.width = width
        this.height = height
        this.mode = mode // 展示模式

        // 相机
        const camera = this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
        camera.position.set(0, 0, 50)
        camera.lookAt(0, 0, 0)

        const scene = this.scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf0f0f0)

        const grid = this.grid = helper.MyGridHelper(width, height)
        scene.add(grid)

        const geometry = new THREE.PlaneGeometry(width, height, width, height)
        const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }))
        scene.add(plane)
    
        let ambientLight = new THREE.AmbientLight(0x606060, 3)
        scene.add(ambientLight)
        let directionalLight = new THREE.DirectionalLight(0xffffff, 3)
        directionalLight.position.set( 1, 0.75, 0.5 ).normalize()
		scene.add(directionalLight)

        const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
		renderer.setSize(window.innerWidth, window.innerHeight)
		document.body.appendChild(renderer.domElement)

        const orbitControl = this.orbitControl = new OrbitControls(camera, renderer.domElement)
        orbitControl.enablePan = false

        this.objects = []
        const dragControl = this.dragControl = new DragControls(this.objects, camera, renderer.domElement)
        dragControl.addEventListener('hoveron', () => {
            orbitControl.enableRotate = false
        })
        dragControl.addEventListener('drag', (e) => {
            console.log(e)
        })
        dragControl.addEventListener('dragend', () => {
            orbitControl.enableRotate = true
        })

        window.addEventListener( 'resize', this.onWindowResize )
    }

    addObject = (meta) => {
        
    }

    onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize( window.innerWidth, window.innerHeight )
    }

    render = () => {
        this.renderer.render(this.scene, this.camera)
    }
}