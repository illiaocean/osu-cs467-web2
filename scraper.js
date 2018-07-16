const rp = require('request-promise');
const cheerio = require('cheerio');



//constructor for WebLink object
function WebLink(url){
		this.url = url;
		this.webLinks = [];
}

//scraper API
module.exports = {
	scrape: function(options, responseCall){
		console.log("Scraping: " + options.url);
		scrape(url, responseCall);
	}
};

//TODO: impliment BFS, DFS

//webscraping reference: https://codeburst.io/an-introduction-to-web-scraping-with-node-js-1045b55c63f7
function scrape(url, callback){
	//options for request
	const options = {		
	  uri: url,
	  transform: function (body) {
	    return cheerio.load(body);
	  }
	};
  	
  	var links = [];

	//calls request, executes promise
	rp(options)
	  .then(($) => {

	    $('a').each( function(i, e){
	    	var link = $(this).attr('href')
	    	//if link is self
	    	if( link.substring(0,2) == './' ){
	    		link = url + link.substring(1);
	    	}

	    	if( link.startsWith('http') ){
	    		links.push(link);
	    	}
	    });
    	callback(links)
	  })
	  .catch((err) => {
	    console.log(err);
	  });

    return links;
}



