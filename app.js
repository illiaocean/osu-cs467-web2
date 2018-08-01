const DEBUGGING = true;

const express = require('express');
const app = express();
const scraper = require('./scraper.js');
// const screenshot = require('./screenshot.js');

require('express-ws')(app);


let port = process.env.PORT || process.argv[2] || 3000;
app.set('port', port);

//pass in callback function to handle links
if(DEBUGGING){      
    qry = {  
             url: 'https://en.wikipedia.org/wiki/Special:Random', 
             searchMethod: "bfs", 
             stopKeyword: "Oregon", 
             size: "3"
         };
    scraper.crawl(qry, 
        function(links){ 

            // links.forEach(function(link){
                console.log(links);
            // }); 

        });
}


app.use(express.static(__dirname + '/public'));

//client-server communication via websockets
app.ws('/', function (ws) {
    ws.on('message', function (msg) {
        console.log("Server received message", msg);
        msg = JSON.parse(msg);

        //msg.data will contain search query parameters. Here's an example:
        //{url: "google.com", searchMethod: "BFS", stopKeyword: "Oregon", size: "100"}

        if (msg.code === 'search') {
            //notify the client that request has been accepted
            ws.send(JSON.stringify({code: "searching"}));

            //begin search
            scraper.crawl(msg.data, function (node) {
                console.log("Sending back graph", JSON.stringify(node));

                //Search has finished. Send results back to the client.
                var response = {
                    code: "results",
                    data: node
                };
                ws.send(JSON.stringify(response));
            }, ws);
        }
    });
});

//error handlers
app.use(require('./routes/404'));
app.use(require('./routes/500'));

app.listen(app.get('port'), function () {
    console.log('Express started on port: ' + app.get('port') + '.');
});
