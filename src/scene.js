import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import MetaObject from './metaobject.js'
import Grid from './three_helpers/grid.js'
import Loader from './three_helpers/loader.js'

export default class Scene {

    constructor() {
        this.mode = '2d' // 展示模式
        this.edit = true // 是否启用编辑
        this.size = [50, 50, 4] // 场景大小

        /** @type {THREE.Object3D[]} */
        this.objects = [] // 场景的所有物体
        this.curObject = null

        this.templates = {} // 场景的所有模板

        this.loader = new Loader() // 模型加载器

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0xf0f0f0)

        this.buildLight() // 灯光

        this.renderer = new THREE.WebGLRenderer({ antialias: true })

        this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement)
        this.orbitControl.addEventListener('change', this.render)

        this.raycaster = new THREE.Raycaster()
        this.pointer = new THREE.Vector2()
        this.onUpPosition = new THREE.Vector2()
        this.onDownPosition = new THREE.Vector2()

        document.addEventListener('pointerdown', this.onPointerDown)
        document.addEventListener('pointerup', this.onPointerUp)
        document.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('resize', this.onWindowResize)

        this.objectControl = new TransformControls(this.camera, this.renderer.domElement)
        const objectControl = this.objectControl
        objectControl.size = 0.4
        objectControl.showZ = false
        objectControl.translationSnap = 0.25
        objectControl.rotationSnap = 0.25 / Math.PI
        objectControl.setScaleSnap(0.5)
        objectControl.space = 'local'
        objectControl.addEventListener('change', this.render)
        objectControl.addEventListener('dragging-changed', (event) => {
            this.orbitControl.enabled = !event.value
        })
        objectControl.addEventListener('mouseUp', (event) => {
            this.didChange()
        })

        document.body.appendChild(this.renderer.domElement)

        const that = this
        this.panel = new Vue({
            el: "#objectPanel",
            data() {
                return {
                    /** @type {THREE.Object3D}   */
                    object: null,
                    /** @type {MetaObject}  */
                    meta: null,
                    edit: true
                }
            },
            methods: {
                setObject(object) {
                    if (this.object === object) return
                    this.object = object
                    if (!object) return
                    this.meta = object.meta
                },
                async applyChange() {
                    that.didChange()
                    await this.meta.build({
                        mode: that.mode, loader: that.loader, edit: that.edit
                    })
                    that.render()
                },
                async newObject() {
                    if (!this.object) return
                    that.didChange()
                    let meta = this.meta.toJson()
                    meta.position = this.object.position.toArray()
                    meta.position[0] += this.meta.isTemplate ? 4 : this.meta.size[0]
                    meta.id = ''
                    meta.isTemplate = false
                    that.detachObject(this.object)
                    that.attachObject(await that.addObject(meta))
                },
                async newTemplate() {
                    if (!this.object) return
                    that.didChange()
                    let meta = this.meta.toTemplate()
                    meta.id = ''
                    meta.isTemplate = true
                    that.detachObject(this.object)
                    that.attachObject(await that.addTemplate(meta, null))
                },
                onDelete() {
                    if (!this.object) return
                    that.didChange()
                    that.removeObject(this.object)
                    this.object = null
                }
            }
        })
    }

    /**
     * 当数据变化时调用
     * @param {Object} data
     * @param {number[]} data.size 
     * @param {Object[]} data.objects
     * @param {Object[]} data.templates 
     * @param {OBject} ctx
     * @param {Function} ctx.didChange
     * @param {string} ctx.mode 
     * @param {boolean} ctx.edit
     */
    async build({ size, objects, templates }, { didChange, mode = "2d", edit = false }) {
        this.size = size
        const width = size[0]
        const height = size[1]

        this.mode = mode // 展示模式
        this.edit = edit // 编辑模式
        this.panel.edit = edit
        this.didChange = didChange // 场景变化回调函数

        this.camera.position.set(width / 3, height / 2, width * 1.3)

        // 渲染器
        const renderer = this.renderer
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)

        // 轨道控制器，控制场景的缩放、旋转和移动
        const orbitControl = this.orbitControl
        orbitControl.enablePan = true
        orbitControl.target.set(width / 3, height / 2, 0)
        orbitControl.update()

        // 加载所有模型
        await this.loader.loadMany(
            objects.map(x => x.model2d).concat(objects.map(x => x.model3d))
                .concat(templates.map(x => x.model2d)).concat(templates.map(x => x.model3d))
        )

        // 加载模板和物体
        let oldObjects = [...this.objects]
        oldObjects.forEach(this.removeObject)

        this.templates = {}
        templates.forEach(this.addTemplate)
        objects.forEach(this.addObject)

        this.toggleEdit(edit)
    }

    /**
     * 仅切换显示模式，重新构建一下 objects 就行
     * @param {string} mode 
     */
    switchMode = async (mode) => {
        this.mode = mode
        await Promise.all(
            this.objects.map(x => x.meta.build(this))
        )
        this.render()
    }

    /**
     * 仅切换编辑模式
     * @param {boolean} edit 
     */
    toggleEdit = async (edit) => {
        this.edit = edit
        this.panel.edit = edit

        const [width, height, _] = this.size
        const scene = this.scene

        // 编辑模式显示网格
        scene.remove(this.grid)
        const grid = this.grid = new Grid(width, height, {})
        if (edit) scene.add(grid)

        // 展示模式显示平面
        scene.remove(this.plane)
        const geometry = new THREE.PlaneGeometry(width, height, width, height)
        const plane = this.plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: !edit }))
        plane.position.set(width / 2, height / 2, 0)
        scene.add(plane)

        // 物体移动控制器
        this.scene.remove(this.objectControl)
        const objectControl = this.objectControl
        if (edit) scene.add(objectControl)

        // 是否显示模板
        await this.switchMode(this.mode)
        this.objects.forEach(x => {
            if (x.meta.isTemplate) x.visible = edit
        })

        scene.remove(this.templateTitle)
        this.templateTitle = MetaObject.buildText("模板列表", await this.loader.loadFont(), 1)
        this.templateTitle.position.set(-13, height - 3, 0)
        if (edit) scene.add(this.templateTitle)

        this.render()
    }

    addObject = async (meta) => {
        meta = JSON.parse(JSON.stringify(meta))
        let metaObject = new MetaObject(this.templates[meta.tid], meta)
        /**
         * @type {THREE.Object3D} object
         */
        let object = await metaObject.build(this)
        this.objects.push(object)
        this.scene.add(object)
        this.render()
        return object
    }

    addTemplate = async (meta) => {
        let i = Object.keys(this.templates).length
        let x = 0
        const tid = meta.tid
        while (meta.tid in this.templates) {
            meta.tid = tid + String(x)
            x += 1
        }
        this.templates[meta.tid] = JSON.parse(JSON.stringify(meta))
        let object = await this.addObject(Object.assign({}, meta, {
            position: [i % 2 == 0 ? -12 : -6, this.size[1] - Math.floor(i / 2) * 5 - 6, 0],
            isTemplate: true
        }))
        this.render()
        return object
    }

    attachObject = (object) => {
        if (!object) return
        if (this.curObject === object) return
        this.curObject = object
        this.panel.setObject(object)
        this.movePanel()
        if (!object.meta.isTemplate) this.objectControl.attach(object)
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
        if (object.meta.isTemplate) delete this.templates[object.meta.tid]
        this.objects.splice(this.objects.indexOf(object), 1)
        this.detachObject(object)
        this.scene.remove(object)
        this.render()
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
                this.movePanel()
            }
        }
        if (this.objectControl.dragging && this.objectControl.mode === 'translate') {
            this.movePanel()
        }
        // 当前指针移出一定范围时，隐藏选择的 object
        if (this.curObject) {
            let p2 = this.curObject.position.clone().project(this.camera)
            if (this.pointer.distanceTo(p2) > 0.25) {
                this.detachObject(this.curObject)
            }
        }
    }

    /**
     * 将物体面板移动到物体旁边
     */
    movePanel = () => {
        if (!this.curObject) return
        let pointer = this.curObject.position.clone().project(this.camera)
        let [x, y] = [(pointer.x + 1) / 2 * window.innerWidth, (1 - pointer.y) / 2 * window.innerHeight]
        this.panel.$el.style.left = (x + 30) + 'px'
        this.panel.$el.style.top = (y - 15) + 'px'
    }

    onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.render()
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
}