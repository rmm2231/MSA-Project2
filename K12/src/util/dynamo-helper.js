// based on the tutorial at : http://www.bennadel.com/blog/2792-shedding-the-monolithic-application-with-aws-simple-queue-service-sqs-and-node-js.htm

var config = require('../config.json');

var aws = require("aws-sdk");

var dynamodbDoc = new aws.DynamoDB.DocumentClient();
var dynamodb = new aws.DynamoDB();
