
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
	crawl: function(url, serverFunc){
		//placeholder:
		qry = {	
				url: url, 
				searchMethod: "DFS", 
				stopKeyword: "Oregon", 
				size: "5"
			};

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

	const method = qry['searchMethod'].toLowerCase();

	crawlHelper(rootNode, method, depth, visited, function(){
		serverFunc(rootNode);
	});

}


function crawlHelper(node, method, depth, visited, callback){

	if( depth <= 0 ) { 
		callback();
		return; 
	}
	
	//pass dfs/bfs function to scraper to perform crawl
	scrape(node.url, function( links ){

		console.log("links: " + links.length + " depth: " + depth);
// 		//in bfs, add new node for each link
// 		if ( method == 'bfs'){
// 			for (link in links){
// 				if( !(link in visited) ){
// 					visited.push(link);
// 					node.webLinks.push( new WebLink(link) );
// 				}
// //TODO: bfs needs to add links one layer at a time (to each node)
// 			}
// 		}	
// 		//in dfs, randomly choose link
// 		else {
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
				console.log("crawling " + childNode.url );
				crawlHelper(childNode, method, depth-1, visited, callback);
			}
		// }
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



