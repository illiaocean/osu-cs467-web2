(function () {
    var ws, $searchSection, $form, $progress, $results;
    initWebSocket();
    findElements();
    initFormListener();

    function initWebSocket() {
        ws = new WebSocket("ws://cs467-web2.herokuapp.com");
        ws.onmessage = function (msg) {
            console.log("Received a message from server", msg.data);
            var message = JSON.parse(msg.data);

            switch (message.code) {
                case 'searching':
                    showProgress();
                case 'progressUpdated':
                    onProgressUpdate(message.data);
                case '404':
                    handle404();
                case 'results':
                    showResults(message.data);

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
    }

    function initFormListener() {
        $form.submit(onFormSubmit);
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
        ws.send(JSON.stringify(request));
    }

    function showProgress() {
        $searchSection.hide();
        $progress.show();
    }

    function handle404() {

    }

    function onProgressUpdate() {

    }

    function showResults(graph) {
        $progress.hide();
        $results.show();
        buildGraph(graph);
    }

    function buildGraph(graph) {
        var links = getUniqueLinks(graph);
        var edges = getGraphEdges(links, graph);
        var container = document.getElementById('graph');
        var data = {
            nodes: nodes,
            edges: edges
        };
        var options = {};
        new vis.Network(container, data, options);
    }

    function getUniqueLinks(node) {
        var links = {};
        //todo: traverse graph
        var nodes = new vis.DataSet([
            {id: 1, label: 'Node 1'},
            {id: 2, label: 'Node 2'},
            {id: 3, label: 'Node 3'},
            {id: 4, label: 'Node 4'},
            {id: 5, label: 'Node 5'}
        ]);

        return nodes;
    }

    function getGraphEdges(links, graph) {
        //todo: use links object to create a dataset of edges
        return new vis.DataSet([
            {from: 1, to: 3},
            {from: 1, to: 2},
            {from: 2, to: 4},
            {from: 2, to: 5}
        ]);
    }
})();