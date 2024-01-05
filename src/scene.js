import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

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
        this.dispose()

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
        })

        // 加载物体
        objects.forEach(this.addObject)

        if (mode !== 'edit') {
            return this.render()
        }

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
        objectControl.translationSnap = 0.25
        objectControl.rotationSnap = 0.25 / Math.PI
        objectControl.setScaleSnap(0.5)
        objectControl.space = 'local'
        objectControl.addEventListener('change', this.render)
        objectControl.addEventListener('dragging-changed', (event) => {
            orbitControl.enabled = !event.value
        })
        // objectControl.position.y += 3 
        scene.add(objectControl)
        this.curObject = null

        // 加载模板
        templates.forEach(async (x, i) => {
            let object = await this.addObject(Object.assign({}, x, {
                position: [i % 2 == 0 ? -12 : -6, height - Math.floor(i / 2) * 4 - 2, 0],
                showLabel: true, isTemplate: true
            }))
            // move text
            object.children[1].position.y -= 1.5
        })

        this.render()
    }

    buildPanel = () => {
        const that = this
        if (this.panel) return
        this.panel = new Vue({
            el: "#objectPanel",
            data() {
                return {
                    object: null,
                    /**
                     * object.meta --> meta
                     * 修改 meta 后先去修改 object3d 的表现
                     * 点击保存时，再将 meta 变动保存到 object.meta
                     * 点击重置时，应用 object.meta 去修改 object3d
                     */
                    meta: {
                        id: '',
                        tname: '', // 模板中文名称（类型） 
                        name: '',
                        size: [1, 1, 1],
                        rotate: [0, 0, 0],
                        rotate2d: [0, 0, 0],
                        rotate3d: [0, 0, 0],
                        model2d: '',
                        model3d: '',
                        isTemplate: false
                    },
                }
            },
            methods: {
                setObject(object) {
                    if (this.object === object) return
                    this.object = object
                    if (!object) return
                    this.meta = this.object.meta.toJson()
                },
                applyChange() {

                },
                onSave() {
                    if (!this.object) return
                    that.saveObject(this.object)
                },
                async onCopy() {
                    if (!this.object) return
                    let meta = this.meta.isTemplate ? that.templates[this.object.meta.tid] : this.object.meta.toJson()
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
                }
            }
        })
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
        if (!object.meta.isTemplate) this.objectControl.attach(object)
        this.panel.setObject(object)
        this.render()
    }

    /**
     * 取消对物体的控制
     * @param {THREE.Object3D} object 
     * @returns 
     */
    detachObject = (object) => {
        if (!object) return
        if (this.objectControl.object === object) {
            this.objectControl.detach();
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
    }

    onPointerUp = (event) => {
        if (event.target.tagName !== 'CANVAS') return
        this.onUpPosition.set(event.clientX, event.clientY)
        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            this.detachObject(this.curObject)
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
            if (objects[0] !== this.curObject && !this.objectControl.dragging) {
                this.attachObject(objects[0])
                this.panel.$el.style.left = (event.clientX + 30) + 'px'
                this.panel.$el.style.top = (event.clientY - 15) + 'px'
            }
        }
        if (this.objectControl.dragging && this.objectControl.mode === 'translate') {
            this.panel.$el.style.left = (event.clientX + 30) + 'px'
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

    dispose = () => {
        if (this.renderer) {
            this.scene.clear()
            this.panel.setObject(null)
            this.renderer.domElement.remove()
            this.renderer.dispose()
        }
    }
}