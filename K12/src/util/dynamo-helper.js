var config = require('../config.json');

var aws = require("aws-sdk");
var Q = require("q");
var ResponseHelper = require('../models/response.js');

var credentials = {
    accessKeyId: config.aws.dynamoDB.accessKeyId, 
    secretAccessKey: config.aws.dynamoDB.secretAccessKey,
    region: config.aws.dynamoDB.region
};
var dynasty = require('dynasty')(credentials);
var students = dynasty.table('Students');
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

var getStudent = function(p_key, entry) {
	return students.find(p_key).then(function (val) {
		if(val == null) return errorResponse("Cannot find student "+p_key, 500);
		console.log(val);
		return successResponse(val);
	});
}

var putStudent = function(p_key, entry) {
	return students.find(p_key).then(function (val) {
		if(val == null) return errorResponse("Student "+p_key+" does not exist", 500);
		var params = {};
		for(var p in entry) {
			if(p != 'ssn')
				params[p] = entry[p];
		}
		return students.update(p_key, params).then(function (val) {
			if(val == null) return errorResponse("Cannot update student "+p_key, 500);
			return successResponse("Successfully updated student: "+p_key);
		});
	});
}

var postStudent = function(p_key, entry) {
	return students.find(p_key).then(function (val) {
		if(val != null) return errorResponse("Student "+p_key+" already exists", 500);
		var params = {};
		params.ssn = p_key;
		for(var p in entry) {
			params[p] = entry[p];
		}
		return students.insert(params).then(function (val) {
			if(val == null) return errorResponse("Cannot add new student "+p_key, 500);
			return successResponse("Successfully add new student: "+p_key);
		});
	});
}

var deleteStudent = function(p_key) {
	return students.find(p_key).then(function (val) {
		if(val == null) return errorResponse("Cannot find student "+p_key+" to delete", 500);
		return students.remove(p_key).then(function (val) {
			return successResponse("Successfully deleted student "+p_key);
		});
	});
}

var processMessage = function(message) {
	switch(message.Method){
		case "POST":
			return postStudent(message.Data.ssn, message.Data);
		case "PUT":
			return putStudent(message.Data.ssn, message.Data);
		case "GET":
			return getStudent(message.Data.ssn, message.Data);
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
