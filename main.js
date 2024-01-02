import Scene from './src/scene.js'

fetch("http://localhost:8000/data").then(res => res.json()).then(data => {
    const scene = new Scene()
    scene.build(data, "3d")
})