var ws, $searchSection, $form, $progress, $results, $history;
initWebSocket();
findElements();
initFormListener();

function initWebSocket() {
    var protocol = window.location.protocol === 'https:' ?  'wss' : 'ws';
    var host = window.location.host;
    var URL = protocol + "://" + host;
    ws = new WebSocket(URL);
    ws.onmessage = function (msg) {
        console.log("Received a message from server", msg.data);
        var message = JSON.parse(msg.data);

        switch (message.code) {
            case 'searching':
                showProgress();
                break;
            case 'progressUpdated':
                onProgressUpdate(message.data);
                break;
            case '404':
                handle404();
                break;
            case 'results':
                showResults(message.data);
                break;
        }
    };
    ws.onopen = function () {
        console.log('WS connection established.');
    };
    ws.onerror = function () {
        console.log('WS connection error.');
    };
    ws.onclose = function () {
        console.log('WS connection closed.');
    };
}

function findElements() {
    $searchSection = $('#search-form');
    $form = $searchSection.find('form');
    $progress = $('#progress');
    $results = $('#results');
    $history = $('#history');
}

function initFormListener() {
    $form.submit(onFormSubmit);
    $('.run-another').on('submit', function (event) {
        event.preventDefault();
        $form[0].reset();
        $('section').hide();
        $searchSection.show();
    });
}

function onFormSubmit(event) {
    event.preventDefault();
    var request = {
        code: 'search',
        data: {}
    };
    $form.serializeArray().forEach(function(input) {
        request.data[input.name] = input.value;
    });
    localStorage.setItem('currentParams', JSON.stringify(request.data));
    ws.send(JSON.stringify(request));
}

function showProgress() {
    $('section').hide();
    $progress.show();
}

function handle404() {

}

function onProgressUpdate(data) {
    $progress.find('.text')[0].innerText = `Websites discovered: ${data.count}`;
}

function showResults(graph) {
    $('section').hide();
    $results.show();
    buildGraph(graph);
    saveToHistory(graph);
}

function buildGraphFromHistory(event) {
    var index = Number(event.target.getAttribute('data-index'));
    var graphs = JSON.parse(localStorage.getItem('history'));
    var graph = graphs[index].graph;
    $('section').hide();
    $results.show();
    buildGraph(graph);
}

function buildGraph(graph) {
    var links = getUniqueLinks(graph);
    var nodes = getGraphNodes(links, graph);
    var edges = getGraphEdges(links, graph);
    var container = document.getElementById('graph');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        // configure: {
        //     enabled: true,
        //     filter: 'physics',
        //     showButton: true
        // }
    };
    var network = new vis.Network(container, data, options);

    //Open website in a new tab on node click
    network.on( 'click', function(properties) {
        var ids = properties.nodes;

        if (!ids.length) {
            return;
        }

        var node = nodes.get(ids)[0];
        var newWindow = window.open(node.title, '_blank');
        newWindow.focus();
    });
}

function getUniqueLinks(node) {
    var links = {
        _count: 1
    };
    traverse(links, node);
    delete links._count;
    return links;
}

function traverse(links, node) {
    if (links[node.url]) {
        return;
    }

    links[node.url] = links._count++;

    if (node.webLinks) {
        node.webLinks.forEach(function (child) {
            traverse(links, child);
        });
    }
}

function getGraphNodes(links) {
    var linksArray = [];

    for (var url in links) {
        if (links.hasOwnProperty(url)) {
            linksArray.push({
                id: links[url],
                label: url.length > 20 ? url.substring(0, 20) + "..." : url,
                title: url
            });
        }
    }

    return new vis.DataSet(linksArray);
}

function getGraphEdges(links, node) {
    var edges = [];
    addEdges(edges, links, node);
    return new vis.DataSet(edges);
}

function addEdges(edges, links, node) {
    if (!node.webLinks) {
        return;
    }

    node.webLinks.forEach(function (child) {
        edges.push({
            from: links[node.url],
            to: links[child.url]
        });
        addEdges(edges, links, child);
    });
}

function saveToHistory(graph) {
    var key = 'history';
    var allGraphs = localStorage.getItem(key);
    var graphsArray = allGraphs ? JSON.parse(allGraphs) : [];
    graphsArray.unshift({
        date: new Date(),
        params: JSON.parse(localStorage.getItem('currentParams')),
        graph: graph
    });
    localStorage.setItem(key, JSON.stringify(graphsArray));
}

function showHistory() {
    $('section').hide();
    $history.show();
    fillHistoryTable();
}

function fillHistoryTable() {
    var graphs = JSON.parse(localStorage.getItem('history'));

    if (graphs && graphs.length) {
        $history.find('table').show();
        $history.find('.build').hide();
        $history.find('tbody')[0].innerHTML = '';

        for (var i = 0; i < graphs.length; i++) {
            var date = new Date(graphs[i].date);
            $history.find('tbody').append("" +
                "<tr><td>" + (i + 1) +"</td>" +
                "<td>" + date.toLocaleDateString() + " " + date.toLocaleTimeString() + "</td>" +
                "<td>" + graphs[i].params.url + "</td>" +
                "<td>" + graphs[i].params.searchMethod + "</td>" +
                "<td><button type='button' class='btn btn-primary' onclick='buildGraphFromHistory(event)' data-index='" + i + "'>Build</button></td></tr>");
        }
    } else {
        $history.find('table').hide();
        $history.find('.build').show();
    }
}