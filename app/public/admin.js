// Interactive Browser Multiuser - Admin
// by Guillermo Montecinos

// Source: https://socket.io/docs/#Using-with-Express
// TODO: update this address with the current IP
let url = location.host.split(':')[0]
let socket = io.connect(url)
socket.emit('nickname', 'admin')

let clients = []

socket.on('new client to admin', function(data){
    console.log(data)
    // create a div that stores the canvas
    let container = document.createElement('div')
    let name = document.createElement('div')
    name.className = 'user-name'
    name.innerHTML = data.username
    let sketch = document.createElement('div')
    sketch.id = data.id
    container.appendChild(name)
    container.appendChild(sketch)
    document.body.appendChild(container)
    // saves the data in the clients array
    // TODO: channel has to be setup based on the user's decision, this is just for testing
    clients.push({id: data.id, username: data.username, instance: new p5(s, document.getElementById(data.id)), shape: [], channel: clients.length + 1})
    // console.log(clients)
})

socket.on('disconnect to admin', function(data){
    // get rid of the container
    document.getElementById(data.id).parentElement.remove()
    // remove client from the clients array
    let index = clients.findIndex(element => element.id === data.id)
    clients.splice(index, 1)
    // console.log(clients)
})

socket.on('data to admin', function(data){
    let index = clients.findIndex(element => element.id === data.id)
    // update circle position of the client
    // console.log(clients[index].shape)
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

function pointReceived(element, data){
    element.shape[element.shape.length - 1].push({x: data.x, y: data.y})
    let aux = element.shape[element.shape.length - 1]
    if(aux.length >= 2) element.instance.line(aux[aux.length - 2].x * element.instance.width, aux[aux.length - 2].y * element.instance.height, aux[aux.length - 1].x * element.instance.width, aux[aux.length - 1].y * element.instance.height)
}

function resetClient(element){
    element.instance.background(255)
    element.instance.rect(0, 0, element.instance.width, element.instance.height)
    element.shape = []
}

// declare constructor for each canvas visualizator
const s = function(sketch){
    sketch.setup = function(){
        sketch.createCanvas(400, 250)
        sketch.strokeWeight(3)
        sketch.rect(0, 0, sketch.width, sketch.height)
    }
}

// MIDI section
let ppqnCount = 0
let barCount = 1
let octaves = 1
let timeNumerator = 4, timeDenominator = 4

WebMidi.enable(function (err) {
    // Adds inputs to the dropdown menu when new ports connect
    WebMidi.addListener('connected', (e) => {
        
        // if (e.port.type == 'input' && !document.getElementById(e.port.id)) {
            console.log(e.port.name + ' connected')
        // }
        if(WebMidi.getInputById(e.port.id)) return
        
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('start', 'all', (e) => {
            console.log('bar: 1')
            sendNote(1)
        })
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('stop', 'all', (e) => {
            console.log(e)
            ppqnCount = 0
            barCount = 1
        })
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('clock', 'all', (e) => {
            ppqnCount++
            const ppqnComparator = 24 * 4 / timeDenominator
            if(ppqnCount == 0 || ppqnCount == ppqnComparator){
                ppqnCount = 0
                barCount++
                if(barCount == timeNumerator + 1) barCount = 1
                console.log('bar: ' + barCount)
                // calculate and send notes
                sendNote(barCount)
            }
        })
    })
})

function sendNote(beat){
    if(clients.length > 0){
        clients.forEach(element => {
            // TODO: implemente sending each user to a different channel
            const numNotes = octaves * 12
            const noteWidth = element.instance.int(element.instance.width / timeNumerator)
            const noteHeight = element.instance.int(element.instance.height / numNotes)
            
            // element.instance.fill(255,0,0,50)
            // element.instance.noStroke()
            // element.instance.rect((beat - 1) * noteWidth, 0, noteWidth, element.instance.height)

            element.instance.loadPixels()
            for (let i = 0; i < numNotes; i++){
                // Estimate pixelsDensity
                let counter = 0, brightness = 0
                for(let x = (beat - 1) * noteWidth; x < beat * noteWidth; x += 4){
                    if(x > element.instance.width) break
                    for(let y = i * noteHeight; y < (i + 1) * noteHeight; y += 4){
                        if(y > element.instance.height) break
                        const c = element.instance.get(x, y)
                        brightness += (element.instance.red(c) + element.instance.green(c) + element.instance.blue(c)) / 3
                        counter++
                    }
                }
                brightness /= counter
                const vel = element.instance.map(brightness, 0, 255, 1, 0)
                if(vel > .3){
                    // Send note when avg is higher than some threshold
                    WebMidi.getOutputByName('auxVirtualPort Bus 1').playNote(
                        60 + numNotes - i, 
                        element.channel, 
                        {
                            duration: 20, 
                            velocity: vel
                        })
                    }
                }
        })
    }
}