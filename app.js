const express = require('express');
const app = express();
const scraper = require('./scraper.js');


//placeholder query:
qry = { 
        url: 'https://en.wikipedia.org/wiki/Special:Random', 
        searchMethod: "bfs", 
        stopKeyword: "Oregon", 
        size: "2"
    };
//pass in callback function to handle links
scraper.crawl(qry, function(links){console.log(links);});

require('express-ws')(app);

app.set('port', process.argv[2]);
app.use(express.static(__dirname + '/public'));

//client-server communication via websockets
app.ws('/', function(ws) {
    ws.on('message', function(msg) {
        console.log("Server received message", msg);
        msg = JSON.parse(msg);

        //msg.data will contain search query parameters. Here's an example:
        //{url: "google.com", searchMethod: "BFS", stopKeyword: "Oregon", size: "100"}

        if (msg.code === 'search') {
            //notify the client that request has been accepted
            ws.send(JSON.stringify({code: "searching"}));

            //begin search
            scraper.scrape(msg.data, function(links){
                console.log(links);
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
