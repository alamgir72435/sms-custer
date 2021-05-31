const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Pusher = require("pusher");
const cors = require("cors");
const socketio = require("socket.io");

const port = process.env.PORT || 5000;
const pusher = new Pusher({
	appId: "1211907",
	key: "42ff087f118be67c0315",
	secret: "eb438b15df05ab708ab5",
	cluster: "ap2",
	useTLS: true,
});

// middleware
app.set("view engine", "ejs");
app.use(express.json());
app.get("/", (req, res) => {
	res.render("home");
});
app.use(cors());

const uri =
	"mongodb+srv://admin:admin@cluster0.pnvh0.mongodb.net/sms-custer?retryWrites=true&w=majority";

// mongoodb connection
mongoose.connect(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: true,
});

const messageSchema = mongoose.Schema({
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
});

const Message = mongoose.model("sms", messageSchema);

app.post("/send", async (req, res) => {
	const { number, body } = req.body;
	try {
		if (!number || number === "") {
			throw Error("Number is not valid");
		}
		if (!body || body === "") {
			throw Error("Body is not valid");
		}
		await new Message({
			number,
			body,
		}).save();
		const payload = JSON.stringify({
			id: String(Math.random()).split(".")[1],
			body: body,
			number: number,
		});
		pusher.trigger("sms-channel", "message", payload);
		res.json({ status: true });
	} catch (error) {
		res.json({ status: false });
	}
});

app.get("/messages", async (req, res) => {
	const messages = await Message.findOne({ status: false });
	res.json(messages);
});

app.get("/mark-as-sent/:id", async (req, res) => {
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

app.get("/socket", (req, res) => {
	res.render("socket");
});

const server = app.listen(port, console.log("server running on port " + port));

const io = socketio(server);
const messages = [];

io.on("connection", (socket) => {
	console.log("Connected", socket.id);
	socket.broadcast.emit("all", messages);
	socket.on("message", (message) => {
		messages.push(message);
		socket.broadcast.emit("all", messages);
		socket.emit("sender", messages);
	});
});
