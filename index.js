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

let clients = [], adminConnected = false

app.use(express.static('public'))

// on get '/' send sender
app.get('/', function (req, res){
    res.sendFile(path.join(__dirname, '/public/client.html'))
})

app.get('/admin', function (req, res){
    if(!adminConnected) res.sendFile(path.join(__dirname, '/public/admin.html'))
    else res.sendFile(path.join(__dirname, '/public/client.html'))
})

app.get('/viewer', function (req, res){
    res.sendFile(path.join(__dirname, '/public/viewer.html'))
})

// Socket events
io.on('connection', function (socket){
    
    socket.emit('admin status', {status: adminConnected})
    
    socket.on('nickname', function(data){
        socket.username = data
        if(data == 'admin') {
            adminConnected = true
            socket.broadcast.emit('admin connected', {status: adminConnected})
        } 
        else if(data == 'viewer') {
            socket.emit('initial data to viewer', clients)
        }
        else socket.broadcast.emit('new client', {id: socket.id, username: socket.username})
        clients.push({id: socket.id, username: data, shape: []})
        console.log(socket.username + ' connected')
    })

    socket.on('client interacted', function (data){
        // console.log('user #' + socket.username + ' moved x: ' + data.x + ' y: ' + data.y + 'action: ' + data.action)
        socket.broadcast.emit('new data', {id: socket.id, username: socket.username, x: data.x, y: data.y, stroke: data.stroke, action: data.action})
        // check what client is sending data
        const index = clients.findIndex(element => element.id === socket.id)
        // push path to client
        if(data.action == 'start'){
            clients[index].shape.push([])
            clients[index].shape[clients[index].shape.length - 1].push({x: data.x, y: data.y, stroke: data.stroke})
        }
        else if(data.action == 'dragged'){
            clients[index].shape[clients[index].shape.length - 1].push({x: data.x, y: data.y, stroke: data.stroke})
        }
        else if(data.action == 'reset'){
            clients[index].shape = []
        }
        // console.log(clients)
    })

    socket.on('disconnect', function(){
        if(socket.username == 'admin') {
            adminConnected = false
            socket.broadcast.emit('admin disconnected', {status: adminConnected})
        } 
        socket.broadcast.emit('client disconnects', {id: socket.id})
        console.log(socket.username + ' disconnected')
        // find the element's position within clients and remove it
        const index = clients.findIndex(element => element.id === socket.id)
        clients.splice(index, 1)
    })

    socket.on('admin-play', function(data){
        socket.broadcast.emit('client-play', data)
    })

    socket.on('admin-clock', function(data){
        socket.broadcast.emit('client-clock', data)
    })

    socket.on('admin-playing-on-connection', function(data){
        socket.broadcast.emit('client-play-on-connection', data)
    })

    socket.on('scale-setup', function(data){
        socket.broadcast.emit('client-scale-setup', {id: socket.id, scale: data.scale})
    })

    socket.on('octave-setup', function(data){
        socket.broadcast.emit('client-octave-setup', {id: socket.id, octave: data.octave})
    })

    socket.on('key-setup', function(data){
        socket.broadcast.emit('client-key-setup', {id: socket.id, key: data.key})
    })
})