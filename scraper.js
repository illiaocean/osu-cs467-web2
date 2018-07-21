
const rp = require('request-promise');
const cheerio = require('cheerio');


//constructor for WebLink object
function WebLink(url){
		this.url = url;
		this.webLinks = [];
}

//scraper API
module.exports = {

	scrape: function(url, callback){
		console.log("scraping: " + url);
		scrape(url, callback);
	},
	crawl: function(qry, serverFunc){
		crawl(qry, serverFunc);
	}
};

//TODO: impliment BFS, DFS
function crawl(qry, serverFunc){

	//crawled urls to prevent loops
	var visited = [];
	visited.push( qry['url'] );

	var depth = parseInt( qry['size'] );

	var rootNode = new WebLink( qry['url']  )

	if ( qry['searchMethod'].toLowerCase() == 'bfs'){
		bfs(rootNode, depth, function(){
			serverFunc(rootNode);
		});
	}
	else if ( qry['searchMethod'].toLowerCase() == 'dfs' ) {
		dfs(rootNode, depth, visited, function(){
			serverFunc(rootNode);
		});
	}
	else {
		console.log("scraper.js: Could not parse search method.")
		serverFunc(null);
	}
}



function bfs(root, depth, callback){

	var queue = new Queue();
	var visited = [];

	queue.enqueue(root);
	var nodesInLayer = 1;

	while( depth > 0 && !queue.isEmpty() ) {

		--nodesInLayer;

		if(nodesInLayer <= 0){
			--depth;
			console.log("depth:" + depth);
			nodesInLayer = queue.getLength();
		}

		var node = queue.dequeue();
		visited.push(node.url);

		scrape(node.url, function(links){

			for (link in links){
				if( !(link in visited) ){
					var childNode = new WebLink(link)

					queue.enqueue(childNode);
					node.webLinks.push( childNode );
				}
			}
		});
	}
	callback();
}




function dfs(node, depth, visited, callback){

	if( depth <= 0 ) { 
		callback();
		return; 
	}
	
	//pass dfs/bfs function to scraper to perform crawl
	scrape(node.url, function( links ){

		console.log(node.url); 
		console.log("links: " + links.length + " depth: " + depth);

		//in dfs, randomly choose link 
		var index = Math.floor( Math.random() * links.length );
		//make sure not visited
		while( links.length > 0 && links[index] in visited ){
			links.splice(index, 1);
			index = Math.floor( Math.random() * links.length )
		}

		if( links.length > 0 ){ 
			
			visited.push( links[index] );

			const childNode = new WebLink( links[index] ) 
			node.webLinks.push( childNode );

			dfs(childNode, depth-1, visited, callback);
		}
		else {
			//TODO: handle dead end
			return;
		}		
	});
}


//webscraping reference: https://codeburst.io/an-introduction-to-web-scraping-with-node-js-1045b55c63f7
//scrapes url site and performs callback on each link
function scrape(url, callback){

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
	    console.log(err);
	  });

    return links;
}


//Queue implimentation without using shift() from http://code.iamkate.com/javascript/queues/
function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};
