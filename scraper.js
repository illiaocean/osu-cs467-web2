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




function crawl(qry, serverFunc, websocket){

    if( !qry['url'].startsWith('http') ){
        qry['url'] = "http://" + qry['url'];
    }


    var searchMethod = qry['searchMethod'].toLowerCase();

    if( searchMethod == 'dfs' || 'bfs'){

        var crawlObj = {
        	visited: [ qry['url'] ],
        	depth : parseInt( qry['size'] ),
            method : searchMethod,
            queue : new Queue()   
        }

        var rootNode = new WebLink( qry['url']  );

        crawlObj.queue.enqueue( rootNode );

        crawlHelper( crawlObj, function(){	serverFunc(rootNode); }, websocket);
    }
    else {
        console.log("Invalid searchMethod:" + searchMethod);
    }

}


//performs bfs or dfs crawl
function crawlHelper(crawlObj, callback, websocket ){

    if( crawlObj.depth == crawlObj.visited.length ) { 
        log("\n\n\n ==========  server callback  ==========\n\n\n");

        while( !crawlObj.queue.isEmpty ){  //eliminate further calls
            crawlObj.queue.dequeue();
        }

        callback();
        return; 
    }
    else if( crawlObj.depth < crawlObj.visited.length ) {    //prevents inf recursion
        return;
    }
    
    //get node depending on search method
    var node = crawlObj.queue.dequeue();

    //scrape node url for links
    scrape(node.url, function( links ){

        log(node.url); 
        log("links: " + links.length + " depth: " + crawlObj.depth);

        if(links.length > 0 ) {

            var index = 0;

            //random index for dfs
            if( crawlObj.method == 'dfs'){
                index = Math.floor(Math.random() * links.length);
                //make sure not visited
                while (links.length > 0 && links[index] in crawlObj.visited) {
                    links.splice(index, 1);
                    index = Math.floor(Math.random() * links.length)
                }
            }   

            //loops through links if bfs, else only once on index
            do {
                var link = links[index];

                if( !( link in crawlObj.visited) ){

                    crawlObj.visited.push( link );

                    if(websocket){
                        //send update to client
                        websocket.send( JSON.stringify({
                            code: 'progressUpdated',
                            data: {
                                // url: link,
                                count: crawlObj.visited.length
                            }
                        }));
                    }

                    //append node with child link node
                    const childNode = new WebLink( link ) 
                    node.webLinks.push( childNode );

                    crawlObj.queue.enqueue(childNode);

                    crawlHelper(crawlObj, callback, websocket);
                }
                ++index;
            } while ( crawlObj.method != 'dfs' && index < links.length );

        } 
        else if ( crawlObj.method == 'dfs' ){
            //handle dead end 
            //if visited < depth, get next link and search in tree for node, then search
            console.log("No links for " + node.url)
            
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
    this.pop_back = function(){
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