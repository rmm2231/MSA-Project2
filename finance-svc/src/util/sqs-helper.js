// based on the tutorial at : http://www.bennadel.com/blog/2792-shedding-the-monolithic-application-with-aws-simple-queue-service-sqs-and-node-js.htm

var config = require('../config.json');

var aws = require( "aws-sdk" );
var Q = require( "q" );

var sqs = new aws.SQS({
    region: config.aws.region,
    accessKeyId: config.aws.accessID,
    secretAccessKey: config.aws.secretKey,
    
    params: {
        QueueUrl: config.aws.queueUrl
    }
});

module.exports = {}