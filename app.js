const DEBUGGING = false;

const express = require('express');
const app = express();
const scraper = require('./scraper.js');

require('express-ws')(app);


let port = process.env.PORT || process.argv[2] || 3000;
app.set('port', port);

app.use(express.static(__dirname + '/public'));

//client-server communication via websockets
app.ws('/', function (ws) {

    ws.on('message', function (msg) {

        console.log("Server received message", msg);

        msg = JSON.parse(msg);

        if (msg.code === 'search') {
            //notify the client that request has been accepted
            ws.send(JSON.stringify({code: "searching"}));

            var callbackFlag = true; //prevent redundant callbacks

            //begin search
            scraper.crawl(msg.data, ws, function (node) {
                if (DEBUGGING) console.log("Sending back graph", JSON.stringify(node));

                //Search has finished. Send results back to the client.
                if (callbackFlag){
                    callbackFlag = false;
                    var response = {
                        code: "results",
                        data: node
                    };
                    ws.send(JSON.stringify(response));
                }
            });
        }
    });
});

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});

