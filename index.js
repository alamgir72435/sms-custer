const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Pusher = require('pusher');
const cors = require('cors');
const socketio = require('socket.io');
const { v4 } = require('uuid');

const port = process.env.PORT || 5000;

// middleware
app.set('view engine', 'ejs');
app.use(express.json());

app.use(cors());
app.use(express.static('public'));

const uri =
	'mongodb+srv://admin:admin@cluster0.pnvh0.mongodb.net/sms-custer?retryWrites=true&w=majority';

// mongoodb connection
// mongoose
// 	.connect(uri, {
// 		useNewUrlParser: true,
// 		useUnifiedTopology: true,
// 		useFindAndModify: true,
// 	})
// 	.then((db) => {
// 		console.log('Mongodb Connected');
// 	});

const messageSchema = mongoose.Schema(
	{
		number: {
			type: String,
			required: true,
		},
		body: {
			type: String,
			required: true,
		},
		status: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);
const Message = mongoose.model('sms', messageSchema);

// home page
app.get('/', (req, res) => {
	res.render('home');
});

app.get('/send', (req, res) => {
	res.render('socket');
});
app.get('/bulk-send', (req, res) => {
	res.render('bulk');
});

app.get('/report', (req, res) => {
	res.render('report');
});

// app.post("/send", async (req, res) => {
// 	const { number, body } = req.body;
// });

app.get('/messages', async (req, res) => {
	const messages = await Message.findOne({ status: false });
	res.json(messages);
});

app.get('/message/all', async (req, res) => {
	// const messages = await Message.find();
	// res.json(messages);
	res.send([]);
});

app.get('/mark-as-sent/:id', async (req, res) => {
	try {
		const message = await Message.findOne({ _id: req.params.id });
		message.status = true;
		await message.save();
		res.json({ status: true });
	} catch (error) {
		res.json({ status: true });
	}
});

//////////////////////////////===============================

const server = app.listen(port, console.log('server running on port ' + port));

const io = socketio(server);
var messages;

// let interval = 15000;
// let totalTime = 0;

let deviceList = [];

io.on('connection', (socket) => {
	console.log('Connected', socket.id);

	socket.on('browser-client-connected', () => {
		console.log('Browser client connected');
		socket.emit('connected-device', deviceList);
	});

	// Ping
	socket.on('device-connect', (deviceInfo) => {
		console.log('Device connected');
		deviceList.push({ ...deviceInfo, status: 'online', socketId: socket.id });
		socket.broadcast.emit('connected-device', deviceList);
	});

	socket.on('ping', (deviceInfo) => {
		try {
			const index = deviceList.findIndex(
				(x) => String(x.id) === String(deviceInfo?.id)
			);
			console.log(index, deviceList[index]);
			if (index > -1) {
				deviceList[index].deviceName = deviceInfo.deviceName;
				socket.broadcast.emit('connected-device', deviceList);
			}
		} catch (error) {}
	});

	socket.on('message', async (message) => {
		const { number, body } = message;
		// const mst = await new Message({ number, body }).save();
		// messages = mst;
		console.log('sending sms', message);
		// socket.('send-sms', messages);
		socket.broadcast.emit('send-sms', message);
	});

	// On Device Disconnect Remove Device
	socket.on('disconnect', (info) => {
		console.log('disconnect', info);
	});
});
