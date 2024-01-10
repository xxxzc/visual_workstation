import * as THREE from 'three'
THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1)

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

import MetaObject from './metaobject.js'
import Grid from './three_helpers/grid.js'
import Loader from './three_helpers/loader.js'
import { generateUUID } from 'three/src/math/MathUtils.js';
import models from './three_helpers/models.js';
import commonTemplates from './templates.js';

export default class Scene {

    constructor() {
        MetaObject.setContext(this)

        this.mode = '2d' // 展示模式
        this.edit = true // 是否启用编辑
        this.size = [40, 40, 3] // 场景大小

        /** @type {THREE.Object3D[]} */
        this.objects = [] // 场景的所有物体
        this.curObject = null

        this.templates = {} // 场景的所有模板

        this.loader = new Loader() // 模型加载器

        // 相机
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000)
        this.camera.up.set(0, 0, 1)

        // 场景，所有物体都要加入到场景 scene 中
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0xf0f0f0)

        this.buildLight() // 灯光

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        // this.renderer.setAnimationLoop(this.render)

        // 视角控制器
        this.orbitControl = new MapControls(this.camera, this.renderer.domElement)
        this.orbitControl.addEventListener('change', this.render)
        this.isOrbiting = false
        this.orbitControl.addEventListener('start', () => {
            this.isOrbiting = true
        })
        this.orbitControl.addEventListener('end', () => {
            this.isOrbiting = false
        })

        this.raycaster = new THREE.Raycaster()
        this.pointer = new THREE.Vector2()
        this.onUpPosition = new THREE.Vector2()
        this.onDownPosition = new THREE.Vector2()

        document.addEventListener('pointerdown', this.onPointerDown)
        document.addEventListener('pointerup', this.onPointerUp)
        document.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('resize', this.onWindowResize)

        // 物体控制器
        this.objectControl = new TransformControls(this.camera, this.renderer.domElement)
        const objectControl = this.objectControl
        objectControl.size = 0.4
        objectControl.showZ = false
        objectControl.translationSnap = 0.05
        objectControl.rotationSnap = 0.25 / Math.PI
        objectControl.setScaleSnap(0.5)
        objectControl.space = 'local'
        objectControl.addEventListener('change', this.render)
        objectControl.addEventListener('dragging-changed', (event) => {
            this.orbitControl.enabled = !event.value
        })
        objectControl.addEventListener('mouseUp', (event) => {
            if (this.curObject) {
                this.curObject.meta.position[0] = this.curObject.position.x
                this.curObject.meta.position[1] = this.curObject.position.y
            }
            this.didChange()
        })

        document.body.appendChild(this.renderer.domElement)

        const that = this
        // 物体面板
        this.panel = new Vue({
            el: "#objectPanel",
            data() {
                return {
                    /** @type {THREE.Object3D}   */
                    object: null,
                    /** @type {MetaObject}  */
                    meta: new MetaObject(),
                    edit: true,
                    model3ds: [],
                    copyDirection: 'right',
                    selectAttr: null,
                    attrs: {
                        size: '大小(m)', color: '物体颜色', textColor: '文字颜色',
                        model3d: '3D模型', rotate3d: '旋转3D',
                        model2d: '2D模型', rotate2d: '旋转2D',
                        tname: '模板名称', category: '所属分类',
                        positionZ: '位置(高)', inCount: '参与统计', showLabel: '显示名称'
                    }
                }
            },
            methods: {
                setObject(object) {
                    if (this.object === object) return
                    this.object = object
                    if (!object || (!this.edit && object.meta.isTemplate)) {
                        this.object = null
                        that.detachObject()
                        return
                    }
                    that.attachObject(object)
                    this.meta = object.meta
                    this.movePanel()
                },
                async applyChange() {
                    await this.meta.build()
                    that.render()
                    that.didChange()
                },
                async newObject() {
                    if (!this.object) return
                    let meta = this.meta.isTemplate ? this.meta.toTemplate() : this.meta.toJson()
                    if (this.meta.isTemplate) meta.position[0] = -that.size[0] / 2 - meta.size[0] / 2
                    else {
                        if (this.copyDirection === 'left')
                            meta.position[0] -= this.meta.size[0]
                        else if (this.copyDirection === 'right')
                            meta.position[0] += this.meta.size[0]
                        else if (this.copyDirection === 'up')
                            meta.position[1] += this.meta.size[1]
                        else if (this.copyDirection === 'down')
                            meta.position[1] -= this.meta.size[1]
                    }
                    meta.id = ''
                    meta.isTemplate = false
                    that.detachObject(this.object)
                    this.setObject(await that.addObject(meta))
                    that.didChange()
                },
                async newTemplate() {
                    if (!this.object) return
                    let meta = this.meta.toTemplate()
                    meta.id = ''
                    meta.isTemplate = true
                    that.detachObject(this.object)
                    this.setObject(await that.addTemplate(meta))
                    that.didChange()
                },
                onDelete() {
                    if (!this.object) return
                    that.removeObject(this.object)
                    this.object = null
                    that.didChange()
                },
                async movePanel(pointer) {
                    if (!pointer) {
                        if (!this.object) return
                        pointer = this.object.position.clone().project(that.camera)
                    }
                    await this.$nextTick()
                    let [x, y] = [(pointer.x + 1) / 2 * window.innerWidth, (1 - pointer.y) / 2 * window.innerHeight]
                    if (x + this.$el.offsetWidth + 30 > window.innerWidth) {
                        x = x - this.$el.offsetWidth - 60
                    }
                    if (y + this.$el.offsetHeight > window.innerHeight) {
                        y = window.innerHeight - this.$el.offsetHeight
                    }
                    this.$el.style.left = (x + 30) + 'px'
                    this.$el.style.top = (y - 15) + 'px'
                },
                async applyToAll() {
                    await this.applyChange()
                    if (!this.selectAttr) return
                    await Promise.all(that.objects.map(
                        x => {
                            if (!x.meta.isTemplate && x.meta.tid === this.meta.tid) {
                                if (this.selectAttr === 'positionZ') {
                                    x.meta.position[2] = this.meta.position[2]
                                } else x.meta[this.selectAttr] = this.meta[this.selectAttr]
                                return x.meta.build()
                            }
                            return null
                        }
                    ))
                    that.didChange()
                    that.render()
                },
                async get3dModels() {
                    let resp = await fetch("http://localhost:8000/models")
                    let data = await resp.json()
                    this.model3ds = data
                }
            }
        })

        document.addEventListener("keydown", (event) => {
            console.log(event.key)
            if (event.key === "Escape") {
                this.panel.setObject(null)
            }
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown'
                || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                this.panel.copyDirection = event.key.replace('Arrow', '').toLowerCase()
            }
            if (event.key === 'Delete') {
                this.panel.onDelete()
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
    async build({ size, objects, templates, model3ds }, { didChange, mode = "2d", edit = false }) {
        this.size = size
        const width = size[0]
        const height = size[1]

        this.mode = mode // 展示模式
        this.edit = edit // 编辑模式
        this.panel.edit = edit
        this.didChange = didChange // 场景变化回调函数
        this.panel.model3ds = model3ds

        this.camera.position.set(0, 0, width * 1.3)

        // 渲染器
        const renderer = this.renderer
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)

        // 轨道控制器，控制场景的缩放、旋转和移动
        const orbitControl = this.orbitControl
        orbitControl.enablePan = true
        orbitControl.target.set(0, 0, 0)
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
        await Promise.all(templates.map(x => this.addTemplate(x)))
        // 加载默认的模板
        for await (let template of commonTemplates) {
            if (!this.templates[template.tid])
                await this.addTemplate(template)
        }
        await Promise.all(objects.map(x => this.addObject(x)))

        this.toggleEdit(edit)
    }

    /**
     * 仅切换显示模式，重新构建一下 objects 就行
     * @param {string} mode 
     */
    switchMode = async (mode) => {
        this.mode = mode
        await Promise.all(
            this.objects.map(x => x.meta.build())
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
        grid.position.z = 0.01
        if (edit) scene.add(grid)

        // 展示模式显示平面
        scene.remove(this.plane)
        // if (!edit) {
        //     this.plane = new THREE.Group()
        //     let plane1 = RoundPlane(this.size[0], this.size[1], 1, 0xcccccc, false)
        //     let plane2 = RoundPlane(this.size[0], this.size[1], 1, 0x999999, true)
        //     this.plane.add(plane1, plane2)
        // } else {
        //     const geometry = new THREE.PlaneGeometry(width, height, width, height)
        //     const plane = this.plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }))
        // }
        const geometry = new THREE.PlaneGeometry(width, height, width, height)
        const plane = this.plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(
            { color: '#ffffff' }
        ))
        // this.plane.visible = !edit
        plane.position.z = -0.01
        scene.add(this.plane)

        // 物体移动控制器
        this.scene.remove(this.objectControl)
        const objectControl = this.objectControl
        if (edit) scene.add(objectControl)

        // 是否显示模板
        await this.switchMode(this.mode)

        scene.remove(this.templateTitle)
        this.templateTitle = models.text("模板列表", await this.loader.loadFont(), 1, '#333333')
        this.templateTitle.position.set(-width / 2 - 11, height / 2 - 3, 0)
        if (edit) scene.add(this.templateTitle)

        this.render()
    }

    addObject = async (meta) => {
        meta = JSON.parse(JSON.stringify(meta))
        let metaObject = new MetaObject(this.templates[meta.tid], meta)
        /**
         * @type {THREE.Object3D} object
         */
        let object = await metaObject.build()
        this.objects.push(object)
        // 当 object 的模板不存在时，将其作为模板加入
        if (!(object.meta.tid in this.templates)) {
            this.addTemplate(object.meta.toTemplate())
        }
        this.scene.add(object)
        this.render()
        return object
    }

    addTemplate = async (meta) => {
        let i = Object.keys(this.templates).length
        if (meta.tid in this.templates) {
            meta.tid = generateUUID().replace(/\-/g, '')
        }
        this.templates[meta.tid] = JSON.parse(JSON.stringify(meta))
        let idx = i % 3
        let object = await this.addObject(Object.assign({}, meta, {
            position: [
                -this.size[0] / 2 - 4 - 5 * idx,
                this.size[1] / 2 - Math.floor(i / 3) * 5 - 6,
                meta.position[2] || 0
            ],
            isTemplate: true
        }))
        return object
    }

    attachObject = (object) => {
        if (!object) return
        if (this.curObject === object) return
        this.detachObject()
        this.curObject = object
        object.meta.highlight('#FFA600')
        // this.panel.setObject(object)
        this.panel.movePanel()
        if (!object.meta.isTemplate) this.objectControl.attach(object)
        this.render()
    }

    /**
     * 取消对物体的控制
     * @param {THREE.Object3D} object 
     * @returns 
     */
    detachObject = (object) => {
        object = object || this.curObject
        if (!object) return
        if (this.objectControl.object === object) {
            this.objectControl.detach()
        }
        object.meta.delight()
        this.curObject = null
        // this.panel.setObject(null)
        this.render()
    }

    removeObject = (object) => {
        if (!object) return
        if (object.meta.isTemplate) delete this.templates[object.meta.tid]
        this.objects.splice(this.objects.indexOf(object), 1)
        this.detachObject(object)
        this.scene.remove(object)
        this.render()
    }

    lookAtObject = (object) => {
        if (!object) return
        this.camera.position.set(...object.position.toArray())
        this.camera.position.z = 30
        this.orbitControl.target.set(...object.position.toArray())
        this.panel.setObject(object)
        this.render()
    }

    getIntersect = () => {
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const intersects = this.raycaster.intersectObjects(this.objects, true)
        if (!intersects.length) return null
        let size = this.size[0] * this.size[1]
        let minObject = null
        intersects.forEach(x => {
            let object = x.object
            let cnt = 10
            while (!object.meta && cnt--) object = object.parent
            if (object && object === this.panel.object) {
                minObject = object
                size = 0
            }
            if (cnt > 0 && object.meta.size[0] * object.meta.size[1] < size) {
                size = object.meta.size[0] * object.meta.size[1]
                minObject = object
            }
        })
        return minObject
    }

    getDistance = (object) => {
        object = object || this.curObject
        if (!object) return 0
        let p2 = object.position.clone().project(this.camera)
        return this.pointer.distanceTo(p2)
    }

    onPointerDown = (event) => {
        if (event.target.__vue__) return
        if (event.target.tagName !== 'CANVAS') return
        this.onDownPosition.set(event.clientX, event.clientY)
    }

    onPointerUp = (event) => {
        if (event.target.__vue__) return
        if (event.target.tagName !== 'CANVAS') return
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1

        this.onUpPosition.set(event.clientX, event.clientY)
        // let clickObject = this.getIntersect()
        // if (this.curObject
        //     && this.getIntersect()
        // ) {
        //     this.panel.setObject(this.curObject)
        // } else this.panel.setObject(null)

        this.panel.setObject(this.getIntersect())
    }

    onPointerMove = (event) => {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1

        if (event.target.__vue__) return
        if (event.target.tagName !== 'CANVAS') return

        if (this.objectControl.dragging) {
            this.panel.movePanel(this.pointer)
        }

        if (this.isOrbiting) return

        // 指针远离选择物体时，自动隐藏
        const distance = this.getDistance()
        if (distance > 0.25 && !this.panel.object) this.detachObject()

        const hoverObject = this.getIntersect(event)
        if (hoverObject && hoverObject !== this.curObject
            && (!this.curObject || distance > 0.05)) {
            if (!this.panel.object) this.attachObject(hoverObject)
        }
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
        let ambientLight = new THREE.AmbientLight(0xffffff, 3)
        this.scene.add(ambientLight)
        let directionalLight = new THREE.DirectionalLight(0xffffff, 3)
        directionalLight.position.set(1, 0.75, 0.5).normalize()
        this.scene.add(directionalLight)
    }
}