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
var port = 10111;

var sr = new ws.WebSocketServer({
	//port: port, perMessageDeflate: {
		// zlibDeflateOptions: {
			// See zlib defaults.
			// chunkSize: 1024,
			// memLevel: 7,
			// level: 3
		// },
		// zlibInflateOptions: {
			// chunkSize: 8192
		// },
		// Other options settable:
		// clientNoContextTakeover: true, // Defaults to negotiated value.
		// serverNoContextTakeover: true, // Defaults to negotiated value.
		// serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		// concurrencyLimit: 10, // Limits zlib concurrency for perf.
		// threshold: 1024 // Size (in bytes) below which messages
		// should not be compressed if context takeover is disabled.
	// }
	port: port,
	maxPayload: 128 * 1024 * 10124
});
var colors = require("colors");
var wsclients = [];
var protocol = 1300;
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
let parens = /\(([0-9+\-*/\^ .]+)\)/             // Regex for identifying parenthetical expressions
let exp = /(\d+(?:\.\d+)?) ?\^ ?(\d+(?:\.\d+)?)/ // Regex for identifying exponentials (x ^ y)
let mul = /(\d+(?:\.\d+)?) ?\* ?(\d+(?:\.\d+)?)/ // Regex for identifying multiplication (x * y)
let div = /(\d+(?:\.\d+)?) ?\/ ?(\d+(?:\.\d+)?)/ // Regex for identifying division (x / y)
let add = /(\d+(?:\.\d+)?) ?\+ ?(\d+(?:\.\d+)?)/ // Regex for identifying addition (x + y)
let sub = /(\d+(?:\.\d+)?) ?- ?(\d+(?:\.\d+)?)/  // Regex for identifying subtraction (x - y)

/**
 * Evaluates a numerical expression as a string and returns a Number
 * Follows standard PEMDAS operation ordering
 * @param {String} expr Numerical expression input
 * @returns {Number} Result of expression
 */
function evaluate(expr)
{
    if(isNaN(Number(expr)))
    {
        if(parens.test(expr))
        {
            let newExpr = expr.replace(parens, function(match, subExpr) {
                return evaluate(subExpr);
            });
            return evaluate(newExpr);
        }
        else if(exp.test(expr))
        {
            let newExpr = expr.replace(exp, function(match, base, pow) {
                return Math.pow(Number(base), Number(pow));
            });
            return evaluate(newExpr);
        }
        else if(mul.test(expr))
        {
            let newExpr = expr.replace(mul, function(match, a, b) {
                return Number(a) * Number(b);
            });
            return evaluate(newExpr);
        }
        else if(div.test(expr))
        {
            let newExpr = expr.replace(div, function(match, a, b) {
                if(b != 0)
                    return Number(a) / Number(b);
                else
                    throw new Error('Division by zero');
            });
            return evaluate(newExpr);
        }
        else if(add.test(expr))
        {
            let newExpr = expr.replace(add, function(match, a, b) {
                return Number(a) + Number(b);
            });
            return evaluate(newExpr);
        }
        else if(sub.test(expr))
        {
            let newExpr = expr.replace(sub, function(match, a, b) {
                return Number(a) - Number(b);
            });
            return evaluate(newExpr);
        }
        else
        {
            return expr;
        }
    }
    return Number(expr);
}
var foreignCols = {};
console.log(("Server is running at port " + port).verbose);
sr.on("connection", (ws) => {
	var id = Math.round(Math.random() * 0xFFFF);
	var user;
	var uid;
	ws.send(JSON.stringify({
		state: 4,
		protocol: protocol
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
						if (u[2] == jsondata.user && u[3] == jsondata.id) {
							ws.send(JSON.stringify({
								state: 5,
								reason: 0
							}));
							return;
						}
					}
				});
				wsclients.push([id, ws, jsondata.user, jsondata.id]);
				user = jsondata.user;
				uid  = jsondata.id;
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
								message: `There are ${`${k.length} ${(k.length == 1) ? "user" : "users"}`.info}: ${k.toString()}`
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
								message: "$ help - help command\n$ upload <file path> <user (not required)> - send file to user\n$ list - list of connected users\n$ leave - disconnect from server\n$ color <color> - change username color\n$ calc <evaluation> - calculator"
							}));
							break;
						}
						case "/calc": {
							var e = args[1];
							ws.send(JSON.stringify({
								state: 2,
								message: `${evaluate(e)}`
							}));
							break;
						}
						default: {
							ws.send(JSON.stringify({
								state: 2,
								message: "Unknown command!".red
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
						if (s != null) {
							ws.send(JSON.stringify({
								state: 2,
								message: `Sending file for ${getUserFormatted(s[2], foreignCols[s[2]])}`.data
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
									message: `Sending file for ${getUserFormatted(s[2], foreignCols[s[2]])}`.data
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
				break;
			}
			case 4001: {
				break;
			}
			case 4002: {
				wsclients.forEach((u) => {
					if(u && u[1]) {
						u[1].send(JSON.stringify({
							state: 2,
							message: `${getUserFormatted(user, foreignCols[user])} disconnected from the server`
						}));
					}
				});
				break;
			}
		}
		var i = 0;
		wsclients.forEach((u) => {
			if (u != null) {
				if (u[2] == user && u[3] == uid) wsclients[i] = null;
			}
			i++;
		});
	})
});
