const express = require('express');
const app = express();
const cors = require('cors');
const socketio = require('socket.io');
const { v4 } = require('uuid');
//

const port = process.env.PORT || 5555;

// middleware
app.set('view engine', 'ejs');
app.use(express.json());

app.use(cors());
app.use(express.static('public'));

// home page
app.get('/', (req, res) => {
	res.render('home');
});

app.get('/custer/app', (req, res) => {
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
	// const messages = await Message.findOne({ status: false });
	// res.json(messages);
	return res.json([]);
});

app.get('/', async (req, res) => {
	return res.send('custer running ');
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

var smsQueue = [];

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
		// const { number, body } = message;
		console.log('sending sms', message);
		const find = smsQueue.find((msg) => msg._id === message._id);
		if (!find) {
			smsQueue.unshift(message);
			// Send Message
			sendSmsFromQueue();
		}
	});

	// On Message Successfully Send
	socket.on('message-sent-report', (message) => {
		console.log('Message sent Successfull');
		socket.broadcast.emit('message-sent', message);
	});

	// saved message to queue
	socket.on('queued-message', (messages) => {
		let log = `Reaceived Queue Request of ${messages.length} message`;
		socket.broadcast.emit('log', log);
		console.log(log);
		for (let each of messages) {
			const find = smsQueue.find((msg) => msg._id === each._id);
			if (!find) {
				smsQueue.unshift(each);
				let newSmsFoundLog = `New Sms saved in Queue ${each._id} `;
				console.log(newSmsFoundLog);
				socket.broadcast.emit('log', newSmsFoundLog);
			}
		}

		// after Finished saved to Queue now Send Message from Queue
		sendSmsFromQueue();
	});

	function sendSmsFromQueue() {
		if (smsQueue.length > 0) {
			let message = smsQueue.pop();
			console.log('Sending Message ', message._id);
			socket.broadcast.emit('send-sms', message);
		}
	}

	// Logs Are Here
	socket.on('new-log', (log) => {
		console.log('New Log Created');
		socket.broadcast.emit('log', log);
	});

	// On Device Disconnect Remove Device
	socket.on('disconnect', (info) => {
		console.log('disconnect', info);
	});
});
