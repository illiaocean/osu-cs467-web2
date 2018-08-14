const DEBUGGING = true;

const rp = require('request-promise');
var errors = require('request-promise/errors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const URL = require('url').URL;


function log(argument) {
    if (DEBUGGING) {
        console.log(argument);
    }
}

//constructor for WebLink object
var WebLink = (function () {
    var counter = 0;

    return function WebLink(url, parent) {
        this.parentLink = parent;
        this.url = url;
        this.links = [];
        this.children = [];
        this.count = ++counter;
    }
})();

//scraper API
module.exports = {
    crawl: function (qry, serverFunc, websocket) {
        crawl(qry, serverFunc, websocket);
    }
};


function crawl(qry, websocket, serverFunc) {

    if (!qry['url'].startsWith('http')) {
        qry['url'] = "http://" + qry['url'];
    }

    var searchMethod = qry['searchMethod'].toLowerCase();

    var crawlInfo = {
        depth: parseInt(qry['size']),
        visited: new Map(),
        visiting: new Map(),
        method: searchMethod,
        queue: new Queue(),
        stopKeyword: qry['stopKeyword']
    }

    var rootNode = new WebLink(qry['url']);

    //add root
    crawlInfo.queue.enqueue(rootNode);
    crawlInfo.visiting.set(qry['url'], rootNode);


    if (searchMethod == 'dfs') {

        DFS(rootNode, crawlInfo, function () {
            serverFunc(rootNode);
        }, websocket);
    }
    else if (searchMethod == 'bfs') {

        BFS(crawlInfo, function () {
            serverFunc(rootNode);
        }, websocket);
    }
    else {
        console.log("Invalid searchMethod:" + searchMethod);
    }

}

function updateClientCount(websocket, n){
    if (websocket) {
        //send update to client
        websocket.send(JSON.stringify({
            code: 'progressUpdated',
            data: {
                // url: link,
                count: n
            }
        }));
    }
}


function BFS(crawlInfo, callback, websocket) {

    //get node depending on search method
    var node = crawlInfo.queue.dequeue();

    //scrape node url for links
    scrape(node.url, function (links, title, favicon, $) {

        node.title = title;
        node.favicon = favicon;

        crawlInfo.visiting.delete(node.url);

        //look for stopKeyword in document
        var keyFound = crawlInfo.stopKeyword != '' && ( $ && $('body:contains("'+crawlInfo.stopKeyword+'")').length > 0 );

        if (keyFound || crawlInfo.depth <= crawlInfo.visited.size) {

            while (!crawlInfo.queue.isEmpty) {  //eliminate further calls
                crawlInfo.queue.dequeue();
            }

            if (crawlInfo.visiting.size == 0) {

                if (keyFound) {
                    log("\n ==========  KEYWORD FOUND  ==========\n");

                    websocket.send(JSON.stringify({
                        code: 'stopKeywordFound',
                        data: {
                            keyword: crawlInfo.stopKeyword,
                            url: node.url
                        }
                    }));
                }

                log("\n\n ==========  server callback  ==========\n\n");
                callback();
            }
            return;
        }

        //recursively search links
        if (links.length > 0) {

            var index = 0;

            //loops through links if bfs, else only once on index
            while ( index < links.length && crawlInfo.visited.size < crawlInfo.depth) {
                
                var link = links[index];

                if ( !( link in crawlInfo.visited) ) {

                    updateClientCount(websocket, crawlInfo.visited.size);

                    //append node with child link node
                    const childNode = new WebLink(link, node.url);

                    node.children.push(childNode);

                    crawlInfo.queue.enqueue(childNode);

                    crawlInfo.visiting.set(link, childNode);
                    crawlInfo.visited.set(link, childNode);

                    BFS(crawlInfo, callback, websocket);
                }
                ++index;
            }
        }
    });
}

//performs bfs or dfs crawl
function DFS(node, crawlInfo, callback, websocket) {

    //scrape node url for links
    scrape(node.url, function (links, title, favicon, $) {

        node.title = title;
        node.favicon = favicon;
        node.links = links;

        crawlInfo.visited.set(node.url, node);
        crawlInfo.visiting.delete(node.url);

        //look for stopKeyword in document
        var keyFound = crawlInfo.stopKeyword != '' && ( $ && $('body:contains("'+crawlInfo.stopKeyword+'")').length > 0 );

        if ( keyFound) {
            log("\n ==========  KEYWORD FOUND  ==========\n");
            websocket.send(JSON.stringify({
                code: 'stopKeywordFound',
                data: {
                    keyword: crawlInfo.stopKeyword,
                    url: node.url
                }
            }));
            callback();
            return;
        }

        //if dfs has no links, move node pointer up tree
        if (links.length == 0 && node.parentLink ){
            do {                    
                console.log("Moving up tree to node: " + node.parentLink)

                node = crawlInfo.visited.get(node.parentLink);

                links = node.links;

                //make sure at least 1 unvisited
                for (var l in links ) {
                    if ( !crawlInfo.visited.has(l)) {
                        break;
                    }
                }
            } while ( node.parentLink )
        }
        else if (links.length == 0 ){
            return; //no links and no parent, exit scrape
        }


        var index = 0;  //index for looping links
        //get random index for dfs
        index = Math.floor(Math.random() * links.length);
        //make sure not visited
        while (links.length > 0 && crawlInfo.visited.has(links[index])  ) {
            links.splice(index, 1);
            index = Math.floor(Math.random() * links.length)
        }

        //loops through if bfs, else only once on index
        var link = links[index];

        if ( !crawlInfo.visited.has(link) && crawlInfo.depth > crawlInfo.visited.size ) {

            updateClientCount(websocket, crawlInfo.visited.size);

            //append node with child link node
            const childNode = new WebLink(link, node.url);

            node.children.push(childNode);

            crawlInfo.visiting.set(link, childNode);

            DFS(childNode, crawlInfo, callback, websocket);
        }


        //test condition for last node
        if (crawlInfo.depth <= crawlInfo.visited.size && !keyFound){

			if (crawlInfo.visiting.size == 0){
                //make sure only gets called once
                log("\n ==========  server callback  ==========\n");
                callback();
                return;
            }
        }
    });
}



//sends a base64 encoded jpeg screenshot to client
// https://github.com/checkly/puppeteer-examples/blob/master/1.%20basics/screenshots.js
async function capture(url, ws) {
    try {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setViewport({width: 480, height: 240})
        await page.goto(url)

        var img = await page.screenshot({encoding: 'base64', type: 'jpeg'})

        await browser.close()

        if (ws) {
            var response = {
                code: "image",
                data: img
            };
            await ws.send(JSON.stringify(response));
        }

    }
    catch (err) {
        console.log("\n Screenshot Error: " + err)
    }
}

//webscraping reference: https://codeburst.io/an-introduction-to-web-scraping-with-node-js-1045b55c63f7
//scrapes url site and performs callback on each link
function scrape(url, callback) {

    log("scraping " + url);

    //options for request
    const options = {
        uri: url,
        transform: function (body) {
            var titleStart = body.indexOf('<title>');
            var titleEnd = body.indexOf('</title>');
            var title = body.substring(titleStart, titleEnd);

            if (title.startsWith("<title>")) {
                title = title.replace("<title>", "");
            } else {
                title = "";
            }

            return {
                $: cheerio.load(body),
                title: title
            };
        },
        resolveWithFullResponse: true,
        headers: {
            'User-Agent' : 'Mozilla/5.0 (X11; CrOS i686 2268.111.0) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
        }
    };

    var links = [];
    var linkMap = {};

    //calls request, executes promise
    rp(options)
        .then((response) => {
            //TODO: implement keyword stop
            var $ = response.$;

            //get webpage title
            var titleText = response.title;
            if (!titleText) {
                titleText = url;
            }
            titleText = titleText.length > 20 ? titleText.substring(0, 20) + "..." : titleText;

            //get favicon
            var $favicon = $('[rel="shortcut icon"]');
            var faviconURL;

            if ($favicon) {
                faviconURL = $favicon.attr('href');
                var origin = new URL(url).origin;
                var fullFaviconURL = new URL(faviconURL, origin);
            }

            $('a').each(function () {
                var link = $(this).attr('href');
                if (link) {
                    //if link address is self-referenced, insert domain
                    if (link.substring(0, 2) == './') {
                        link = new URL( link.substring(1), url ).href;
                    }
                    //add unique link
                    if (link.startsWith('http') && !linkMap[link]) {
                        links.push(link);
                        linkMap[link] = true;
                    }
                }
            });

            callback(links, titleText, fullFaviconURL, $);
        })
        .catch(errors.StatusCodeError, function (reason) {
        // The server responded with a status codes other than 2xx.
        // Check reason.statusCode
            console.log( 'Server Error: ' + reason.statusCode + ' Response from ' + url);
            callback([], "", "");
        })
        .catch(errors.RequestError, function (reason) {
        // The request failed due to technical reasons.
        // reason.cause is the Error object Request would pass into a callback.
            console.log("Request " + reason.cause);
            callback([], "", "");
        });

        console.log("scraped " + url);

    return links;
}


//Queue implementation from http://code.iamkate.com/javascript/queues/
function Queue() {
    var a = [], b = 0;
    this.getLength = function () {
        return a.length - b
    };
    this.isEmpty = function () {
        return 0 == a.length
    };
    this.enqueue = function (b) {
        a.push(b)
    };
    this.pop_back = function () {
        return a.pop();
    }
    this.dequeue = function () {
        if (0 != a.length) {
            var c = a[b];
            2 * ++b >= a.length && (a = a.slice(b), b = 0);
            return c
        }
        return null;

    };
    this.peek = function () {
        return 0 < a.length ? a[b] : void 0
    }
};