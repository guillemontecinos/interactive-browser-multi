// Interactive Browser Multiuser - Client
// by Guillermo Montecinos

// Source: https://socket.io/docs/#Using-with-Express
// TODO: update this address with the current IP

const socket = io()
let input, button, onInterface = false, curves, clearBtn, adminConnected = false

// Admin connected checker
socket.on('connect', () => {
    if(onInterface){
        // alert('Server not conneted, please reset.')
        document.getElementById('client-draw-container').style.display = 'none'
        document.getElementById('client-welcome-alert').style.display = 'block'
        document.getElementById('ui-message').innerHTML = 'The APP restarted due to a conection failure. Please reinsert your username.'
        document.getElementById('username-value').value = ''
    }
})

socket.on('disconnect', () => {
    alert('Server disconnected, please wait for it to reconnect')
})

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

let numNotes = 7
let scale = new Array()
let scaleOnUse = new Array()
let scalePattern = new Array(12).fill(true)
let previousNotes = new Array(numNotes).fill(false)
let octave = 0
const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
let currentKey = 0
let barCount = 1
let ppqnCount = 0
let timeNumerator = 4
let timeDenominator = 4
let timeResolution = 4
let bars = 1

socket.on('client-play', (data) => {
    if(data.status == 'play'){
        timeNumerator = data.timeNumerator
        timeDenominator = data.timeDenominator
        timeResolution = data.timeResolution
        // previousNotes = new Array(numNotes).fill(false)
        console.log('client play')
        console.log('bar: 1')
        playNote(1)
    }
    else if(data.status == 'stop'){
        ppqnCount = 0
        console.log('client stop')
        stopNotes()
    }
    // reset grid
    background(255)
    drawGrid()
    reDrawCurves()
})

socket.on('client-play-on-connection', (data) => {
    if(socket.id == data.id) {
        timeNumerator = data.timeNumerator
        timeDenominator = data.timeDenominator
        timeResolution = data.timeResolution
        // previousNotes = new Array(numNotes).fill(false)
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
    input.focus()
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

let strokeFactor = 15
const clientWrap = document.getElementById('client-canvas-wrapper')
const strokeButtons = document.getElementsByClassName('stroke-btn')
const notesCheckboxes = document.getElementsByClassName('note-checkbox')
function buttonSubmit(){
    if(input.value == '') return
    const username = input.value
    socket.emit('nickname', username)

    curves = {shape: []}

    document.getElementById('client-welcome-alert').style.display = 'none'
    document.getElementById('client-draw-container').style.display = 'block'
    document.getElementById('top-bar-title-p').innerHTML = 'Interactive Browser Experience – ' + username
 
    createCanvas(clientWrap.clientWidth, clientWrap.clientWidth * 9 / 16)
    clientWrap.appendChild(canvas)
    background(255)

    clearBtn = document.getElementById('clear-btn')
    clearBtn.addEventListener('click', clearCurves)

    // Setup listeners to keep track of octave
    document.getElementById('octave-button-left').addEventListener('click', function() {
        if(octave >= -1) {
            octave--
            displayOctave(octave)
        }
    })
    document.getElementById('octave-button-right').addEventListener('click', function() {
        if(octave <= 1) {
            octave++
            displayOctave(octave)
        }
    })
    
    // Setup listeners to keep track of Key
    document.getElementById('key-button-left').addEventListener('click', function() {
        if(currentKey > 0) currentKey--
        // The line below makes it a carrousel
        // else if(currentKey == 0) currentKey = keys.length - 1
        displayKey(currentKey)
    })
    document.getElementById('key-button-right').addEventListener('click', function() {
        if(currentKey < keys.length - 1) currentKey++
        // else if(currentKey == keys.length - 1) currentKey = 0
        displayKey(currentKey)
    })

    // Setup listeners to keep track of notes checkboxes
    for(let i = 0; i < notesCheckboxes.length; i++) {
        notesCheckboxes[i].addEventListener('click', function(){
            // There cannot be zero notes 
            if (!notesCheckboxes[i].checked && scale.length == 1) {
                notesCheckboxes[i].checked = true
            }
            else {
                scalePattern[Number(notesCheckboxes[i].value) - 1] = notesCheckboxes[i].checked
                // Reset numNotes
                scale.length = 0
                scalePattern.forEach((note, i) => {
                    if(note) {
                        scale.push(i + 1)
                    }
                })
            }            
            socket.emit('scale-setup', {scale: scale})
            // Update background grid
            background(255)
            drawGrid()
            reDrawCurves()
        })
        // Setup initial major scale on checkers and scalePattern array
        const val = notesCheckboxes[i].value
        if(val == '1' || val == '3' || val == '5' || val == '6' || val == '8' || val == '10' || val == '12') {
            notesCheckboxes[i].checked = true
        }
        else {
            notesCheckboxes[i].checked = false
            scalePattern[Number(notesCheckboxes[i].value) - 1] = false
        }  
    }
    scale.length = 0
    scalePattern.forEach((note, i) => {
        if(note) scale.push(i + 1)
    })
    scaleOnUse = scale

    // Setup listeners for bar selector buttons
    document.getElementById('bar-button-left').addEventListener('click', function() {
        if(bars > 1) bars--
        displayBars(bars)
    })
    document.getElementById('bar-button-right').addEventListener('click', function() {
        if(bars < 3) bars++
        displayBars(bars)
    })

    // Setup listeners for when stroke buttons are pressed, and setup initial sizes
    for (let i = 0; i < strokeButtons.length; i++) {
        strokeButtons[i].addEventListener('click', function() {
            strokeFactor = Number(this.value)
            console.log('strokeFactor: ' + strokeFactor)
        })
        strokeButtons[i].firstElementChild.style.width = height / Number(strokeButtons[i].value) + 'px'
    }
    document.getElementById('client-right-ui').style.width = height / Number(strokeButtons[0].value) + 10 + 'px'
    document.getElementById('client-scale-ui').style.width = height / Number(strokeButtons[0].value) + 10 + 'px'

    onInterface = true
    drawGrid()
}

// Additional functions for listeners setup after button pressed
function displayOctave(value){
    socket.emit('octave-setup', {octave: value})
    if(value > 0) value = '+' + value
    document.getElementById('octave-display').innerHTML = value
}

function displayKey(value){
    socket.emit('key-setup', {key: value})
    document.getElementById('key-display').innerHTML = keys[value]
}

function displayBars(value){
    socket.emit('bars-setup', {bars: value})
    document.getElementById('bar-display').innerHTML = bars
    background(255)
    drawGrid()
    reDrawCurves()
}

// Mouse moved event for desktop devices
function mousePressed(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveStart()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'start'})
    }
}

function mouseDragged(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'dragged'})
    }
}

function mouseReleased(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'dragged'})
    }
}

// Touch events for mobile devices
function touchStarted(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveStart()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'start'})
    }
    // return false
}

function touchMoved(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'dragged'})
    }            
    return false
}

function touchEnded(){
    if(onInterface && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
        let pos = curveDuring()
        socket.emit('client interacted', {x: pos.x, y: pos.y, stroke: strokeFactor, action: 'dragged'})
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
    curves.shape[curves.shape.length - 1].push({x: x, y: y, stroke: strokeFactor})
    drawCurve()
    return {x: x, y: y}
}

function drawCurve(){
    stroke(0)
    let aux = curves.shape[curves.shape.length - 1]
    if(aux.length >= 2) {
        strokeWeight(height / aux[aux.length - 2].stroke)
        line(aux[aux.length - 2].x * width, aux[aux.length - 2].y * height, aux[aux.length - 1].x * width, aux[aux.length - 1].y * height)
    }
}

function clearCurves(){
    curves = {shape: []}
    background(255)
    socket.emit('client interacted', {x: 0, y: 0, action: 'reset'})
    stopNotes()
    drawGrid()
}

function reDrawCurves(){
    stroke(0)
    curves.shape.forEach(shape => {
        const numVertices = shape.length
        if(numVertices >= 2) {
            for(let i = 0; i < numVertices - 1; i++){
                strokeWeight(height / shape[i].stroke)
                line(shape[i].x * width, shape[i].y * height, shape[i + 1].x * width, shape[i + 1].y * height)
            }
        }
    })
}

function drawGrid() {
    stroke(200)
    strokeWeight(1)
    // Draw notes
    const yStep = height / scale.length
    for(let y = 1; y < scale.length; y++) {
        line(0, y * yStep, width, y * yStep)
    }
    // Draw time
    const numLines = timeNumerator * timeResolution * bars
    const xStep = width / numLines
    for(let x = 1; x < numLines; x++) {
        if(x % (timeNumerator * timeResolution) == 0) {
            stroke(80 + 20 * bars)
            strokeWeight(3)
        }
        else if(x % timeResolution == 0) {
            stroke(150 + 20 * bars)
            strokeWeight(2)
        }
        else {
            stroke(190 + 15 * bars)
            strokeWeight(1)
        }
        line(x * xStep, 0, x * xStep, height)
    }
}

// Declare tone syntheziser
const masterGain = new Tone.Gain(0).toDestination()
const synth = new Tone.PolySynth().connect(masterGain)
synth.options.envelope.attack = 0.1,
synth.options.envelope.release = 0.3

let octaveOnUse = 0
let keyOnUse = 0
function playNote(beat){
    if(beat == 1) {
        numNotes = scale.length
        scaleOnUse = scale
        previousNotes.length = 0
        previousNotes = new Array(numNotes).fill(false)
        octaveOnUse = octave
        keyOnUse = currentKey
    }
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
                let freq = Tone.Midi(60 + octaveOnUse * 12 + keyOnUse + scaleOnUse[numNotes - i - 1] - 1).toFrequency()
                synth.triggerAttack(freq, Tone.now())
            }
            previousNotes[i] = true
        }
        // when detecting no note send note off
        else{
            if(beat == 1 || previousNotes[i] == true) {
                // stop note
                let freq = Tone.Midi(60 + octaveOnUse * 12 + keyOnUse + scaleOnUse[numNotes - i - 1] - 1).toFrequency()
                synth.triggerRelease(freq, Tone.now())
            }
            previousNotes[i] = false
        }
    }
}

function stopNotes(){
    scaleOnUse.forEach(note => {
        let freq = Tone.Midi(60 + octaveOnUse * 12 + keyOnUse + note).toFrequency()
        synth.triggerRelease(Tone.now())
    })
}

window.addEventListener('resize', updateCanvasSize)

function updateCanvasSize(){
    resizeCanvas(clientWrap.clientWidth, clientWrap.clientWidth * 9 / 16)
    background(255)
    drawGrid()
    stroke(255)
    if(curves.shape.length >= 1){
        curves.shape.forEach(aux => {
            if(aux.length >= 2) {
                for(let i = 1; i < aux.length; i++) {
                    strokeWeight(height / aux[i].stroke)
                    line(aux[i].x * width, aux[i].y * height, aux[i - 1].x * width, aux[i - 1].y * height)
                }
            }
        })
    }
    for (let i = 0; i < strokeButtons.length; i++) {
        strokeButtons[i].firstElementChild.style.width = height / Number(strokeButtons[i].value) + 'px'
    }
    document.getElementById('client-right-ui').style.width = height / Number(strokeButtons[0].value) + 10 + 'px'
    document.getElementById('client-scale-ui').style.width = height / Number(strokeButtons[0].value) + 10 + 'px'
}