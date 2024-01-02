import { GLTFLoader } from '../../lib/three/addons/loaders/GLTFLoader.js';
import { FontLoader } from '../../lib/three/addons/loaders/FontLoader.js';
import { SVGLoader } from '../../lib/three/addons/loaders/SVGLoader.js';

const defaultFont = 'fonts/AlibabaPuHuiTi_Regular.json'

export default class Loader {
    /**
     * 模型、字体等加载器
     * @param {string[]} urls
     */
    constructor(urls) {
        this.fontLoader = new FontLoader()
        this.gltfLoader = new GLTFLoader()
        this.svgLoader = new SVGLoader()
        this.imgLoader = new THREE.ImageLoader()

        this.objects = {}

        // 预加载
        fonts.forEach(this.loadFont)
        models.forEach(this.loadModel)
        urls.forEach(
            x => {
                if (x.startsWith('fonts/')) this.loadFont(x)
                else if (x.endsWith('.glb')) this.loadModel(x)
                else if (x.endsWith('.svg')) this.loadSvg(x)
                else this.loadImg(x)
            }
        )
    }

    load = async (loader, url) => {
        if (url in this.objects) return this.objects[url]
        this.objects[url] = await loader.loadAsync(url)
        return this.objects[url]
    }

    loadFont = (font = defaultFont) => {
        return this.load(this.fontLoader, font)
    }

    loadModel = (model) => {
        return this.load(this.gltfLoader, model)
    }

    loadSvg = (svg) => {
        return this.load(this.svgLoader, svg)
    }

    loadImg = (img) => {
        return this.load(this.imgLoader, img)
    }
}