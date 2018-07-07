const express = require('express');
const app = express();
require('express-ws')(app);

app.set('port', process.argv[2]);
app.use(express.static(__dirname + '/public'));

//client-server communication via websockets
app.ws('/', function(ws) {
    ws.on('message', function(msg) {
        console.log("Server received message", msg);
        msg = JSON.parse(msg);

        if (msg.code === 'search') {
            //notify the client that request has been accepted
            ws.send(JSON.stringify({code: "searching"}));

            //todo: perform search
            //msg.data will contain search query parameters. Here's an example:
            //{url: "google.com", searchMethod: "BFS", stopKeyword: "Oregon", size: "100"}
        }
    });
});

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});
