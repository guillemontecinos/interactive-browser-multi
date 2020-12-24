let lastNote
let ppqnCount = 0
let barCount = 1

WebMidi.enable(function (err) {
    // Adds inputs to the dropdown menu when new ports connect
    WebMidi.addListener('connected', (e) => {
        
        // if (e.port.type == 'input' && !document.getElementById(e.port.id)) {
            console.log(e.port.name + ' connected')
        // }
        if(WebMidi.getInputById(e.port.id)) return
        
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('start', 'all', (e) => {
            console.log(e)
        })
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('stop', 'all', (e) => {
            console.log(e)
            ppqnCount = 0
            barCount = 1
        })
        WebMidi.getInputByName('auxVirtualPort Bus 1').addListener('clock', 'all', (e) => {
            ppqnCount++
            if(ppqnCount == 0 || ppqnCount == 24){
                ppqnCount = 0
                barCount++
                if(barCount == 5) barCount = 1
                console.log('bar: ' + barCount)
                // calculate and send notes
                sendNote()
            }
        })
    })
})

// Listener callbacks
function noteOn(e) {
    console.log('Received \'noteon\' message (' + e.note.name + e.note.octave + ').')
    lastNote = e.note.number
    freq1 = Tone.Midi(e.note.number).toFrequency()
    osc1.frequency.value = freq1
    freq2 = freq1 * osc2Detune
    osc2.frequency.value = freq2
    outputEnv.triggerAttack(Tone.now(), 1)
}

function noteOff(e) {
    console.log("Received 'noteoff' message (" + e.note.name + e.note.octave + ").")
    if(e.note.number == lastNote) outputEnv.triggerRelease(Tone.now())
}

function controlChange(e) {
    console.log('CC received: ' + e.value + ', ch: ' + e.channel)
    ui.setValue(cc2id[Number(e.channel) - 1], Number(e.value))
    readKnobs()
    if(midiEnabled || Number(e.channel) == 1) outputEnv.triggerAttack(Tone.now(), 1)
}

function sendNote(){
    WebMidi.getOutputByName('auxVirtualPort Bus 1').playNote(
        Math.floor(Math.random() * 127), 
        'all', 
        {
            duration: 2000, 
            velocity: Math.random() * .85
        })
}