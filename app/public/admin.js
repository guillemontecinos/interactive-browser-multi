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
    // saves the data in the clients array
    // TODO: channel has to be setup based on the user's decision, this is just for testing
    makeClientLayout(data.id, data.username)
    clients.push({id: data.id, username: data.username, instance: new p5(s, document.getElementById(data.id + '-canvas-wrapper')), shape: [], channel: clients.length + 1})
})

socket.on('disconnect to admin', function(data){
    // get rid of the container
    document.getElementById(data.id + '-container').remove()
    // remove client from the clients array
    let index = clients.findIndex(element => element.id === data.id)
    clients.splice(index, 1)
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
        sketch.createCanvas(document.getElementsByClassName('client-instance-canvas-wrapper')[0].clientWidth, document.getElementsByClassName('client-instance-canvas-wrapper')[0].clientHeight)
        sketch.strokeWeight(3)
    }
}

// MIDI section
let ppqnCount = 0
let barCount = 1
let octaves = 1
let timeNumerator = 4, timeDenominator = 4

// Setting up time numerator input
const timeNumeratorInput = document.getElementById('tempo-numerator')
timeNumeratorInput.addEventListener('keydown', function(e){
    if(e.keyCode === 13){
        if(Number(timeNumeratorInput.value) <= 8) timeNumerator = Number(timeNumeratorInput.value)
        else timeNumeratorInput.value = timeNumerator
        timeNumeratorInput.placeholder = timeNumerator
    }
    
})
// Setting up time denominator input
const timeDenominatorInput = document.getElementById('tempo-denominator')
timeDenominatorInput.addEventListener('keydown', function(e){
    if(e.keyCode === 13){
        if(Number(timeDenominatorInput.value) <= 16) timeDenominator = Number(timeDenominatorInput.value)
        else timeDenominatorInput.value = timeDenominator
        timeDenominatorInput.placeholder = timeDenominator
    }
})

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

function makeClientLayout(clientId, name){
    const clientContainer = document.createElement('div')
    clientContainer.className = 'client-instance-container'
    clientContainer.id = clientId + '-container'
    
    // Top bar
    const bar = document.createElement('div')
    bar.className = 'top-bar'

    const barTitle = document.createElement('div')
    barTitle.className = 'top-bar-title'

    barTitleText = document.createElement('p')
    barTitleText.innerHTML = name

    barTitle.appendChild(barTitleText)
    bar.appendChild(barTitle)

    const barIcons = document.createElement('div')
    barIcons.className = 'top-bar-icons'

    const minimizeIcon = document.createElement('div')
    minimizeIcon.className = 'minimize-icon-js'

    const minimizeImg = document.createElement('img')
    minimizeImg.src = 'assets/icons/minimize-btn.png'

    minimizeIcon.appendChild(minimizeImg)
    barIcons.appendChild(minimizeIcon)

    const fullscreenIcon = document.createElement('div')
    fullscreenIcon.className = 'full-screen-icon-js'

    const fullscreenImg = document.createElement('img')
    fullscreenImg.src = 'assets/icons/full-screen-btn.png'

    fullscreenIcon.appendChild(fullscreenImg)
    barIcons.appendChild(fullscreenIcon)

    const closeIcon = document.createElement('div')
    closeIcon.className = 'close-icon-js'

    const closeImg = document.createElement('img')
    closeImg.src = 'assets/icons/close-btn.png'

    closeIcon.appendChild(closeImg)
    barIcons.appendChild(closeIcon)

    bar.appendChild(barIcons)

    // Client content
    const clientContent = document.createElement('div')
    clientContent.className = 'client-instance-content'

    const clientCanvas = document.createElement('div')
    clientCanvas.className = 'client-instance-canvas-wrapper'
    clientCanvas.id = clientId + '-canvas-wrapper'

    clientContent.appendChild(clientCanvas)

    const clientMenu = document.createElement('div')
    clientMenu.className = 'client-instance-side-menu'

    const midiChannel = document.createElement('div')
    midiChannel.className = 'client-instance-midi-channel'

    const dropdown = document.createElement('select')
    dropdown.className = 'dropdown-menu'

    const option = document.createElement('option')
    option.text = 'Ch. #1'

    dropdown.appendChild(option)

    midiChannel.appendChild(dropdown)
    clientMenu.appendChild(midiChannel)
    clientContent.appendChild(clientMenu)

    //===== 
    clientContainer.appendChild(bar)
    clientContainer.appendChild(clientContent)
    document.body.appendChild(clientContainer)
}