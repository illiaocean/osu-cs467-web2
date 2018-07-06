const express = require('express');
const app = express();

app.set('port', process.argv[2]);

//todo websockets for client-server communication

//
app.use(express.static(__dirname + '/public'));

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});
