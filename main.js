var ws = require("ws");
var rl = require("readline");
var ip, user;
var colors = require("colors");
var fs = require("fs");
var rli = rl.createInterface({
    input: process.stdin,
    output: process.stdout
});
var path = require("path");
var protocol = 1100;

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
console.log(`
RULES:
    1. Don't send any ASCII arts. They are may break terminal session and notifications.
    2. Don't spam.
    3. Use nick like you're using in other chat apps (Discord, Telegram, etc.), 
       so that other people can understand who are you.

ПРАВИЛА:
    1. Не присылайте какие-либо ASCII арты. Они могут сломать сессию терминала, а также уведомления.
    2. Не спамьте.
    3. Используйте такой ник, какой Вы используете в других чатах (Discord, Telegram и т.д),
       чтобы другие пользователи могли понять, кто Вы такой.
`);
rli.question("IP: ", (txt) => {
    ip = txt;
    rli.question("User: ", (txt) => {
        user = txt;
        console.log("Connecting...");
        var state = 0;

        var cl = new ws.WebSocket(`ws://${ip}`, {
            perMessageDeflate: true
        });
        cl.on("open", () => {
            state = 1;
            cl.send(JSON.stringify({
                state: state,
                user: user
            }));
        });
        cl.on("message", (data) => {
            var jsondata = JSON.parse(data);
            switch(jsondata.state){
                case 1: {
                    console.log("Successfully connected as %s", user);
                    break;
                }
                case 2: {
                    console.log(jsondata.message);
                    break;
                }
                case 3: {
                    fs.writeFileSync(jsondata.filename, Buffer.from(jsondata.data, "hex"));
                    console.log(jsondata.message);
                    break;
                }
                case 4: {
                    console.log("Server protocol: %d", jsondata.protocol);
                    if(jsondata.protocol != protocol) {
                        console.error("Your client is outdated! Please update client to %d", jsondata.protocol);
                        cl.close(4000, user);
                        console.log("Disconnected");
                        process.exit(0);
                    }
                    break;
                }
                case 5: {
                    cl.close(4001, user);
                    console.log("You have already connected to server");
                    console.log("Disconnected");
                    process.exit(0);
                    break;
                }
            }
        });
        rli.on("line", (l) => {
            if(state != 0){
                state = 2;
                if(l.startsWith("/")){
                    var args = l.split(" ");
                    switch(args[0]){
                        case "/upload": {
                            var filename = args[1];
                            var user = !!(typeof args[2] == "undefined") ? null : args[2];
                            if(!fs.existsSync(filename) || !fs.statSync(filename).isFile){
                                console.error("File %s not found!", filename);
                            } else {
                                cl.send(JSON.stringify({
                                    state: 3,
                                    data: fs.readFileSync(filename).toString("hex"),
                                    user: user,
                                    filename: (path.isAbsolute(filename) ? path.basename(filename) : filename)
                                }));
                            }
                            break;
                        }
                        case "/leave": {
                            cl.close(4002, user);
                            console.log("Disconnected");
                            process.exit(0);
                            break;
                        }
                        default: {
                            cl.send(JSON.stringify({
                                state: 2,
                                message: l
                            }));
                            break; 
                        }
                    }
                } else {
                    cl.send(JSON.stringify({
                        state: 2,
                        message: l
                    }));
                }
            }
        });
    });    
});