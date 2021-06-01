const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Pusher = require("pusher");
const cors = require("cors");
const socketio = require("socket.io");
const { v4 } = require("uuid");

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

app.use(cors());
app.use(express.static("public"));

const uri =
	"mongodb+srv://admin:admin@cluster0.pnvh0.mongodb.net/sms-custer?retryWrites=true&w=majority";

// mongoodb connection
mongoose
	.connect(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: true,
	})
	.then((db) => {
		console.log("Mongodb Connected");
	});
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
const Message = mongoose.model("sms", messageSchema);

// home page
app.get("/", (req, res) => {
	res.render("home");
});

app.get("/send", (req, res) => {
	res.render("socket");
});
app.get("/bulk-send", (req, res) => {
	res.render("bulk");
});

app.get("/report", (req, res) => {
	res.render("report");
});

// app.post("/send", async (req, res) => {
// 	const { number, body } = req.body;
// });

app.get("/messages", async (req, res) => {
	const messages = await Message.findOne({ status: false });
	res.json(messages);
});

app.get("/message/all", async (req, res) => {
	const messages = await Message.find();
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

const server = app.listen(port, console.log("server running on port " + port));

const io = socketio(server);
var messages;

let interval = 15000;
let totalTime = 0;

io.on("connection", (socket) => {
	console.log("Connected", socket.id);
	// socket.emit("all", messages);
	socket.on("message", async (message) => {
		const { number, body } = message;
		const mst = await new Message({ number, body }).save();
		messages = mst;
		socket.broadcast.emit("all", messages);
		socket.emit("sender", messages);
	});

	socket.on("sync", () => {
		console.log("Sync Request Received from ", socket.id);
		socket.broadcast.emit("all", messages);
	});

	socket.on("bulk", async (data) => {
		totalTime = (data.length - 1) * interval;
		console.log("total Time :", totalTime, "interval: ", interval);
		await Message.insertMany(data);
		let sending = setInterval(() => {
			console.log("Running... with :", totalTime);
			if (totalTime >= 0) {
				// per interval emit request
				console.log("Emiting...");
				// lets Attemt to emit event
				socket.broadcast.emit("all", { id: v4() });

				totalTime = totalTime - interval;
			} else {
				console.log("Stop Emiting ");
				clearInterval(sending);
			}
		}, interval);
	});
	// send Bulk
	// Per 10 second send Request
});
