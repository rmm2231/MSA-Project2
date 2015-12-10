Student service is encapsulated in a docker container. To spin-up a student service instance, type:
	docker-compose -p INSTANCE_NAME up -d
Before spinning up another student instance, you have to change the ports mapping in the YML file. To build the student image, type:
	docker build -t student-svc .

API:
/student/add POST
	When this API is called, a new user with the specified name will be created in the database. Returns a unique 6-digit ID after the add operation is successful.

	Must be followed by a JSON request body. In the body a valid firstname and lastname field must be specified.

/student/info GET
	This API return student info with the student ID.

/student/delete DELETE
	This API deletes one student with the given student ID.

	The request body must contain a valid student ID and only one student ID, nothing else is reported as an error.

/student/update POST
	This API allows user to update any field of a student (except for student ID).

	All fields must be included in the database’s schema. If not, return 400. Must provide a valid student ID.

/student/addSchema POST
	This API is called to add a new field to schema.

	The request body must contain a schema name (schema) and its type (type). Type should be restricted to ‘string’, ’number’, ‘bool’.

/student/getall GET
	This API returns all student info. No parameter needed.