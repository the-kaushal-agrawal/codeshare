const log = console.log;
const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const public_path = path.join(__dirname);
const{Users} = require('./users');
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
let users = new Users();
const {isRealString} = require('./isRealString');
const port = process.env.PORT || 3000;
const request = require('request');
const bodyParser = require('body-parser')


app.use(bodyParser.json())
app.use(express.static(public_path));

const logRequestStart = (req, res, next) => {
  console.info(`${req.method} ${req.originalUrl}`)
  next()
}

app.use(logRequestStart)

 

const Ussers = {}
var users_in = new Map()
var users_id = new Map()
var current_new_id = 0;
var numClients;
var ROOMID;

numClients = {};

var PARAMS, PARAMS_NAME;
var flg;

io.on('connection', (socket) => {
    log('connected')
    flg = 0;
    socket.on('join', (params, callback) => {
      console.log(params)
    if(!isRealString(params.name) || !isRealString(params.room)){
      return callback('name and room are required');
    }
    PARAMS = params.room;
    ROOMID = params.room;
    socket.room = params.room;
    PARAMS_NAME = params.name;
    
    if (numClients[params.room] == undefined || numClients[params.room] == 0) {
      console.log(`Creating room ${params.room} and emitting room_created socket event`)
      socket.join(params.room)
      socket.emit('room_created', params.room)
    } else if(numClients[params.room] == 1) {
      console.log(`Joining room ${params.room} and emitting room_joined socket event`)
      socket.join(params.room)
      socket.emit('room_joined', params.room)
    } else {
      flg = 1;
       console.log(`Can't join room ${params.room}, emitting full_room socket event`)
       socket.emit('full_room', params.room)
    }
    if (numClients[params.room] == undefined || numClients[params.room] == 0) {
        numClients[params.room] = 1;
    } else {
        numClients[params.room]++;
    }
      if(flg == 0){
        Ussers[socket.id] = current_new_id++;
        users_in.set(current_new_id - 1, params.room)
        users_id.set(current_new_id - 1, params.name)

    socket.join(params.room); 
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);
    
    socket.to(params.room).emit('user-connected', params.name );
    io.to(params.room).emit('in_face', numClients[params.room]);
    }
  })

  

  socket.on('start_call', (roomId) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`)
    socket.broadcast.to(roomId).emit('start_call')
  })
  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_offer', event.sdp)
  })
  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_answer', event.sdp)
  })
  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate', event)
  })
 

    socket.on('noCheat', () =>
    {
      socket.to(users_in.get(Ussers[socket.id])).emit('cheating', {name: users_id.get(Ussers[socket.id]), num : 0})
    })

    socket.on('cheat', () => 
    {
      socket.to(users_in.get(Ussers[socket.id])).emit('cheating', {name: users_id.get(Ussers[socket.id]), num : 1})
    })

     socket.on('send-chat-message', message => {
    
       socket.to(message.roomId).emit('chat-message', { message: message.message, name: users_id.get(Ussers[socket.id]) });  
    })

    socket.on('alert_users', () => {
      socket.to(users_in.get(Ussers[socket.id])).emit('alert_user', users_id.get(Ussers[socket.id]));
    })


    socket.on('disconnect', () => {
      socket.join(users_in.get(Ussers[socket.id]))
      
      socket.to(users_in.get(Ussers[socket.id])).emit('user-disconnected', {name: users_id.get(Ussers[socket.id]), numP: numClients[users_in.get(Ussers[socket.id])] - 1})
      users_in.delete(Ussers[socket.id])
      users_id.delete(Ussers[socket.id])
      delete Ussers[socket.id]
      
      if(numClients[ROOMID] == 0)
          numClients[ROOMID] = undefined;
          else
            numClients[ROOMID]--;
          console.log(numClients)
      
        socket.emit("dis")
      
      })

    socket.on('message', (evt) => {
        
        let user = users.getUser(socket.id);
        socket.broadcast.to(user.room).emit('message', evt)
    })
    function compile(code, input, language) {
   
  var program = {
    script: `${code}` ,
    stdin: `${input}`,
    language: `${language}`,
    versionIndex: "0",
    clientId: "78ac5a00ef4dc94e4560bcf2f7587869",
    clientSecret:"13edd9c3d46c9ec50ae774c6fa5bcc65c24117b87be1b4e19d7edcaf4deb6225"
  };
  request({
      url: 'https://api.jdoodle.com/v1/execute',
      method: "POST",
      json: program
  },
  function (error, response, body) {
    console.log(code)
      console.log('error:', error);
      console.log('statusCode:', response && response.statusCode);
      console.log('body:', body);
      if(error)
      socket.emit('output', (error))
    else
      socket.emit('output', (body))

      socket.to(users_in.get(Ussers[socket.id])).emit('loadIt', 0);
  });
  }

    socket.on('news',(code) =>{ 
      console.log(code.code)
      console.log(code.inp)
      console.log(code.lang)

      socket.to(users_in.get(Ussers[socket.id])).emit('loadIt', 1);
      compile(code.code, code.inp, code.lang)
  })
    
    socket.on('disconnect', (evt) => {
    log('some people left') 
    })
})


server.listen(port, () => log(`server listening on port: ${port}`))
