var ws = require("ws");
var cols = ["silly", "input", "verbose", "info", "warn", "debug", "error"];
var colu = {
	"rainbow": 0,
	"grey": 1,
	"cyan": 2,
	"green": 3,
	"yellow": 4,
	"blue": 5,
	"red": 6
};
var getUserFormatted = (name = "", col = 0) => {
	return `${eval(`name.${cols[col]}`)}`;
}
var sr = new ws.WebSocketServer({
	port: 10111, perMessageDeflate: {
		zlibDeflateOptions: {
			// See zlib defaults.
			chunkSize: 1024,
			memLevel: 7,
			level: 3
		},
		zlibInflateOptions: {
			chunkSize: 8192
		},
		// Other options settable:
		clientNoContextTakeover: true, // Defaults to negotiated value.
		serverNoContextTakeover: true, // Defaults to negotiated value.
		serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		concurrencyLimit: 10, // Limits zlib concurrency for perf.
		threshold: 1024 // Size (in bytes) below which messages
		// should not be compressed if context takeover is disabled.
	}
});
var colors = require("colors");
var wsclients = [];
var protocol = 1100;
colors.enable();
colors.setTheme({
	silly: 'rainbow',
	input: 'grey',
	verbose: 'cyan',
	prompt: 'grey',
	info: 'green',
	data: 'grey',
	help: 'cyan',
	warn: 'yellow',
	debug: 'blue',
	error: 'red'
});
var foreignCols = {};
console.log("Server is running".verbose);
sr.on("connection", (ws) => {
	var id = Math.round(Math.random() * 0xFFFF);
	var user;
	ws.send(JSON.stringify({
		state: 4,
		protocol: 1100
	}));
	var block = false;
	var isLogin = false;
	var col = 2;
	ws.on("message", (data) => {
		if (block) return;
		var jsondata = JSON.parse(data);
		switch (jsondata.state) {
			case 1: {
				wsclients.forEach((u) => {
					if (u != null) {
						if (u[2] === jsondata.user) {
							ws.send(JSON.stringify({
								state: 5,
								reason: 0
							}));
							return;
						}
					}
				});
				wsclients.push([id, ws, jsondata.user]);
				user = jsondata.user;
				foreignCols[user] = col;
				console.log("User %s was successfully connected".info, user);
				wsclients.forEach((s) => {
					if (s != null) {
						s[1].send(JSON.stringify({
							state: 2,
							message: `User ${user} connected`.data
						}));
					}
				})
				isLogin = true;
				break;
			}
			case 2: {
				if (!isLogin) break;
				if (jsondata.message.startsWith('/')) {
					//command handler
					var args = jsondata.message.split(' ');
					switch (args[0]) {
						case "/list": {
							var k = [];
							wsclients.forEach((a) => {
								if (a != null) {
									var uname = a[2];
									k.push(getUserFormatted(uname, foreignCols[uname]));
								}
							});
							ws.send(JSON.stringify({
								state: 2,
								message: `There are ${`${k.length} users`.info}: ${k.toString()}`
							}));
							break;
						}
						case "/color": {
							var c = args[1];
							if (!Object.keys(colu).includes(c)) {
								var ccc = "";
								Object.keys(colu).forEach((cccc) => {
									ccc += `${getUserFormatted(cccc, colu[cccc])} `;
								});
								ws.send(JSON.stringify({
									state: 2,
									message: `Avaliable colors: ${ccc}`
								}));
							} else {
								col = colu[args[1]];
								foreignCols[user] = col;
								ws.send(JSON.stringify({
									state: 2,
									message: `Color was successfully changed`.info
								}));
							}
							break;
						}
						case "/help": {
							ws.send(JSON.stringify({
								state: 2,
								message: "\n$ help - help command\n$ upload <file path> <user (not required)> - send file to user\n$ list - list of connected users\n$ leave - disconnect from server\n$ color <color> - change username color"
							}));
							break;
						}
						case "/api": {
							console.log("API command".info);
							switch(args[1]){
								case "list": {
									var j = [];
									wsclients.forEach((l) => {
										if(l != null) j.push([l[0], l[2]]);
									})
									ws.send(JSON.stringify({
										state: 2,
										message: [j.length, j]
									}));
									break;
								}
								case "pcol": {
									var pl = args[2];
									if(typeof pl != "undefined"){
										var ispl = false;
										wsclients.forEach((wsc) => {
											if(wsc != null && wsc[2] == pl) ispl = true;
										})
										if(ispl){
											ws.send(JSON.stringify({
												state: 2,
												message: getUserFormatted(pl, foreignCols[pl])
											}));
										}
									} else {
										ws.send(JSON.stringify({
											state: 2,
											message: "not found"
										}));
									}
									break;
								}
								default: {
									ws.send(JSON.stringify({
										state: 2,
										message: JSON.stringify(["list", "pcol"])
									}));
									break;
								}
							}
						}
					}
				} else {
					console.log("[%s] %s", getUserFormatted(user, foreignCols[user]), jsondata.message);
					wsclients.forEach((s) => {
						if (s != null) {
							s[1].send(JSON.stringify({
								state: 2,
								message: `[ ${getUserFormatted(user, foreignCols[user])} ] ${jsondata.message}`
							}));
						}
					})
				}
				break;
			}
			case 3: {
				if (!isLogin) break;
				var filename = jsondata.filename;
				var user2send = jsondata.user;
				if (user2send === null) {
					wsclients.forEach((s) => {
						if (s != null || s[2] != user) {
							ws.send(JSON.stringify({
								state: 2,
								message: `Sending file for ${getUserFormatted(a[2], foreignCols[a[2]])}`.data
							}));
							s[1].send(JSON.stringify({
								state: 3,
								data: jsondata.data,
								filename: filename,
								message: `${`${user}`.help} sent you ${`a file that was saved as ${filename}`.warn}`
							}));
						}
					});
				} else {
					wsclients.forEach((s) => {
						if (s != null) {
							if (s[2] == user2send) {
								ws.send(JSON.stringify({
									state: 2,
									message: `Sending file for ${getUserFormatted(a[2], foreignCols[a[2]])}`.data
								}));
								s[1].send(JSON.stringify({
									state: 3,
									data: jsondata.data,
									filename: filename,
									message: `${`${user}`.help} sent you ${`a file that was saved as ${filename}`.warn}`
								}));
							}
						}
					});
				}
				break;
			}
		}
	});
	ws.on("close", (code, reason) => {
		console.log("%s was disconnected", user);
		switch (code) {
			case 4000: {
				wsclients.forEach((u) => {
					if (u != null) {
						u[1].send(JSON.stringify({
							state: 2,
							message: `${getUserFormatted(user, foreignCols[user])} was disconnected for ${`outdated client`.verbose}`
						}));
					}
				});
				break;
			}
			case 4001: {
				break;
			}
			case 4002: {
				wsclients.forEach((u) => {
					u[1].send(JSON.stringify({
						state: 2,
						message: `${getUserFormatted(user, foreignCols[user])} was disconnected`
					}));
				});
				break;
			}
		}
		var i = 0;
		wsclients.forEach((u) => {
			if (u != null) {
				if (u[2] == user) wsclients[i] = null;
			}
			i++;
		});
	})
});
