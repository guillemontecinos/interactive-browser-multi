// Interactive Browser Multiuser - Admin
// by Guillermo Montecinos

// Source: https://socket.io/docs/#Using-with-Express
let signedIn = false
let url = location.host.split(':')[0]
console.log('url: ' + url)
const socket = io()

// Welcome alert, waiting for admin to input password
const input = document.getElementById('username-value')
input.focus()
const button = document.getElementById('username-submit')

button.addEventListener('click', function(){
    // TODO: make security check safer
    if(input.value == '123'){
        signedIn = true
        document.getElementById('client-welcome-alert').remove()
        socket.emit('nickname', 'admin')
    }
})

// Main code after this
let clients = []
let channels = []
for (let i = 0; i < 16; i++){
    channels.push({channel: i + 1, inUse: false, userID: ''})
}

socket.on('new client', function(data){
    console.log(data)
    // send current playing status to client
    if(isPlaying) socket.emit('admin-playing-on-connection', {id: data.id, timeNumerator: timeNumerator, timeDenominator: timeDenominator, timeResolution: timeResolution})
    // saves the data in the clients array
    // TODO: channel has to be setup based on the user's decision, this is just for testing
    let midiCh
    for (let i = 0; i < channels.length; i++){
        if(channels[i].inUse == false){
            midiCh = channels[i].channel
            channels[i].inUse = true
            channels[i].userID = data.id
            break
        }
    }
    makeClientLayout(data.id, data.username)
    clients.push({
        id: data.id, 
        username: data.username, 
        instance: new p5(s, document.getElementById(data.id + '-canvas-wrapper')), 
        shape: [], 
        channel: midiCh, 
        previousNotes: new Array(numNotes).fill(false), 
        scale: [1, 3, 5, 6, 8, 10, 12], 
        scaleOnUse: [1, 3, 5, 6, 8, 10, 12], 
        octave: 0,
        octaveOnUse: 0, 
        key: 0,
        keyOnUse: 0,
        bars: 1,
        barsOnUse: 1,
        currentBar: 0
    })
})

socket.on('client disconnects', function(data){
    // get rid of the container
    document.getElementById(data.id + '-container').remove()
    const channelIndex = channels.findIndex(channel => channel.userID === data.id)
    channels[channelIndex].inUse = false
    channels[channelIndex].userID = ''
    // remove client from the clients array
    let index = clients.findIndex(element => element.id === data.id)
    clients.splice(index, 1)
    updateMIDIChannels()
})

socket.on('new data', function(data){
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

socket.on('client-scale-setup', function(data){
    const index = clients.findIndex(element => element.id === data.id)
    clients[index].scale = data.scale
})

socket.on('client-octave-setup', function(data){
    const index = clients.findIndex(element => element.id === data.id)
    clients[index].octave = data.octave
})

socket.on('client-key-setup', function(data){
    const index = clients.findIndex(element => element.id === data.id)
    clients[index].key = data.key
})

socket.on('client-bars-setup', function(data){
    const index = clients.findIndex(element => element.id === data.id)
    clients[index].bars = data.bars
    let content
    if(clients[index].bars == 1) content = '1 bar'
    else content = clients[index].bars + ' bars'
    document.getElementById(clients[index].id + '-bars').children[0].innerHTML = content
    // clear canvas
    clients[index].instance.background(255)
    // draw background lines
    drawGrid(clients[index])
    // redraw lines
    reDrawCurves(clients[index])
})

function pointReceived(element, data){
    element.shape[element.shape.length - 1].push({x: data.x, y: data.y, stroke: data.stroke})
    element.instance.strokeWeight(element.instance.height / data.stroke)
    element.instance.stroke(0)
    let aux = element.shape[element.shape.length - 1]
    if(aux.length >= 2) element.instance.line(aux[aux.length - 2].x * element.instance.width, aux[aux.length - 2].y * element.instance.height, aux[aux.length - 1].x * element.instance.width, aux[aux.length - 1].y * element.instance.height)
}

function drawGrid(element){
    for(let i = 1; i < element.bars; i++){
        element.instance.stroke(150)
        element.instance.strokeWeight(1)
        element.instance.line(element.instance.width * i / element.bars, 0, element.instance.width * i / element.bars, element.instance.height)
    }
}

function reDrawCurves(element){
    element.instance.stroke(0)
    element.shape.forEach(curve => {
        const numVertices = curve.length
        if(numVertices >= 2) {
            for(let i = 0; i < numVertices - 1; i++){
                element.instance.strokeWeight(element.instance.height / curve[i].stroke)
                element.instance.line(curve[i].x * element.instance.width, curve[i].y * element.instance.height, curve[i + 1].x * element.instance.width, curve[i + 1].y * element.instance.height)
            }
        }
    })
}

function resetClient(element){
    element.instance.background(255)
    drawGrid(element)
    element.shape = []
}

// declare constructor for each canvas visualizator
const s = function(sketch){
    sketch.setup = function(){
        sketch.createCanvas(document.getElementsByClassName('client-instance-canvas-wrapper')[0].clientWidth, document.getElementsByClassName('client-instance-canvas-wrapper')[0].clientHeight)
        sketch.background(255)
    }
}

// MIDI section
let ppqnCount = 0
let barCount = 1
let numNotes = 7
let timeNumerator = 4, timeDenominator = 4
let isPlaying = false
// Multiplies the time denominator in order to augment the number of notes that divide the 1/4 note. Can only take 1, 2 or 4 as values
let timeResolution = 4

// Setting up time numerator input
const timeNumeratorInput = document.getElementById('tempo-numerator')
timeNumeratorInput.addEventListener('keydown', function(e){
    if(e.keyCode === 13 || e.keyCode === 9){
        if(Number(timeNumeratorInput.value) <= 8 && timeNumeratorInput.value != '') timeNumerator = Number(timeNumeratorInput.value)
        else timeNumeratorInput.value = timeNumerator
        timeNumeratorInput.placeholder = timeNumerator
    }
})
// Setting up time denominator input
const timeDenominatorInput = document.getElementById('tempo-denominator')
timeDenominatorInput.addEventListener('keydown', function(e){
    if(e.keyCode === 13 || e.keyCode === 9){
        if(Number(timeDenominatorInput.value) <= 16 && timeNumeratorInput.value != '') timeDenominator = Number(timeDenominatorInput.value)
        else timeDenominatorInput.value = timeDenominator
        timeDenominatorInput.placeholder = timeDenominator
        // get rid of cursor when hitting enter
    }
})

// Setting up time resolution dropdown
// const timeResolutionInput = document.getElementById('time-resolution-dropdown')
// timeResolutionInput.addEventListener('change', () => {
//     timeResolution = Number(timeResolutionInput.value)
// })

WebMidi.enable(function (err) {
    // Selects input by using the dropdown menu
    let input
    const dropdownMenu = document.getElementById('midi-port-dropdown')
    dropdownMenu.addEventListener('change', () => {
        // Clear listeners of the previuous input
        if (input) {
            input.removeListener()
        }
        if(WebMidi.getInputByName(dropdownMenu.value).connection == 'open'){
            input = WebMidi.getInputByName(dropdownMenu.value)
            setMidiListeners(input)
        }
    })

    // Adds inputs to the dropdown menu when new ports connect
    WebMidi.addListener('connected', (e) => {
        if (e.port.type == 'input' && !document.getElementById(e.port.id)) {
            console.log(e.port.name + ' connected')
            const option = document.createElement('option')
            option.id = e.port.id
            option.text = e.port.name
            document.getElementById('midi-port-dropdown').add(option)
            // set callbacks only for first input por connected
            if(document.getElementById('midi-port-dropdown').options.length == 1){
                setMidiListeners(WebMidi.getInputById(e.port.id))
            }
        }
    })

    // Removes inputs to the dropdown menu when ports gets disconnected
    WebMidi.addListener('disconnected', (e) => {
        console.log(e.port.name + ' disconnected')
        if (e.port.type == 'input') {
            let option = document.getElementById(e.port.id)
            option.remove()
        }
    })
})

function setMidiListeners(input){
    console.log('MIDI listeners added to "' + input.name + '"')
    input.addListener('start', 'all', (e) => {
        console.log('bar: 1')
        // Set current bar to 0 for all users
        clients.forEach(client => {
            client.currentBar = 0
        })
        sendNote(1)
        isPlaying = true
        socket.emit('admin-play', {status : 'play', timeNumerator: timeNumerator, timeDenominator: timeDenominator, timeResolution: timeResolution})
    })
    input.addListener('stop', 'all', (e) => {
        console.log(e)
        ppqnCount = 0
        barCount = 1
        isPlaying = false
        socket.emit('admin-play', {status : 'stop'})
    })
    input.addListener('clock', 'all', (e) => {
        ppqnCount++
        const ppqnComparator = 24 * 4 / (timeDenominator * timeResolution)
        if(ppqnCount == 0 || ppqnCount == ppqnComparator){
            ppqnCount = 0
            barCount += 1 / timeResolution
            if(barCount == timeNumerator + 1) barCount = 1
            // console.log('bar: ' + barCount)
            // calculate and send notes
            sendNote(barCount)
        }
        socket.emit('admin-clock', {})
    })
}

const stroke2velocity = {
    8:120,
    10:100,
    15:80,
    20:60,
    30:40
}

function sendNote(beat){
    if(clients.length > 0){
        clients.forEach(element => {
            // Reset any change on the scale that happend during the bar
            if(beat == 1){
                element.scaleOnUse = element.scale
                numNotes = element.scaleOnUse.length
                element.previousNotes.length = 0
                element.previousNotes = new Array(numNotes).fill(false)
                element.octaveOnUse = element.octave
                element.keyOnUse = element.key
                element.currentBar++
                if(element.currentBar > element.barsOnUse) {
                    element.currentBar = 1
                    element.barsOnUse = element.bars
                }
                console.log('current Bar: ' + element.currentBar)
            }
            
            // noteArea is defined as x & y coordinates where the box start and end, not as x,y,w,h.
            const barShift = (element.currentBar - 1) / element.barsOnUse
            const beatShift = (beat - 1) / (timeNumerator * element.barsOnUse)
            const noteWidth = 1 / (timeNumerator * timeResolution * element.barsOnUse)
            // Iterate over each note of the scale
            for (let i = 0; i < numNotes; i++){
                let vertexCount = 0
                let velocityMaxAverage = 0
                const noteArea = {x1: barShift + beatShift, y1: i / numNotes, x2: barShift + beatShift + noteWidth, y2: (i + 1) / numNotes}
                element.shape.forEach(curve => {
                    curve.forEach((vertex) => {
                        if(vertex.x >= noteArea.x1 && vertex.x <= noteArea.x2 && vertex.y >= noteArea.y1 && vertex.y <= noteArea.y2) {
                            vertexCount++
                            velocityMaxAverage += Number(stroke2velocity[vertex.stroke])
                        }
                    })
                })
                // when detecting a note send note on
                if(vertexCount >= 1) {
                    velocityMaxAverage /= vertexCount
                    vertexCount = element.instance.map(vertexCount, 0, 70, .1, 10)
                    let velocityShare = element.instance.map(Math.log(vertexCount), Math.log(.1), Math.log(10), 0, 1)
                    let velocity = element.instance.constrain(velocityShare * velocityMaxAverage, 0, 127)
                    // on other beats just compare
                    if(beat == 1 || element.previousNotes[i] == false) {
                        // Send note when avg is higher than some threshold
                        WebMidi.getOutputByName(document.getElementById('midi-port-dropdown').value).playNote(
                            // 60 + scale.length - i, 
                            60 + element.octaveOnUse * 12 + element.keyOnUse + Number(element.scaleOnUse[numNotes - i - 1]) - 1,
                            element.channel, 
                            {
                                duration: 5000, 
                                velocity: velocity
                            })
                            // let notePlayed = 60 + Number(element.scaleOnUse[numNotes - i - 1]) - 1
                            // console.log('played: ' + notePlayed)
                    }
                    element.previousNotes[i] = true
                }
                // when detecting no note send note off
                else{
                    if(beat == 1 || element.previousNotes[i] == true) {
                        WebMidi.getOutputByName(document.getElementById('midi-port-dropdown').value).stopNote(
                            // 60 + scale.length - i, 
                            60 + element.octaveOnUse * 12 + element.keyOnUse + Number(element.scaleOnUse[numNotes - i - 1]) - 1,
                            element.channel, 
                            {
                                time: 0, 
                                velocity: 100
                            })
                    }
                    element.previousNotes[i] = false
                }
            }
        })
    }
}

// Layout Section
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
    dropdown.id = clientId + '-dropdown'

    // create options based on channels array
    channels.forEach(channel => {
        if(channel.inUse == false) {
            const option = document.createElement('option')
            option.text = 'Ch. #' + channel.channel
            option.value = channel.channel
            dropdown.appendChild(option)
        }
        else if(channel.inUse == true && channel.userID === clientId){
            const option = document.createElement('option')
            option.text = 'Ch. #' + channel.channel
            option.value = channel.channel
            option.selected = true
            dropdown.appendChild(option)
        }
    })

    dropdown.addEventListener('change', function(){
        // update channel in client object
        const clientIndex = clients.findIndex(client => client.id === clientId)
        const channelIndex = channels.findIndex(channel => channel.userID === clientId)
        const thisChannel = this.value
        // update old channel
        channels[channelIndex].inUse = false
        channels[channelIndex].userID = ''
        // update new channel
        clients[clientIndex].channel = thisChannel
        channels[Number(thisChannel - 1)].inUse = true
        channels[Number(thisChannel - 1)].userID = clientId
        
        // update all clients channels
        updateMIDIChannels()
    })

    // Client instance Bars
    const bars = document.createElement('div')
    bars.className = 'client-instance-bars'
    bars.id = clientId + '-bars'
    const barsText = document.createElement('p')
    barsText.innerHTML = '1 bar'
    bars.appendChild(barsText)

    midiChannel.appendChild(dropdown)
    clientMenu.appendChild(midiChannel)
    clientMenu.appendChild(bars)
    clientContent.appendChild(clientMenu)

    //===== 
    clientContainer.appendChild(bar)
    clientContainer.appendChild(clientContent)
    document.body.appendChild(clientContainer)
}

function updateMIDIChannels(){
    clients.forEach(client => {
        const dropdownMenu = document.getElementById(client.id + '-dropdown')
        dropdownMenu.options.length = 0
        channels.forEach(channel => {
            if(channel.inUse == false) {
                const option = document.createElement('option')
                option.text = 'Ch. #' + channel.channel
                option.value = channel.channel
                dropdownMenu.appendChild(option)
            }
            else if(channel.inUse == true && channel.userID === client.id){
                const option = document.createElement('option')
                option.text = 'Ch. #' + channel.channel
                option.value = channel.channel
                option.selected = true
                dropdownMenu.appendChild(option)
            }
        })
    })
}