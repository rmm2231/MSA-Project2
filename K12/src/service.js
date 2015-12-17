var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config.json');
var aws = require("aws-sdk");
var Q = require("q");
var app = express();

// Util Helpers
var SQSHelper = require('./util/sqs-helper.js');
var dynamoHelper = require('./util/dynamo-helper.js');
var tableName = "Students";

var tableInfo = dynamoHelper.describeTable(tableName);

var process_promise = function(promise, res){
    promise.then(function(val) {
        res.status(val.Status).send(val.Data ? val.Data : val.Error);
    });
};

app.get('/', function(req, res) {
	res.send('This is K-12 service');
});

// CRUD API
app.post('/student/:ssn', function (req, res) {
	if(req.params == null || req.params.ssn == null) {
		res.status(400).send("SSN required")
	}
	// Call Dynamo to write to DB
	process_promise(dynamoHelper.postStudent(req.params.ssn, req.body), res);
});

app.get('/student', function (req, res) {
	if (req.query == null) {
	}
	// Call Dynamo
	process_promise(dynamoHelper.getStudent(req.query), res);
});

app.put('/student/:ssn', function (req, res) {
	if(req.params == null || req.params.ssn == null) {
		res.status(400).send("SSN required")
	}
	// Call Dynamo to write to DB
	process_promise(dynamoHelper.putStudent(req.params.ssn, req.body), res);
});

app.delete('/student/:ssn', function (req, res) {
	if(req.params == null || req.params.ssn == null) {
		res.status(400).send("SSN required")
	}
	// Call Dynamo to write to DB
	process_promise(dynamoHelper.deleteStudent(req.params.ssn), res);
});

SQSHelper.pollQueue();

var server = app.listen(3000, "0.0.0.0", function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('K-12 service listening at http://%s:%s', host, port);
});