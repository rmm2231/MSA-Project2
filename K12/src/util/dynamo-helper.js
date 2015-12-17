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

/* 
 * This function will return a promise containing the response data (alternatively you can just 
 * return the response object without wrapping it in a promise and alter the SQS helper to not
 * wait for a promise to return). 
 *
 * I don't think the below will work because I think the dynamodbDoc.* functions are asynchronous.
 * take a look at http://dynastyjs.com/ for one that you can use with promises. Basically,
 * you would do a var promise = dynasty.insert(<object>).then(function(resp) {return new ResponseHelper object based on the resp});
 * or you can just do return dynasty.insert(<object>).then(function(resp) {return new ResponseHelper object based on the resp});
 */
var postStudent = function(p_key, entry) {
	var response; //TODO: copy over the response.js file into your models folder
	
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
	var dynamolog = dynamodbDoc.put(params, function(err, data) {
		if (err) {
			console.error("Unable to add student", p_key, ". Error JSON:", JSON.stringify(err, null, 2));
			/*
			 * You do not need to talk to SQS here. The response stuff is only sent to the SQS queue if you
			 * are processing an SQS request. This function will return for you a promise containing the 
			 * the response data of the execution of the post
			 */
			response = errorResponse(err, 500);
		} else {
			console.log("PutItem succeeded:", p_key);
			// See note above
			response = successResponse("Saved student with SSN: " + p_key);
		}
	});
	console.log(dynamolog);
	
	return new Promise(function(resolve, reject) {
		resolve(response);
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
