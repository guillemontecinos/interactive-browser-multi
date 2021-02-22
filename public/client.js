// Interactive Browser Multiuser - Client
// by Guillermo Montecinos

// Source: https://socket.io/docs/#Using-with-Express
// TODO: update this address with the current IP

const socket = io()
let input, button, onInterface = false, curves = {shape: []}, clearBtn, adminConnected = false

// Admin connected checker
socket.on('admin status', (data) => {
    console.log('Admin status: ' + data.status)
    adminConnected = data.status
    if(adminConnected) adminConnects()
})

socket.on('admin connected', (data) => {
    if(!adminConnected && data.status) {
        adminConnected = data.status
        console.log('Admin status: ' + data.status)
        adminConnects()
    }
})

socket.on('admin disconnected', (data) => {
    // use when admin disconnects in the middle of something
})

let numNotes = 12
let previousNotes
let barCount = 1
let ppqnCount = 0
let timeNumerator = 0
let timeDenominator = 0
let timeResolution = 1

socket.on('client-play', (data) => {
    if(data.status == 'play'){
        timeNumerator = data.timeNumerator
        timeDenominator = data.timeDenominator
        timeResolution = data.timeResolution
        numNotes = data.numNotes
        previousNotes = new Array(numNotes).fill(false)
        console.log('client play')
        console.log('bar: 1')
        playNote(1)
    }
    else if(data.status == 'stop'){
        ppqnCount = 0
        console.log('client stop')
        stopNotes()
    }
})

socket.on('client-play-on-connection', (data) => {
    if(socket.id == data.id) {
        timeNumerator = data.timeNumerator
        timeDenominator = data.timeDenominator
        timeResolution = data.timeResolution
        numNotes = data.numNotes
        previousNotes = new Array(numNotes).fill(false)
        ppqnCount = 0
        console.log('client play')
        console.log('bar: 1')
        playNote(1)
    }
})

socket.on('client-clock', (data) => {
    ppqnCount++
    // console.log('ppqnCount ' + ppqnCount)
    const ppqnComparator = 24 * 4 / (timeDenominator * timeResolution)
    if(ppqnCount == 0 || ppqnCount == ppqnComparator){
        ppqnCount = 0
        barCount += 1 / timeResolution
        if(barCount == timeNumerator + 1) barCount = 1
        console.log('bar: ' + barCount)
        // calculate and send notes
        playNote(barCount)
    }
})

function setup(){
    input = document.getElementById('username-value')
    button = document.getElementById('username-submit')
    button.addEventListener('click', buttonSubmit)
    input.style.visibility = 'hidden'
    button.style.visibility = 'hidden'
    
    if(adminConnected){
        adminConnects()
    }
    else {
        document.getElementById('ui-message').innerHTML = 'The admin is not connected yet, please wait.'
    }
}

function adminConnects(){
    input.style.visibility = 'visible'
    button.style.visibility = 'visible'
    document.getElementById('ui-message').innerHTML = 'In this experience you will be remotely collaborating with a sound performance with your drawings. To start interacting create your username and click start.'
}

function buttonSubmit(){
    if(input.value == '') return
    const username = input.value
    socket.emit('nickname', username)

    document.getElementById('client-welcome-alert').remove()
    document.getElementById('client-draw-container').style.display = 'block'
    document.getElementById('top-bar-title-p').innerHTML = 'Interactive Browser Experience – ' + username

    const clientWrap = document.getElementById('client-canvas-wrapper')
    const cnv = createCanvas(clientWrap.clientWidth, clientWrap.clientWidth * 9 / 16)
    clientWrap.appendChild(canvas)
    background(255)
    // Assuming we are covering only one octave
    strokeWeight(height / 12)

    clearBtn = document.getElementById('clear-btn')
    clearBtn.addEventListener('click', clearCurves)

    onInterface = true
}

// Mouse moved event for desktop devices
function mousePressed(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveStart()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'start'})
    }
}

function mouseDragged(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'dragged'})
    }
}

function mouseReleased(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'dragged'})
    }
}

// Touch events for mobile devices
function touchStarted(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveStart()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'start'})
    }
    // return false
}

function touchMoved(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'dragged'})
    }            
    return false
}

function touchEnded(){
    if(onInterface && mouseX <= width && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, action: 'dragged'})
    }
    // return false
}

function curveStart(){
    curves.shape.push([])
    let pos = curveDuring()
    return pos
}

function curveDuring(){
    let x = constrain(map(mouseX, 0, width, 0, 1), 0, 1)
    let y = constrain(map(mouseY, 0, height, 0, 1), 0, 1)
    // console.log('x: ' + x + ', y: ' + y)
    curves.shape[curves.shape.length - 1].push({x: x, y: y})
    drawCurve()
    return {x: x, y: y}
}

function drawCurve(){
    let aux = curves.shape[curves.shape.length - 1]
    if(aux.length >= 2) line(aux[aux.length - 2].x * width, aux[aux.length - 2].y * height, aux[aux.length - 1].x * width, aux[aux.length - 1].y * height)
}

function clearCurves(){
    curves = {shape: []}
    background(255)
    // rect(0, 0, width, height)
    socket.emit('client interacted', {x: 0, y: 0, action: 'reset'})
    stopNotes()
}

// Declare tone syntheziser
const masterGain = new Tone.Gain(.25).toDestination()
const synth = new Tone.PolySynth().connect(masterGain)
synth.options.envelope.attack = 0.1,
synth.options.envelope.release = 0.3


function playNote(beat){
    for (let i = 0; i < numNotes; i++){
        let vertexCount = 0
        const noteArea = {x1: (beat - 1) / timeNumerator, y1: i / numNotes, x2: beat / timeNumerator, y2: (i + 1) / numNotes}
        curves.shape.forEach(curve => {
            curve.forEach((vertex) => {
                if(vertex.x >= noteArea.x1 && vertex.x <= noteArea.x2 && vertex.y >= noteArea.y1 && vertex.y <= noteArea.y2) vertexCount++
            })
        })
        // when detecting a note send note on
        if(vertexCount >= 1) {
            // on other beats just compare
            if(beat == 1 || previousNotes[i] == false) {
                // play note
                // console.log('play ' + 60 + numNotes - i)
                let freq = Tone.Midi(60 + numNotes - i).toFrequency()
                synth.triggerAttack(freq, Tone.now())
            }
            previousNotes[i] = true
        }
        // when detecting no note send note off
        else{
            if(beat == 1 || previousNotes[i] == true) {
                // stop note
                // console.log('release ' + 60 + numNotes - i)
                let freq = Tone.Midi(60 + numNotes - i).toFrequency()
                synth.triggerRelease(freq, Tone.now())
            }
            previousNotes[i] = false
        }
    }
}

function stopNotes(){
    for(let i = 0; i < numNotes; i++){
        let freq = Tone.Midi(60 + numNotes - i).toFrequency()
        synth.triggerRelease(freq, Tone.now())
    }
}