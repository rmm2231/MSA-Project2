Finance service is encapsulated in a docker container. To spin-up a finance service instance, type:
	docker-compose -p INSTANCE_NAME up -d
Before spinning up another finance instance, you have to change the ports mapping in the YML file. To build the finance image, type:
	docker build -t finance-svc .

API:
    GET /:
        Returns an info string about the service
        
FINANCES API:
    GET /finances:
        Without query parameters it returns all the finances in the system. The two available
        parameters are SSN and TID, both are optional
    POST /finances:
        Add a new finance entry. SSN and TID are required fields. Below are the fields and
        descriptions:
            ssn: {type: String, required: true},
            firstName: String,
            lastName: String,
            balance: Number,
            due: Date,
            tid: {type: Number, required: true}
    DELETE /finances:
        SSN and TID are both required parameters. Allows you to delete one finance entry. 
    PUT /finances:
        Use this to update a user's finance information, required parameters in body are ssn and tid
        
TENANT API:
    GET /tenant:
        TID is an optional parameter. Passing it will return a specific tenant
    POST /tenant:
        Add a new tenant entry. Below are the field descriptions:
            tid: {type: Number, required: true},
            tName: {type: String, required:true}
    DELETE /tenant:
        Requires TID to be passed. Deletes one tenant entry
    PUT /tenant:
        Updates a tenant entry. The same fields as above can be passed to update

SCHEMA API:
    GET /schema:
        TID is an optional parameter. Passing it will return all changes for a specific tenant
    POST /schema:
        used to create a new schema change for a tenant. Below is a description of the fields:
        tid: {
            type: Number,
            required: true
        },
        columnName: {
            type: String,
            required:true
        },
        columnType: {
            type: String,
            required:true,
            validate: {
                validator: function(v) {
                    return v === "String" || v === "Number" || v === "Date";
                },
                message: '{VALUE} is not a supported type. Supported types are "String", "Number", "Date"'
            }
        },
        required: {
            type: Boolean,
            default: false
        }
        The column type is limited to Strings, Numbers, and Dates

SQS API:
    All of the above API's can be accessed through SQS as well.
    Within config.json, set up your SQS credentials and paths.
    Messages are expected in JSON format and appear as the following:
    
    {
        "Method":"POST | GET | PUT | DELETE",
        "Area":"Finance | Tenant | Schema",
        "Data" {
            /* The data required for the specific api call*/
        }
    }
    
    After processing the message, a response is sent to the Queue in the following format:
    
    {
        "Error":"NULL | STRING",
        "Status": HTTP_STATUS_CODE,
        "Data": "NULL | OBJECT", //return null if error is not null and contains the response data from the call
        "OriginalMessage": OBJECT //the message body that was processed
    }
    

        