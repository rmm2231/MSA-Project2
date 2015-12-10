Student service is encapsulated in a docker container. To spin-up a student service instance, type:
	docker-compose -p INSTANCE_NAME up -d
Before spinning up another student instance, you have to change the ports mapping in the YML file. To build the student image, type:
	docker build -t student-svc .

API:
    GET /:
        Returns an info string about the service
    GET /finances:
        Without query parameters it returns all the finances in the system. The two available
        parameters are ssn and tid. TID requires that an SSN is passed as well and this will 
        return one specific entry from the table. Passing only an SSN will return all
        all the finance information for a person at each "University" it belongs to.
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
        SSN is a required query parameter and will delete all of that persons finance information.
        TID is an optional parameter to delete a specific entry.
    PUT /finances:
        Use this to update a user's finance information

        