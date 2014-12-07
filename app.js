var shortId = require('shortid');
var express = require('express.io');
var eden = require('node-eden');
var app = express().http().io();

app.use(express.cookieParser());
app.use(express.session({secret: 'monkey'}));

var rooms = {};
var offlineMsg = {};

// Setup the ready route, join room and broadcast to room.
app.io.route('ready', function(req) {
    req.io.join(req.session.room);

    if ( req.session.name in offlineMsg[req.session.room] ) {
        console.log('reconnecting');
        offlineMsg[req.session.room][req.session.name]
            .forEach(function (msg) {
                req.io.emit('inbound', msg);
            });

        delete offlineMsg[req.session.room][req.session.name];
    }
    req.io.room(req.session.room).broadcast('announce', {
        message: req.session.name + ' enter room.'
    });
    app.io.room(req.session.room).broadcast('inbound', {
        message: req.session.name + ' wellcome.'
    });
});

app.io.route('disconnect', function (req) {
    console.log(req.session.name, 'left', req.session.room);
    if ( req.session.name && req.session.room ) {
        offlineMsg[req.session.room][req.session.name] = [];
    }
});

app.io.route('outbound', function(req) {
    
    var msg = {
        message: req.data.message,
        from: req.session.name
    }

    req.io.room(req.session.room).broadcast('inbound', msg);
    
    for ( var user in offlineMsg[req.session.room] ) {
        offlineMsg[req.session.room][user].push(msg);
    }
});

// Send the client html.
app.get('/', function(req, res) {
    res.redirect('/new-room');
});

app.get('/new-room', function(req, res) {
    var roomId = shortId.generate();
    rooms[roomId] = {};
    offlineMsg[roomId] = {};

    app.io.broadcast(roomId, 'announce', {
        message: req.session.name + ' join room. '
    });

    res.redirect('/room/' + roomId);
});

app.get('/room/:roomId', function(req, res) {
    if (!req.session.name) {
        req.session.name = eden.adam();
    }
    if ( ! (req.params.roomId in rooms) ) {
        res.redirect('/new-room');
        return;
    }

    req.session.room = req.params.roomId;
    res.sendfile(__dirname + '/room.html');
});

app.listen(7076)
console.log('localhost:7076');