// based on the tutorial at : http://www.bennadel.com/blog/2792-shedding-the-monolithic-application-with-aws-simple-queue-service-sqs-and-node-js.htm

var config = require('../config.json');

var aws = require("aws-sdk");
var Q = require("q");
var FinanceHelper = require('./finance-helper.js');
var TenantHelper = require('./tenant-helper.js');
var SchemaHelper = require('./schema-helper.js');
var ResponseHelper = require('../models/response.js');

var sqs = new aws.SQS({
    region: config.aws.region,
    accessKeyId: config.aws.accessID,
    secretAccessKey: config.aws.secretKey,

    params: {
        QueueUrl: config.aws.queueUrl
    }
});

var sendMessage = Q.nbind(sqs.sendMessage, sqs);
var receiveMessage = Q.nbind(sqs.receiveMessage, sqs);
var deleteMessage = Q.nbind(sqs.deleteMessage, sqs);

var supportedMethods = ['POST', 'GET', 'PUT', 'DELETE'];
var supportedAreas = ['Finance', 'Tenant', 'Schema'];

function pollQueueForMessages() {

    console.log("Starting long-poll operation.");

    // Pull a message - we're going to keep the long-polling timeout short so as to
    // keep the demo a little bit more interesting.
    receiveMessage({
            WaitTimeSeconds: 3, // Enable long-polling (3-seconds).
            VisibilityTimeout: 10,
            MaxNumberOfMessages: 5,
            AttributeNames: ['SentTimestamp']
        })
        .then(
            function handleMessageResolve(data) {

                // If there are no message, throw an error so that we can bypass the
                // subsequent resolution handler that is expecting to have a message
                // delete confirmation.
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
                    return json_body.hasOwnProperty("Method") && json_body.hasOwnProperty("Area") && json_body.hasOwnProperty("Data");
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
                    case "Finance":
                        process_response = FinanceHelper.process_message(message_data);
                        break;
                    case "Tenant":
                        process_response = TenantHelper.process_message(message_data);
                        break;
                    case "Schema":
                        process_response = SchemaHelper.process_message(message_data);
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
                            "ProccessingError",
                            new Error(error),
                            message_data,
                            new ResponseHelper("Error processing message", 400, null)
                        )
                    );
                }
                
                return process_response.then(function (data) {
                        data['OriginalMessage'] = message_data;
                        console.log("Sending response message");
                        return (
                            sendMessage({
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
                    })
                    .then(function (data) {
                        console.log("Response sent");
                        console.log("Deleting:", message_to_process.MessageId);
                        return (
                            deleteMessage({
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

function handleWorkFlowError(error) {
    switch (error.type) {
    case "EmptyQueue":
        console.log("Expected Error:", error.message);
        break;
    case "UnsupportedOp":
        console.log("Unsupported Op:", error.message);
        break;
    case "ProcessingError":
        console.log("Processing Error:", error.message);
        response['OriginalMessage'] = error.old_data;
            
        sendMessage({MessageBody: JSON.stringify(response)})
        .then(function(data){
            console.log("Sent response message");
            return deleteMessage({ReceiptHandle: old_data.ReceiptHandle});
        }, function(err){
            console.log("Error sending message:", err);   
        })
        .then(function(data){
            console.log("Deleted message"); 
        });
        break;
    default:
        console.log("Unexpected Error:", error.message);
        break;
    }
}

module.exports = {
    pollQueue: pollQueueForMessages
}