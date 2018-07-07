(function () {
    var ws, $searchSection, $form, $progress, $results;
    initWebSocket();
    findElements();
    initFormListener();

    function initWebSocket() {
        ws = new WebSocket("ws://localhost:12345");
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
                    buildGraph(message.data);

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

    function buildGraph() {

    }
})();