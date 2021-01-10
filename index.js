const express = require('express')
const path = require('path')

// Instantiate express app
const app = express()

const server = require('http').createServer(app)

// HTTP framework for socket
const port = process.env.PORT || 3000
server.listen(port, function(){
    console.log('Interactive browser Multiuser v1 listening on port ' + port)
})

// TODO: solve CORS block to client's connection since socket.io v3 is used
const io = require('socket.io')(server)

let clients = [], adimConnected = false

app.use(express.static('public'))

// on get '/' send sender
app.get('/', function (req, res){
    res.sendFile(path.join(__dirname, '/public/client.html'))
})

app.get('/admin', function (req, res){
    res.sendFile(path.join(__dirname, '/public/admin.html'))
})

// Socket events
io.on('connection', function (socket){

    socket.on('nickname', function(data){
        socket.username = data
        if(data == 'admin') adimConnected = true
        else socket.broadcast.emit('new client to admin', {id: socket.id, username: socket.username})
        clients.push({id: socket.id, username: data})
        console.log(socket.username + ' connected')
    })

    socket.on('client interacted', function (data){
        // console.log('user #' + socket.username + ' moved x: ' + data.x + ' y: ' + data.y + 'action: ' + data.action)
        socket.broadcast.emit('data to admin', {id: socket.id, username: socket.username, x: data.x, y: data.y, action: data.action})
    })

    socket.on('disconnect', function(){
        if(socket.username == 'admin') adimConnected = false
        socket.broadcast.emit('disconnect to admin', {id: socket.id})
        console.log(socket.username + ' disconnected')
        // find the element's position within clients and remove it
        let index = clients.findIndex(element => element.id === socket.id)
        clients.splice(index, 1)
    })
})