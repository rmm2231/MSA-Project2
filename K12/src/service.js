var express = require('express');
var bodyParser = require('body-parser');
var config = require('../config.json');
var aws = require("aws-sdk");
var app = express();

// Util Helpers
var SQSHelper = require('./util/sqs-helper.js');

aws.config.update({
    accessKeyId: config.dynamodb.accessKeyId, 
    secretAccessKey: config.dynamodb.secretAccessKey,
    region: config.dynamodb.region
});

SQSHelper.pollQueue();

var dynamodbDoc = new aws.DynamoDB.DocumentClient();
var dynamodb = new aws.DynamoDB();

app.get('/', function(req, res) {
	res.send('This is K-12 service');
});

// CRUD API
app.post('/student/:ssn', function (req, res) {
	// Call Dynamo to write to DB
});

app.get('/student/:ssn', function (req, res) {
	if (req.query == null) {
	}
	// Call Dynamo
});

app.put('/student/:ssn', function (req, res) {
	if (req.body == null) {
		res.status(400).send('Request body is empty!');
		return;
	}
	// Call Dynamo to write to DB
});

app.delete('/student/:ssn', function (req, res) {
	// Call Dynamo to write to DB
});

var server = app.listen(3000, "0.0.0.0", function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Finance service listening at http://%s:%s', host, port);
});