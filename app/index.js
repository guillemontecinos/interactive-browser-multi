const express = require('express')
const path = require('path')
const url = require('url')

// Instantiate express app
const app = express()

const server = require('http').Server(app)
const io = require('socket.io')(server)



// HTTP framework for socket
const httpPort = 80
server.listen(httpPort)

// on get '/' send sender
app.get('/', function (req, res){
    res.sendFile(path.join(__dirname, '/private/sender.html'))
})

app.get('/receiver', function (req, res){
    res.sendFile(path.join(__dirname, '/private/receiver.html'))
})

// on get '/receiver' send receiver

// Socket events
io.on('connection', function (socket){
    socket.emit('connection answer', {hello: 'hello sender!'})
    socket.on('mouse moved', function (data){
        console.log(data)
        socket.broadcast.emit('to receiver', data)
    })
})

app.listen(3000, function (){
    console.log('Interactive browser Multiuser v1 listening on port 3000')
})