const DEBUGGING = true;

const rp = require('request-promise');
const cheerio = require('cheerio');


function log (argument) {
    if(DEBUGGING){
        console.log(argument);
    }
}

//constructor for WebLink object
function WebLink(url) {
    this.url = url;
    this.webLinks = [];
}

//scraper API
module.exports = {

	scrape: function(url, callback){
		log("scraping: " + url);
		scrape(url, callback);
	},
	crawl: function(qry, serverFunc, websocket){
		crawl(qry, serverFunc, websocket);
	}
};

//TODO: impliment BFS, DFS
function crawl(qry, serverFunc, websocket){

    if( !qry['url'].startsWith('http') ){
        qry['url'] = "http://" + qry['url'];
    }

	//crawled urls to prevent loops
	var visited = [];
	visited.push( qry['url'] );

	var depth = parseInt( qry['size'] );

	var rootNode = new WebLink( qry['url']  )

	if ( qry['searchMethod'].toLowerCase() == 'bfs'){    

        var visited = [];

        var queue = new Queue();

        queue.enqueue( rootNode );
		
        bfs(queue, depth, visited, function(){
			serverFunc(rootNode);
		}, websocket, 1);
	}
	else if ( qry['searchMethod'].toLowerCase() == 'dfs' ) {
		dfs(rootNode, depth, visited, function(){
			serverFunc(rootNode);
		}, websocket, 1);
	}
	else {
		log("scraper.js: Could not parse search method.")
		serverFunc(null);
	}
}


function bfs(queue, depth, visited, callback, websocket, count){

    if( depth < visited.length ) {
    	return;
    }
    else if( depth == visited.length ) { 
    	log("\n\n\n ================ server callback ==============\n\n\n");
        //empty queue
        while(!queue.isEmpty){
            queue.dequeue();
        }
        callback();
        return; 
    }
    
    var node = queue.dequeue();

    //pass dfs/bfs function to scraper to perform crawl
    scrape(node.url, function( links ){

        log(node.url); 
        log("links: " + links.length + " depth: " + depth);

        if(links.length > 0 ) {
            links.forEach(function(link){

                if( !(link in visited) ){
                    var notification = {
                        code: 'progressUpdated',
                        data: {
                            // url: link,
                            count: count++
                        }
                    };
                    websocket.send(JSON.stringify(notification));

                    visited.push( link );

                    const childNode = new WebLink( link ) 
                    node.webLinks.push( childNode );

                    queue.enqueue(childNode);

                    bfs(queue, depth, visited, callback, websocket, count);
                }
            });

        } else {
            //TODO: handle dead end
            // callback();
            console.log("No links for " + node.url)
            return;
        }
    });
}




function dfs(node, depth, visited, callback, websocket, count) {
    if (depth <= 0) {
        callback();
        return;
    }

    //pass dfs/bfs function to scraper to perform crawl
    scrape(node.url, function (links) {
        console.log(node.url);
        console.log("links: " + links.length + " depth: " + depth);

        //in dfs, randomly choose link
        var index = Math.floor(Math.random() * links.length);


        //make sure not visited
        while (links.length > 0 && links[index] in visited) {
            links.splice(index, 1);
            index = Math.floor(Math.random() * links.length)
        }

        if (links.length > 0) {
            visited.push(links[index]);
            var notification = {
                code: 'progressUpdated',
                data: {
                    // url: links[index],
                    count: count++
                }
            };
            websocket.send(JSON.stringify(notification));

            const childNode = new WebLink(links[index])
            node.webLinks.push(childNode);

            dfs(childNode, depth - 1, visited, callback, websocket, count);

        } else {
            //TODO: handle dead end
            callback();
            return;
        }
    });
}


//webscraping reference: https://codeburst.io/an-introduction-to-web-scraping-with-node-js-1045b55c63f7
//scrapes url site and performs callback on each link
function scrape(url, callback){
    
    log("scraping " + url);

    //options for request
    const options = {       
      uri: url,
      transform: function (body) {
        return cheerio.load(body);
      }
    };
    
    var links = [];
    var link = '';

    //calls request, executes promise
    rp(options)
      .then(($) => {
//TODO: impliment keyword stop

        $('a').each( function(){
            
            if ( link = $(this).attr('href') ) {

                //if link address is self-referenced, insert domain
                if( link.substring(0,2) == './' ){
                    link = url + link.substring(1);
                }
                //add unique link
                if( link.startsWith('http') && !links.includes(link)){
                    links.push(link);
                }
            }
        });
        callback(links)
      })
      .catch((err) => {
        log(err);
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