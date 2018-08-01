const puppeteer = require('puppeteer');


module.exports = {
	capture: function(url, dest){
		//screenshot capture example from https://github.com/checkly/puppeteer-examples/blob/master/1.%20basics/screenshots.js

		(async () => {
		  const browser = await puppeteer.launch()
		  const page = await browser.newPage()
		  await page.setViewport({ width: 1280, height: 800 })
		  await page.goto(url)
		  await page.screenshot({ path: dest, fullPage: true })
		  await browser.close()
		})()
	}
}

