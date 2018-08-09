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

    if (searchMethod == 'dfs') {

        var crawlInfo = {
            depth: parseInt(qry['size']),
            visited: new Map(),
            visiting: new Map(),
            method: searchMethod,
            queue: new Queue(),
        }

        var rootNode = new WebLink(qry['url']);

        //add root
        crawlInfo.queue.enqueue(rootNode);
        crawlInfo.visiting[qry['url']] = rootNode;

        DFS(crawlInfo, function () {
            serverFunc(rootNode);
        }, websocket);
    }
    else if (searchMethod == 'bfs') {

        var crawlInfo = {
            depth: parseInt(qry['size']),
            visited: new Map(),
            visiting: new Map(),
            method: searchMethod,
            queue: new Queue(),
        }

        var rootNode = new WebLink(qry['url']);

        //add root
        crawlInfo.queue.enqueue(rootNode);
        crawlInfo.visiting[qry['url']] = rootNode;

        BFS(crawlInfo, function () {
            serverFunc(rootNode);
        }, websocket);
    }
    else {
        console.log("Invalid searchMethod:" + searchMethod);
    }

}

function BFS(crawlObj, callback, websocket) {

    //get node depending on search method
    var node = crawlObj.queue.dequeue();

    //scrape node url for links
    scrape(node.url, function (links, title, favicon) {

        node.title = title;
        node.favicon = favicon;

        if (crawlObj.depth == crawlObj.visited.size) {
            log("\n\n ==========  server callback  ==========\n\n");

            while (!crawlObj.queue.isEmpty) {  //eliminate further calls
                crawlObj.queue.dequeue();
            }

            callback();
            return;
        }
        else if (crawlObj.depth < crawlObj.visited.size) {    //prevents inf recursion
            return;
        }

        //recursively search links
        if (links.length > 0) {

            var index = 0;

            //loops through links if bfs, else only once on index
             while (index < links.length && crawlObj.depth > crawlObj.visited.size ) {
                var link = links[index];

                if (!( link in crawlObj.visited)) {

                    crawlObj.visited.set(link, node);

                    if (websocket) {
                        //send update to client
                        websocket.send(JSON.stringify({
                            code: 'progressUpdated',
                            data: {
                                // url: link,
                                count: crawlObj.visited.size
                            }
                        }));
                    }

                    //append node with child link node
                    const childNode = new WebLink(link)
                    node.children.push(childNode);

                    crawlObj.queue.enqueue(childNode);

                    BFS(crawlObj, callback, websocket);
                }
                ++index;
            }
        }
    });
}

//performs bfs or dfs crawl
function DFS(crawlInfo, callback, websocket) {

    if( !crawlInfo.queue.isEmpty() ){

        //get node depending on search method
        var node = crawlInfo.queue.dequeue();


        //scrape node url for links
        scrape( node.url, function (links, title, favicon) {

            node.title = title;
            node.favicon = favicon;
            node.links = links;

            crawlInfo.visited.set(node.url, node);
            crawlInfo.visiting.delete(node.url);

            var index = 0;  //index for looping links

            //handle dfs case
            if (crawlInfo.method == 'dfs') {

                //if dfs has no links, move node pointer up tree
                if (links.length == 0 && node.parentLink ){
                    do {                    
                        console.log("Moving up tree to node: " + node.parentLink)

                        node = crawlInfo.visited.get(node.parentLink);

                        links = node.links;

                        //make sure at least 1 unvisited
                        for (var l in links ) {
                            if ( !crawlInfo.visited.has(l)){
                                break;
                            }
                        }
                    } while ( node.parentLink )
                }
                else if (links.length == 0 ){
                    return; //no links and no parent, exit scrape
                }

                //get random index for dfs
                index = Math.floor(Math.random() * links.length);
                //make sure not visited
                while (links.length > 0 && crawlInfo.visited.has(links[index])  ) {
                    links.splice(index, 1);
                    index = Math.floor(Math.random() * links.length)
                }
            }


            //loops through if bfs, else only once on index
            do {
                var link = links[index];

                if(crawlInfo.depth <= crawlInfo.visited.size) break;

                if ( !crawlInfo.visited.has(link) ) {

                    if (websocket) { 	//send update to client
                        websocket.send(JSON.stringify({
                            code: 'progressUpdated',
                            data: {
                                // url: link,
                                count: crawlInfo.visited.size
                            }
                        }));
                    }

                    //append node with child link node
                    const childNode = new WebLink(link, node.url);

                    node.children.push(childNode);

                    crawlInfo.queue.enqueue(childNode);

                    crawlInfo.visiting.set(link, childNode);

                    DFS(crawlInfo, callback, websocket);
                }

                ++index;

            } while (crawlInfo.method != 'dfs' && index < links.length);

            //test condition for last node
            if (crawlInfo.depth <= crawlInfo.visited.size ){

            	//clear out queue
            	while( !crawlInfo.queue.isEmpty() ){
            		delete crawlInfo.queue.dequeue();
            	}

				if (crawlInfo.visiting.size == 0){
	                //make sure only gets called once
	                log("\n ==========  server callback  ==========\n");
	                callback();
	                return;
	            }
            }
        });
    }
}

/*


            */

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

            $('a').each(function () {
                var link = $(this).attr('href');
                if (link) {
                    //if link address is self-referenced, insert domain
                    if (link.substring(0, 2) == './') {
                        link = url + link.substring(1);
                    }
                    //add unique link
                    if (link.startsWith('http') && !linkMap[link]) {
                        links.push(link);
                        linkMap[link] = true;
                    }
                }
            });

            var titleText = response.title;

            if (!titleText) {
                titleText = url;
            }

            titleText = titleText.length > 20 ? titleText.substring(0, 20) + "..." : titleText;

            var $favicon = $('[rel="shortcut icon"]');
            var faviconURL;

            if ($favicon) {
                faviconURL = $favicon.attr('href');
                var origin = new URL(url).origin;
                var fullFaviconURL = new URL(faviconURL, origin);
            }

            callback(links, titleText, fullFaviconURL);
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