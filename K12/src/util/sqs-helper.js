// based on the tutorial at : http://www.bennadel.com/blog/2792-shedding-the-monolithic-application-with-aws-simple-queue-service-sqs-and-node-js.htm

var config = require('../config.json');

var aws = require("aws-sdk");
var Q = require("q");
var dynamoHelper = require('./dynamo-helper.js')
var ResponseHelper = require('../models/response.js');

var sqsRes = new aws.SQS({
    region: config.aws.responseQueue.region,
    accessKeyId: config.aws.responseQueue.accessID,
    secretAccessKey: config.aws.responseQueue.secretKey,

    params: {
        QueueUrl: config.aws.responseQueue.queueUrl
    }
});

var sqsReq = new aws.SQS({
    region: config.aws.requestQueue.region,
    accessKeyId: config.aws.requestQueue.accessID,
    secretAccessKey: config.aws.requestQueue.secretKey,

    params: {
        QueueUrl: config.aws.requestQueue.queueUrl
    }
});

var sendResponseMessage = Q.nbind(sqsRes.sendMessage, sqsRes);
var receiveResponseMessage = Q.nbind(sqsRes.receiveMessage, sqsRes);
var deleteResponseMessage = Q.nbind(sqsRes.deleteMessage, sqsRes);

var sendRequestMessage = Q.nbind(sqsReq.sendMessage, sqsReq);
var receiveRequestMessage = Q.nbind(sqsReq.receiveMessage, sqsReq);
var deleteRequestMessage = Q.nbind(sqsReq.deleteMessage, sqsReq);

var supportedMethods = ['POST', 'GET', 'PUT', 'DELETE'];
var supportedAreas = ['Student'];

function pollQueueForMessages() {

    console.log("Starting long-poll operation.");

    receiveRequestMessage({
            WaitTimeSeconds: 3, // Enable long-polling (3-seconds).
            VisibilityTimeout: 10,
            MaxNumberOfMessages: 5,
            AttributeNames: ['SentTimestamp']
        })
        .then(
            function handleMessageResolve(data) {

                if (!data.Messages) {
                    throw (
                        workflowError(
                            "EmptyQueue",
                            new Error("There are no messages to process.")
                        )
                    );
                }
                
                var filtered_messages = data.Messages.filter(function (x) {
                    var json_body = JSON.parse(x.Body);
                    //we should delete the messages that don't have this field here and send a response to the queue
                    if (json_body.hasOwnProperty("Method") && json_body.hasOwnProperty("Area") && json_body.hasOwnProperty("Data"))
                        return true;
                    
                    sendResponseAndDeleteRequest(
                        workflowError(
                            "Bad Request",
                            new Error("Bad request message"),
                            json_body,
                            new ResponseHelper("Bad request message", 400, null)
                        )
                    );
                    return false;
                });
                var sorted_messages = filtered_messages.sort(function (a, b) {
                    return a.Attributes.SentTimestamp - b.Attributes.SentTimestamp;
                });

                if (sorted_messages.length <= 0) {
                    throw (
                        workflowError(
                            "EmptyQueue",
                            new Error("There are no messages to process.")
                        )
                    );
                }

                var message_to_process = sorted_messages[0];
                var message_data = JSON.parse(message_to_process.Body);

                if (supportedMethods.indexOf(message_data.Method) < 0) {
                    throw (
                        workflowError(
                            "UnsupportedOp",
                            new Error("There are no supported operations for method: " + message_data.Method),
                            message_data,
                            new ResponseHelper("There are no supported operations for method: " + message_data.Method, 501, null)
                        )
                    );
                }
                
                console.log("Processing Message");
                console.log(message_to_process);
                
                var process_response;
                try{
                    switch (message_data.Area) {
                    case "Student":
                        process_response = dynamoHelper.processMessage(message_data);
                        break;
                    default:
                        throw (
                            workflowError(
                                "UnsupportedOp",
                                new Error("There are no supported operations for area: " + message_data.Area),
                                message_data,
                                new ResponseHelper("There are no supported operations for area: " + message_data.Area, 501, null)
                            )
                        );
                    }
                } catch(error) {
                    throw (
                        workflowError(
                            "ProcessingError",
                            new Error(error),
                            message_data,
                            new ResponseHelper("Error processing message", 400, null)
                        )
                    );
                }
                return process_response.then(function (data) {
									var data = {};
                        data['OriginalMessage'] = message_data;
                        console.log("Sending response message");
                        return (
                            sendResponseMessage({
                                MessageBody: JSON.stringify(data)
                            })
                        );
                    }, function (err) {
                        throw (
                            workflowError(
                                err.type,
                                new Error(err.message ? err.message : err)
                            )
                        );
                    }).then(function (data) {
                        console.log("Response sent");
                        console.log("Deleting:", message_to_process.MessageId);
                        return (
                            deleteRequestMessage({
                                ReceiptHandle: message_to_process.ReceiptHandle
                            })
                        );
                    });
            }
        )
        .then(
            function handleDeleteResolve(data) {

                console.log("Message deleted");

            }
        )

    // Catch any error (or rejection) that took place during processing.
    .catch(
        function handleError(error) {
            handleWorkFlowError(error);
        }
    )

    .finally(pollQueueForMessages);

}

function workflowError(type, error, old_data, response) {
    error.type = type;
    error.old_data = old_data;
    error.response = response;
    
    return (error);
}

function sendResponseAndDeleteRequest(error) {
    error.response['OriginalMessage'] = error.old_data;

    sendResponseMessage({MessageBody: JSON.stringify(error.response)})
    .then(function(data){
        console.log("Sent response message");
			console.log(error);
        return deleteRequestMessage({ReceiptHandle: error.old_data.ReceiptHandle});
    }, function(err){
        console.log("Error sending message:", err);   
    })
    .then(function(data){
        console.log("Deleted message"); 
    }, function(err) {
        console.log("Error deleting message:", err);   
    });
}

function handleWorkFlowError(error) {
    switch (error.type) {
    case "EmptyQueue":
        console.log("Expected Error:", error.message);
        break;
    case "UnsupportedOp":
        console.log("Unsupported Op:", error.message);
        sendResponseAndDeleteRequest(error);
        break;
    case "ProcessingError":
        console.log("Processing Error:", error.message);
        sendResponseAndDeleteRequest(error);
        break;
    default:
        console.log("Unexpected Error:", error.message);
        break;
    }
}

module.exports = {
    pollQueue: pollQueueForMessages
}