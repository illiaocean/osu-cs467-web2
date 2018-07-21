const express = require('express');
const app = express();
const scraper = require('./scraper.js');
require('express-ws')(app);


//placeholder query:
qry = {
    url: 'https://en.wikipedia.org/wiki/Special:Random',
    searchMethod: "dfs",
    stopKeyword: "Oregon",
    size: "7"
};


scraper.crawl(qry, function (node) {
    //this function will be executed on the node tree result of the dfs/bfs
    
    //each node is structured:
    //node.url is the url of the node
    //node.webLinks is an array of child nodes

    console.log(JSON.stringify(node));

    //example: this will print dfs results in order
    while(node){
        console.log(node.url);
        node = node.webLinks[0];
    }
});

app.set('port', process.argv[2]);
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
                //Search has finished. Send results back to the client.
                var response = {
                    code: "results",
                    data: node
                };
                ws.send(JSON.stringify(response));
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
