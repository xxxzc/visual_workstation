import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { generateUUID } from 'three/src/math/MathUtils.js';

import MetaObject from './metaobject.js'
import Grid from './three_helpers/grid.js'
import Loader from './three_helpers/loader.js'

function toRad(x) {
    return Math.PI * x / 180
}

function toDeg(x) {
    return Math.round(x * 180 / Math.PI)
}

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
        this.objects = []

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
        const objectControl = this.objectControl = new TransformControls(camera, renderer.domElement);
        objectControl.size = 0.4
        objectControl.showZ = false
        objectControl.translationSnap = 0.5
        objectControl.rotationSnap = 0.25 / Math.PI
        objectControl.setScaleSnap(0.5)
        objectControl.space = 'local'
        objectControl.addEventListener('change', this.render)
        objectControl.addEventListener('dragging-changed', (event) => {
            orbitControl.enabled = !event.value
        })
        // objectControl.position.y += 3 
        scene.add(objectControl)

        const templateControl = this.templateControl = new TransformControls(camera, renderer.domElement);
        templateControl.size = 0.2
        templateControl.mode = 'rotate'
        templateControl.addEventListener('change', this.render)
        templateControl.addEventListener('dragging-changed', (event) => {
            orbitControl.enabled = !event.value
        })
        scene.add(templateControl)

        // 先加载所有模型
        this.loader = new Loader()
        await this.loader.loadMany(
            objects.map(x => x.model2d).concat(objects.map(x => x.model3d))
                .concat(templates.map(x => x.model2d)).concat(templates.map(x => x.model3d))
        )

        // 加载模板
        this.templates = {}
        templates.forEach((x, i) => {
            this.templates[x.tid] = x
            this.addObject(Object.assign({}, x, {
                position: [i % 2 == 0 ? -12 : -6, height - Math.floor(i/2) * 4 - 2, 0], 
                showLabel: true, isTemplate: true
            }))
        })
        // 加载物体
        objects.forEach(this.addObject)

        this.curObject = null
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
                    this.objectControl.reset()
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
                    object: null,
                    mode: 'translate',
                    isTemplate: false,
                    rotate: [0, 0, 0]
                }
            },
            watch: {
                mode(value) {
                    if (value === 'rotate') {
                        that.objectControl.showX = false
                        that.objectControl.showY = false
                        that.objectControl.showZ = true
                    } else if (value === 'scale') {
                        that.objectControl.showX = true
                        that.objectControl.showY = true
                        that.objectControl.showZ = false
                    } else {
                        that.objectControl.showZ = false
                        that.objectControl.showX = true
                        that.objectControl.showY = true
                    }
                    that.objectControl.mode = value
                }
            },
            methods: {
                setObject(object) {
                    if (this.object === object) return
                    this.object = object
                    if (!object) return
                    this.rotate = this.object.rotation.toArray().slice(0, 3).map(toDeg)
                    this.isTemplate = this.object && this.object.meta.isTemplate
                },
                setMode(mode) {
                    this.mode = mode
                },
                onSave() {
                    if (!this.object) return
                    that.saveObject(this.object)
                },
                async onCopy() {
                    if (!this.object) return
                    let meta = this.object.meta.toJson()
                    meta.position = this.object.position.toArray()
                    meta.position[0] += 4
                    meta.id = ''
                    that.detachObject(this.object)
                    that.attachObject(await that.addObject(meta))
                },
                onReset() {
                    if (!this.object) return
                    that.resetObject(this.object)
                },
                onDelete() {
                    if (!this.object) return
                    that.removeObject(this.object)
                    this.object = null
                },
                onRotate() {
                    // this.object.rotation.set(...this.rotate.map(toRad))
                    that.render()
                },
                toRad(x) {
                    return Math.PI * x / 180
                },
                toDeg(x) {
                    return Math.round(x * 180 / Math.PI)
                }
            }
        })
    }

    /**
     * 选择展示模式
     */
    switchMode = (mode) => {
        this.mode = mode
        let objects = [...this.objects]
        objects.forEach(this.resetObject)
    }

    addObject = async (meta) => {
        let metaObject = new MetaObject(this.templates[meta.tid], meta)
        /**
         * @type {THREE.Object3D} object
         */
        let object = await metaObject.build(this.mode, this.loader)
        this.objects.push(object)
        this.scene.add(object)
        this.render()
        return object
    }

    attachObject = (object) => {
        if (!object) return
        if (this.curObject === object) return
        this.curObject = object
        if (object.meta.isTemplate) this.templateControl.attach(object)
        else this.objectControl.attach(object)
        this.panel.setObject(object)
        this.render()
    }

    detachObject = (object) => {
        if (!object) return
        if (this.objectControl.object === object) {
            this.objectControl.detach();
        }
        if (this.templateControl.object === object) {
            this.templateControl.detach();
        }
        this.curObject = null
        this.panel.setObject(null)
        this.render();
    }

    removeObject = (object) => {
        if (!object) return
        this.objects.splice(this.objects.indexOf(object), 1)
        this.detachObject(object)
        this.scene.remove(object)
        this.render()
    }

    resetObject = (object) => {
        if (!object) return
        this.removeObject(object)
        this.addObject(object.meta)
    }

    saveObject = (object) => {
        if (!object) return
        object.meta.update(object)
        this.resetObject(object)
    }

    onPointerDown = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.onDownPosition.set(event.clientX, event.clientY)
        if (this.curObject) console.log(this.curObject)
    }

    onPointerUp = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.onUpPosition.set(event.clientX, event.clientY)
        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            this.detachObject(this.objectControl.object)
        }
    }

    onPointerMove = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.objects, true);
        if (intersects.length > 0) {
            let objects = intersects.map(x => {
                let object = x.object
                let cnt = 10
                while (!object.meta && cnt--) object = object.parent
                return object
            })
            if (objects[0] !== this.curObject && !this.objectControl.dragging && !this.templateControl.dragging) {
                this.attachObject(objects[0])
                this.panel.$el.style.left = (event.clientX + 50) + 'px'
                this.panel.$el.style.top = (event.clientY - 15) + 'px'
            }
        }
        if (this.objectControl.dragging && this.objectControl.mode === 'translate') {
            this.panel.$el.style.left = (event.clientX + 50) + 'px'
            this.panel.$el.style.top = (event.clientY - 15) + 'px'
        }

        // 当前指针移出一定范围时，隐藏选择的 object
        if (this.curObject) {
            let p2 = this.curObject.position.clone().project(this.camera)
            // console.log(this.pointer.distanceTo(p2))
            if (this.pointer.distanceTo(p2) > 0.25) {
                this.detachObject(this.curObject)
            }
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
            return obj.meta.toJson()
        })

        fetch("http://localhost:8000/save", {
            method: "POST",
            body: JSON.stringify(this.data)
        })
    }   
}