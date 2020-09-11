const express = require('express')
const path = require('path')
const url = require('url')

// Instantiate express app
const app = express()

const server = require('http').Server(app)
const io = require('socket.io')(server)

let users = []

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

    socket.on('nickname', function(data){
        socket.username = data
        users.push({id: socket.id, username: data})
        // console.log(users)
        console.log(socket.username + ' connected')
    })

    socket.on('mouse moved', function (data){
        // console.log('user #' + socket.username + ' moved x: ' + data.x + ' y: ' + data.y)
        socket.broadcast.emit('to receiver', data)
    })

    socket.on('disconnect', function(){
        console.log(socket.username + ' disconnected.')
        // find the element's position within users and remove it
        let index = users.findIndex(element => element.id === socket.id)
        users.splice(index, 1)
    })
})

app.listen(3000, function (){
    console.log('Interactive browser Multiuser v1 listening on port 3000')
})