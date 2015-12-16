var express = require('express');
var bodyParser = require('body-parser');
var app = express();

// Util Helpers
var SQSHelper = require('./util/sqs-helper.js');
var DynamoHelper = require('./util/dynamo-helper.js');

SQSHelper.pollQueue();

var server = app.listen(3000, "0.0.0.0", function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Finance service listening at http://%s:%s', host, port);
});