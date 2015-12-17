var config = require('../config.json');

var aws = require("aws-sdk");
var Q = require("q");
var ResponseHelper = require('../models/response.js');

aws.config.update({
    accessKeyId: config.aws.dynamoDB.accessKeyId, 
    secretAccessKey: config.aws.dynamoDB.secretAccessKey,
    region: config.aws.dynamoDB.region
});

var dynamodbDoc = new aws.DynamoDB.DocumentClient();
var dynamodb = new aws.DynamoDB();

function successResponse(data) {
    return new ResponseHelper(null, 200, data);
}

function errorResponse(err, code) {
    return new ResponseHelper(err, code, null);
}

var describeTable = function (tableName) {
	var tableInfo = dynamodb.describeTable({TableName:tableName}, function(err,result) {
		if(err) {
			console.log("err is "+err);
		}
	});
	return tableInfo;
}

var getStudent = function(entry) {
	// entry is a JSON object containing the query params
	// Connect to Dynamo
}

var putStudent = function(p_key, entry) {
	// Connect to Dynamo
}

var postStudent = function(p_key, entry) {
	var params = {
		TableName: "Students",
		Item: {
		}
	};
	params.ssn = p_key;
	for(var p in entry) {
		params.Item[p] = entry[p];
	}
	// Connect to Dynamo
	dynamodbDoc.put(params, function(err, data) {
		if (err) {
			console.error("Unable to add student", p_key, ". Error JSON:", JSON.stringify(err, null, 2));
			// Help: need to return error response to postStudent
			//errorResponse(err, 500);
		} else {
			console.log("PutItem succeeded:", p_key);
			// Help: need to return error response to postStudent
			//successResponse("Saved student with SSN: " + p_key);
		}
	});
}

var deleteStudent = function(p_key) {
	var query_opts = {ssn: p_key};
	// Connect to Dynamo
}

var processMessage = function(message) {
	switch(message.Method){
		case "POST":
			return postStudent(message.Data.ssn, message.Data);
		case "PUT":
			return putStudent(message.Data.ssn, message.Data);
		case "GET":
			return getStudent(message.Data);
		case "DELETE":
			return deleteStudent(message.Data.ssn);
		default:
			return new Promise(function(resolve, reject) {
				resolve(errorResponse("Method not supported", 501));
			});
	}
}

module.exports = {
	describeTable: describeTable,
	postStudent: postStudent,
	getStudent: getStudent,
	putStudent: putStudent,
	deleteStudent: deleteStudent,
	processMessage: processMessage
}