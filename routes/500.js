module.exports = function (err, req, res) {
    console.error(err.stack);
    res.status(500);
    res.send('500 Server Error');
};