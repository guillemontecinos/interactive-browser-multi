// Interactive Browser Multiuser - Viewer
// by Guillermo Montecinos

let clients = []

const socket = io()
socket.emit('nickname', 'viewer')

socket.on('initial data to viewer', (data) => {
    console.log(data)
    data.forEach(client => {
        if(client.username != 'admin'){
            let hue = 10 + (clients.length) * 150
            if(hue > 360) hue = hue - 360
            const clt = {id: client.id, username: client.username, shape: client.shape, color: color(hue, 85, 80)}
            clients.push(clt)
        }
    })
})

socket.on('new client', function(data){
    // saves the data in the clients array
    let hue = 10 + (clients.length) * 150
    if(hue > 360) hue = hue - 360
    clients.push({id: data.id, username: data.username, shape: [], color: color(hue, 85, 80)})
})

socket.on('new data', (data) => {
    const index = clients.findIndex(element => element.id === data.id)
    
    if(data.action == 'start'){
        clients[index].shape.push([])
        pointReceived(clients[index], data)
    }
    else if(data.action == 'dragged'){
        pointReceived(clients[index], data)
    }
    else if(data.action == 'reset'){
        resetClient(clients[index])
    }
})

socket.on('client disconnects', (data) => {
    const index = clients.findIndex(element => element.id === data.id)
    clients.splice(index, 1)
})

function pointReceived(element, data){
    element.shape[element.shape.length - 1].push({x: data.x, y: data.y, stroke: data.stroke})
    let aux = element.shape[element.shape.length - 1]
}

function resetClient(element){
    element.shape = []
}

let font
function preload(){
    font = loadFont('./assets/fonts/UbuntuMono-Bold.ttf')
}

const clientWrap = document.getElementById('viewer-canvas-wrapper')
function setup(){
    document.getElementById('client-draw-container').style.display = 'block'
    createCanvas(clientWrap.clientWidth, clientWrap.clientWidth * 9 / 16)
    clientWrap.appendChild(canvas)
    background(255)
    stroke(0)
    // strokeWeight(height / 12)
    textFont(font)
    textSize(height / 18)
    colorMode(HSB)
}

function draw(){
    // draw all the shapes and their labels
    background(255)
    clients.forEach(client => {
        stroke(client.color)
        const numShapes = client.shape.length
        if(numShapes >= 1){
            client.shape.forEach(aux => {
                if(aux.length >= 2) {
                    for(let i = 1; i < aux.length; i++) {
                        strokeWeight(height / aux[i].stroke)
                        line(aux[i].x * width, aux[i].y * height, aux[i - 1].x * width, aux[i - 1].y * height)
                    }
                }
            })
            const lastShape = client.shape[numShapes - 1]
            const lastVertex = lastShape[lastShape.length - 1]
            noStroke()
            // draw white background to make text readable
            const textPos = {x: lastVertex.x * width + height / 12, y: lastVertex.y * height}
            const box = font.textBounds(client.username, textPos.x, textPos.y)
            // TODO: fix when label goes out of the canvas
            fill(255)
            rect(box.x - width * .0125, box.y - height * .0125, box.w + width * .025, box.h + height * .025, 10)
            // draw text within the label
            fill(client.color)
            text(client.username, textPos.x, textPos.y)
        }
    })
}

window.addEventListener('resize', updateCanvasSize)

function updateCanvasSize(){
    resizeCanvas(clientWrap.clientWidth, clientWrap.clientWidth * 9 / 16)
    background(255)
}