const express = require('express');
const app = express();
require('express-ws')(app);

//scrape object
const scraper = require('./scraper.js');

//pass in callback function to handle links
scraper.crawl('https://en.wikipedia.org/wiki/Special:Random', function(links){console.log(links);});


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

            //msg.data will contain search query parameters. Here's an example:
            // const jsonString = '{url: "google.com", searchMethod: "BFS", stopKeyword: "Oregon", size: "100"}';

        }
    });
});

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});
