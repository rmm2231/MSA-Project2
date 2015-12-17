This K-12 service is a simulation of real-world K-12 database. DynamoDB is applied.

API:
    GET /:
        Returns an info string about the service
        
STUDENT API:
    GET /student/{ssn}:
        SSN is required to get info of a student. DynamoDB is fully key-partitioned and we cannot apply additional parameters.

    POST /student/{ssn}:
        Add a new student entry. SSN is required. Other fields should be included in the request body.

    DELETE /student/{ssn}:
        SSN is required. Allows you to delete one student entry. No other attributes needed.

    PUT /student/{ssn}:
        Updates a student’s information. SSN is required and unchangeable. Include other fields in the JSON body.

SQS API:
    All of the above API's can be accessed through SQS as well.
    Within config.json, set up your SQS credentials and paths.
    Messages are expected in JSON format and appear as the following:
    
    {
        "Method":"POST | GET | PUT | DELETE",
        "Area”:”Student”,
        "Data" : {
            /* The data required for the specific api call*/
        }
    }
    
    Messages that do not have the three (case-sensitive) properties above will be ignored. Those that do, but contain
    bad data in them will be removed and a response will be sent (see below).
    
    After processing the message, a response is sent to the Queue in the following format:
    
    {
        "Error":"NULL | STRING",
        "Status": HTTP_STATUS_CODE,
        "Data": "NULL | OBJECT", //return null if error is not null and contains the response data from the call
        "OriginalMessage": OBJECT //the message body that was processed
    }
    

        