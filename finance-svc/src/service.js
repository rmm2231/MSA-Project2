var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var mongoose = require('mongoose');

// Util Helpers
var FinanceHelper = require('./util/finance-helper.js');
var TenantHelper = require('./util/tenant-helper.js');
var SchemaHelper = require('./util/schema-helper.js');
var SQSHelper = require('./util/sqs-helper.js');

// Models
var Finance = require('./models/finance.js');
var ExtraAttr = require('./models/extra-attributes.js');
var SchemaChanges = require('./models/schema-changes.js');
var Tenant = require('./models/tenant.js');

//var mongodb_ip = 'mongodb://0.0.0.0:27017';
// Docker Environment
var mongodb_ip = 'mongodb://' + process.env.MONGO_PORT_27017_TCP_ADDR + ':' + process.env.MONGO_PORT_27017_TCP_PORT;

var connectWithRetry = function () {
    return mongoose.connect(mongodb_ip, function (err) {
        if (err) {
            console.error('Failed to connect to mongo on startup - retrying in 1 sec', err);
            setTimeout(connectWithRetry, 1000);
        }
    });
};
connectWithRetry();
console.log("Connect to Mongodb at " + mongodb_ip);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.send('This is Finance service');
});

var process_promise = function(promise, res){
    promise.then(function(val) {
        res.status(val.Status).send(val.Data ? val.Data : val.Error);
    });
}

var verify_tenant = function(tid) {
    return TenantHelper.get_tenant(tid).then(function(tenant){
        return tenant.Data.length != 0;
    });
}

////======== FINANCE API ========\\\\
/* Add a new entry to the finances table */
app.post('/finances', function (req, res) {
    
    if (req.body == null) {
        res.status(400).send('Request body is empty!');
        return;
    }
    
    verify_tenant(req.body.tid).then(function(exists){
        if (exists)
            process_promise(FinanceHelper.post_finances(req.body), res);
        else
            res.status(400).send("Tenant does not exist");
    });
    
});

/* Gets all of the finances */
app.get('/finances', function (req, res) {

    process_promise(FinanceHelper.get_finances(req.query['ssn'], req.query['tid']), res);
    
});

/* Update this users information*/
app.put('/finances', function (req, res) {
    if (req.body.ssn == null || req.body.tid == null) {
        res.status(400).send("SSN and TID required")
    }
    
    verify_tenant(req.body.tid).then(function(exists){
        if (exists)
            process_promise(FinanceHelper.put_finances(req.body), res);
        else
            res.status(400).send("Tenant does not exist");
    });
});

/* Delete a user from the finance table */
app.delete('/finances', function (req, res) {
    if (req.query == null) {
        res.status(400).send('No parameters');
        return;
    }

    if (req.query['ssn'] == null || req.query['tid'] == null) {
        res.status(400).send('SSN and TID required');
        return;
    }

    process_promise(FinanceHelper.delete_finances(req.query['ssn'], req.query['tid']), res);
});

////======== SCHEMA API ========\\\\

/* Post a new change to the schema */
app.post('/schema', function (req, res) {
    verify_tenant(req.body.tid).then(function(exists){
        if (exists)
            process_promise(SchemaHelper.web_post(req.body), res);
        else
            res.status(400).send("Tenant does not exist");
    });
});

app.get('/schema', function (req, res) {
    process_promise(SchemaHelper.web_get(req.query['tid']), res);
});

////======== TENANT API ========\\\\

app.post('/tenant', function (req, res) {
    process_promise(TenantHelper.post_tenant(req.body), res);
});

app.get('/tenant', function (req, res) {
   process_promise(TenantHelper.get_tenant(req.body.tid), res);
});

app.put('/tenant', function (req, res) {
   process_promise(TenantHelper.put_tenant(req.body), res);
});

app.delete('/tenant', function (req, res) {
   process_promise(TenantHelper.delete_tenant(req.body.tid), res);
});

////======== HELPER API ========\\\\

app.delete('/all', function (req, res) {
    Tenant.remove({}).exec();
    ExtraAttr.remove({}).exec();
    SchemaChanges.remove({}).exec();
    Finance.remove({}).exec();

    res.status(200).send("Cleared all data");
});

app.get('/extra-attr', function (req, res) {
    ExtraAttr.find({}, function (err, results) {
        if (err) {
            res.status(500).send("failed to get all extra attrs");
            return;
        }

        res.status(200).send(results);
    });
});

SQSHelper.pollQueue();

var server = app.listen(3000, "0.0.0.0", function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Finance service listening at http://%s:%s', host, port);
});