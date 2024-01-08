import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

const defaultFont = 'fonts/AlibabaPuHuiTi_Regular.json'

export default class Loader {
    constructor() {
        this.fontLoader = new FontLoader()
        this.gltfLoader = new GLTFLoader()
        this.svgLoader = new SVGLoader()
        this.imgLoader = new THREE.TextureLoader()
        this.objects = {}
    }

    /**
     * 模型、字体等加载器
     * @param {string[]} urls
     */
    async loadMany(urls) {
        urls.push(defaultFont)
        await Promise.all([...new Set(urls)].map(x => this.load(x)))
    }

    /**
     * 
     * @param {string} x 
     * @returns {THREE.Loader}
     */
    getLoader = (x) => {
        if (x.startsWith('fonts/')) return this.fontLoader
        else if (x.endsWith('.glb')) return this.gltfLoader
        else if (x.endsWith('.svg')) return this.svgLoader
        else return this.imgLoader
    }

    load = async (url, loader) => {
        if (!url) return
        if (url in this.objects) return this.objects[url]
        if (!loader) {
            loader = this.getLoader(url)
        }
        this.objects[url] = await loader.loadAsync(url)
        return this.objects[url]
    }

    loadFont = (font = defaultFont) => {
        return this.load(font, this.fontLoader)
    }

    loadModel = (model) => {
        return this.load(model, this.gltfLoader)
    }

    loadSvg = (svg) => {
        return this.load(svg, this.svgLoader)
    }

    loadImg = (img) => {
        return this.load(img, this.imgLoader)
    }
}