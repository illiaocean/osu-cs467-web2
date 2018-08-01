const puppeteer = require('puppeteer');


// https://github.com/checkly/puppeteer-examples/blob/master/1.%20basics/screenshots.js

function capture(url, dest) {

	puppeteer.launch().then( browser => {

	  browser.newPage().then( page => { 

	  	page.goto(url).then( resp => { 		

			page.screenshot({path: dest}).then( buffer => { 
				browser.close() 
			})
		})
	  })
	})
}

capture("http://andriuskelly.com", "./temp/temp.png");
