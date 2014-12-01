var shortId = require('shortid');
var express = require('express.io');
var eden = require('node-eden');
var app = express().http().io();

app.use(express.cookieParser());
app.use(express.session({secret: 'monkey'}));

var rooms = {};

// Setup the ready route, join room and broadcast to room.
app.io.route('ready', function(req) {
    req.io.join(req.session.room);
    req.io.room(req.session.room).broadcast('announce', {
        message: req.session.name + ' enter room.'
    });
    app.io.room(req.session.room).broadcast('inbound', {
        message: req.session.name + ' wellcome.'
    });
});

app.io.route('outbound', function(req) {
    req.io.room(req.session.room).broadcast('inbound', {
        message: req.data.message,
        from: req.session.name
    });
});

// Send the client html.
app.get('/', function(req, res) {
    res.redirect('/new-room');
});

app.get('/new-room', function(req, res) {
    var roomId = shortId.generate();
    rooms[roomId] = {};

    app.io.broadcast(roomId, 'announce', {
        message: req.session.name + ' join room. '
    });

    res.redirect('/join/' + roomId);
});

app.get('/join/:roomId', function(req, res) {
    if (!req.session.name) {
        req.session.name = eden.adam();
    }

    req.session.room = req.params.roomId;
    res.sendfile(__dirname + '/room.html');
});

app.listen(7076)