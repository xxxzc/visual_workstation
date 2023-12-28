import { GLTFLoader } from '../../lib/three/addons/loaders/GLTFLoader.js';
import { FontLoader } from '../../lib/three/addons/loaders/FontLoader.js';

const defaultFont = 'fonts/AlibabaPuHuiTi_Regular.json'

export default class Loader {
    /**
     * 模型、字体等加载器
     * @param {string[]} models 
     * @param {string[]} fonts 
     */
    constructor(models, fonts=[defaultFont]) {
        this.fontLoader = new FontLoader()
        this.gltfLoader = new GLTFLoader()

        this.objects = {}

        // 预加载
        fonts.forEach(this.loadFont)
        models.forEach(this.loadModel)
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
}