# Project
WEB2 GRAPHICAL CRAWLER
Group: Octans

Team Members:
Illia Abdullaiev
Sergio Pedroza
Andrius V Kelly

Github: https://github.com/abdullaiev/osu-cs467-web2

# Running Locally

1. cd to project folder root and install dependencies:
     * npm i

2. request is defined as a peer-dependency and thus has to be installed separately:
     * npm install --save request
     * npm install --save request-promise

3. run node server:
     * node app.js

4. open `localhost:3000` in your browser of choice.
5. fill out the Start at text field with a url that you’d like to crawl.(ex. http://www.google.com )
6. by default, the search method, stop keyword, and graph’s max size are all preselected. Feel free to adjust these values as you see fit.
7. run the program!
8. results will be shown on a graphical model which illustrate all sites visited by our web crawler.

# Running In Production
Our Graphical Web Crawler is hosted on Heroku and can be reached with the URL listed in
Section 1.

1. visit URL: https://cs467-web2.herokuapp.com/
2. fill out the Start at text field with a url that you’d like to crawl.(ex. http://www.google.com )
3. by default, the search method, stop keyword, and graph’s max size are all preselected. Feel free to adjust these values as you see fit.
4. run the program!