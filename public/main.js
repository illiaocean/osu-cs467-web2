/**
 * Created by illia on 7/6/18.
 */
(function () {
    var ws = new WebSocket("ws://localhost:12345");
    ws.onmessage = function (msg) {
        alert(msg.data);
    };
    ws.onopen = function () {
        ws.send('Hello from the client!');
    };
})();