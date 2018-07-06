const express = require('express');
const app = express();
require('express-ws')(app);

app.set('port', process.argv[2]);
app.use(express.static(__dirname + '/public'));

//client-server communication via websockets
app.ws('/', function(ws) {
    ws.on('message', function(msg) {
        console.log(msg);
        ws.send("Hello from the server!");
    });
});

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});
