import Scene from './src/scene.js'


fetch("http://localhost:8000/data").then(res => res.json()).then(data => {
    const scene = new Scene()
    scene.build(data, "edit")

    const globalControl = new Vue({
        el: "#globalControl",
        data: {
            mode: 'edit'
        },
        watch: {
            mode(value) {
                scene.build(data, value)
            }
        }
    })
})