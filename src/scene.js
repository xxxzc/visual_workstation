import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { generateUUID } from 'three/src/math/MathUtils.js';

import MetaObject from './metaobject.js'
import Grid from './three_helpers/grid.js'
import Loader from './three_helpers/loader.js'

export default class Scene {

    /**
     * @param {Object} data
     * @param {number[]} data.size 
     * @param {Object[]} data.objects
     * @param {Object[]} data.templates 
     * @param {string} mode 
     */
    async build({ size, objects, templates }, mode = "2d") {
        this.data = arguments[0]
        this.size = size
        const width = size[0]
        const height = size[1]
        this.mode = mode // 展示模式

        // 相机
        const camera = this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
        camera.position.set(width / 3, height / 2, width * 1.3)
        // 场景
        const scene = this.scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf0f0f0)
        // 网格线
        const grid = this.grid = new Grid(width, height, {})
        scene.add(grid)
        // 平面
        const geometry = new THREE.PlaneGeometry(width, height, width, height)
        const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }))
        scene.add(plane)

        this.buildLight() // 灯光
        this.buildPanel() // 物体控制面板

        // 渲染器
        const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(renderer.domElement)

        window.addEventListener('resize', this.onWindowResize)

        // 轨道控制器，控制场景的缩放、旋转和移动
        const orbitControl = this.orbitControl = new OrbitControls(camera, renderer.domElement)
        orbitControl.enablePan = true
        orbitControl.target.set(width / 3, height / 2, 0)
        orbitControl.update()
        orbitControl.addEventListener('change', this.render)

        this.raycaster = new THREE.Raycaster()
        this.pointer = new THREE.Vector2()
        this.onUpPosition = new THREE.Vector2()
        this.onDownPosition = new THREE.Vector2()
        document.addEventListener('pointerdown', this.onPointerDown);
        document.addEventListener('pointerup', this.onPointerUp);
        document.addEventListener('pointermove', this.onPointerMove);

        // 物体移动控制器
        const moveControl = this.moveControl = new TransformControls(camera, renderer.domElement);
        moveControl.size = 0.4
        moveControl.showZ = false
        moveControl.translationSnap = 0.5
        moveControl.rotationSnap = 1 / Math.PI
        moveControl.setScaleSnap(0.5)
        moveControl.space = 'local'
        moveControl.addEventListener('change', this.render)
        moveControl.addEventListener('dragging-changed', (event) => {
            orbitControl.enabled = !event.value
            console.log(moveControl.object)
        })
        // moveControl.position.y += 3 
        scene.add(moveControl)

        const rotateControl = this.rotateControl = new TransformControls(camera, renderer.domElement);
        rotateControl.enabled = false
        rotateControl.size = 0.2
        rotateControl.mode = 'rotate'
        rotateControl.addEventListener('change', this.render)
        rotateControl.addEventListener('dragging-changed', (event) => {
            orbitControl.enabled = !event.value
        })
        // scene.add(rotateControl)

        // 先加载所有模型
        this.loader = new Loader()
        await this.loader.loadMany(
            objects.map(x => x.model2d).concat(objects.map(x => x.model3d))
                .concat(templates.map(x => x.model2d)).concat(templates.map(x => x.model3d))
        )
        this.objects = []

        // 加载模板
        this.templates = {}
        templates.forEach((x, i) => {
            this.templates[x.tid] = x
            this.addObject(Object.assign({}, x, {
                position: [-4, height - i * 2 - 2, 0], showLabel: true
            }))
        })
        // 加载物体
        objects.forEach(this.addObject)
        this.render()

        window.addEventListener('keydown', (event) => {
            console.log(event)
            switch (event.key) {
                case 'r':
                    this.panel.setMode('rotate')
                    break
                case 's':
                    this.panel.setMode('scale')
                    break
                case 't':
                    this.panel.setMode('translate')
                    break
                case 'Escape':
                    this.moveControl.reset()
                    break
            }
        })
    }

    buildPanel = () => {
        const that = this
        this.panel = new Vue({
            el: "#panel",
            data() {
                return {
                    /**
                     * @type {THREE.Object3D} object
                     */
                    object: null,
                    mode: 'translate'
                }
            },
            watch: {
                mode(value) {
                    if (value === 'rotate') {
                        that.moveControl.showX = false
                        that.moveControl.showY = false
                        that.moveControl.showZ = true
                    } else if (value === 'scale') {
                        that.moveControl.showX = true
                        that.moveControl.showY = true
                        that.moveControl.showZ = false
                    } else {
                        that.moveControl.showZ = false
                        that.moveControl.showX = true
                        that.moveControl.showY = true
                    }
                    that.moveControl.mode = value
                }
            },
            methods: {
                setObject(object) {
                    if (this.object === object) return
                    this.object = object
                },
                setMode(mode) {
                    this.mode = mode
                },
                onSave() {
                    that.updateObject(this.object)
                },
                onCopy() {
                    let meta = Object.assign({ id: generateUUID().replace(/-/g, '') }, this.object.meta.toJson())
                    that.addObject(meta)
                },
                onReset() {
                    that.resetObject(this.object)
                },
                onDelete() {
                    that.removeObject(this.object)
                    this.object = null
                }
            }
        })
    }

    switchMode = (mode) => {
        this.mode = mode
        let objects = [...this.objects]
        objects.forEach(this.resetObject)
    }

    addObject = async (meta) => {
        let metaObject = new MetaObject({ id: generateUUID() }, this.templates[meta.tid], meta)
        /**
         * @type {THREE.Object3D} object
         */
        let object = await metaObject.build(this.mode, this.loader)

        this.objects.push(object)
        this.scene.add(object)
        this.render()
    }

    detachObject = (object) => {
        if (this.moveControl.object === object) {
            this.moveControl.detach();
            this.rotateControl.detach();
        }
        this.panel.setObject(null)
        this.render();
    }

    removeObject = (object) => {
        this.objects.splice(this.objects.indexOf(object), 1)
        this.detachObject(object)
        this.scene.remove(object)
        this.render()
    }

    resetObject = (object) => {
        this.removeObject(object)
        this.addObject(object.meta)
    }

    updateObject = (object) => {
        object.meta.update(object)
        this.resetObject(object)
    }

    /**
     * 将物体对齐到网格上
     * @param {THREE.Object3D} object 
     */
    alignToGrid = (object) => {
        const size = object.meta.size
        object.position.multiplyScalar(4).round().divideScalar(4)
        object.position.z = size[2] / 2
    }

    onPointerDown = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.onDownPosition.set(event.clientX, event.clientY)
    }

    onPointerUp = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.onUpPosition.set(event.clientX, event.clientY)
        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            this.detachObject(this.moveControl.object)
        }
    }

    onPointerMove = (event) => {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);
        if (intersects.length > 0) {
            let object = intersects[0].object
            // object with meta is the object we built
            while (!object.meta) object = object.parent
            if (object !== this.moveControl.object) {
                this.currentObject = object
                this.moveControl.attach(object);
                this.rotateControl.attach(object);
                this.panel.setObject(this.moveControl.object)
                this.panel.$el.style.left = (event.clientX + 50) + 'px'
                this.panel.$el.style.top = (event.clientY - 10) + 'px'
            }
        }
        if (this.moveControl.dragging && this.moveControl.mode === 'translate') {
            this.panel.$el.style.left = (event.clientX + 50) + 'px'
            this.panel.$el.style.top = (event.clientY - 10) + 'px'
        }

    }

    render = () => {
        this.renderer.render(this.scene, this.camera)
    }

    buildLight() {
        let ambientLight = new THREE.AmbientLight(0x606060, 3)
        this.scene.add(ambientLight)
        let directionalLight = new THREE.DirectionalLight(0xffffff, 3)
        directionalLight.position.set(1, 0.75, 0.5).normalize()
        this.scene.add(directionalLight)
    }

    onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.render()
    }

    saveAll = () => {
        this.data.objects = this.objects.map(obj => {
            // obj.meta.x = obj.position.x - obj.meta.width / 2
            // obj.meta.y = obj.position.y - obj.meta.height / 2
            return obj.meta
        })

        fetch("http://localhost:8000/save", {
            method: "POST",
            body: JSON.stringify(this.data)
        })
    }
}