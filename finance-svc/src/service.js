var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var mongoose = require('mongoose');
var FinanceHelper = require('./util/finance-helper.js');

// Models
var Finance = require('./models/finance.js');
var ExtraAttr = require('./models/extra-attributes.js');
var SchemaChanges = require('./models/schema-changes.js');
var Tenant = require('./models/tenant.js');

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

////======== FINANCE API ========\\\\

var verify_tenant = function(tid) {
    var exists = false;
    
    Tenant.count({tid:tid}).exec()
    .then(function(count) {
        if (count > 0)
            exists = true;
    });
    
    return exists;
}

/* Add a new entry to the finances table */
app.post('/finances', function (req, res) {
    if (req.body == null) {
        res.status(400).send('Request body is empty!');
        return;
    }
    
    if (!verify_tenant) {
        res.status(400).send('Tenant not found');
        return;
    }

    FinanceHelper.add_entry(req, res);
});

/* Gets all of the finances */
app.get('/finances', function (req, res) {
    
    if (req.query['tid'] != null && !verify_tenant) {
        res.status(400).send('Tenant not found');
        return;
    }
    
    FinanceHelper.get_finances(req, res);
});

/* Update this users information*/
app.put('/finances', function (req, res) {
    if (req.body.ssn == null || req.body.tid == null) {
        res.status(400).send("SSN and TID required")
    }
    
    if (!verify_tenant) {
        res.status(400).send('Tenant not found');
        return;
    }

    FinanceHelper.update_finances(req, res);
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
    
    if (!verify_tenant) {
        res.status(400).send('Tenant not found');
        return;
    }

    FinanceHelper.delete_finances(req, res);
});

////======== SCHEMA API ========\\\\

/* Post a new change to the schema */
app.post('/schema', function (req, res) {
    SchemaChanges.count({
            tid: req.body.tid,
            columnName: req.body.columnName,
            columnType: req.body.columnType
        })
        .exec(function (err, count) {
            var schemaChange = new SchemaChanges();

            if (count > 0) {
                res.status(409).send("Entry already exists for TID: " + req.body.tid);
                return;
            }

            schemaChange.tid = req.body.tid;
            schemaChange.columnName = req.body.columnName;
            schemaChange.columnType = req.body.columnType;
            schemaChange.required = req.body.required;

            schemaChange.save(function (err) {
                if (err) {
                    res.status(400).send(err);
                    return;
                }

                res.status(200).send("Successfully added column for TID: " + req.body.tid);
            });
        });
});

app.get('/schema', function (req, res) {
    SchemaChanges.find({}, function (err, changes) {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.status(200).send(changes);
    });
});

////======== TENANT API ========\\\\

app.post('/tenant', function (req, res) {
    Tenant.count({
            tid: req.body.tid
        })
        .exec(function (err, count) {
            var tenant = new Tenant();

            if (count > 0) {
                res.status(409).send("Entry already exists for TID: " + req.body.tid);
                return;
            }

            tenant.tid = req.body.tid;
            tenant.tName = req.body.tName;

            tenant.save(function (err) {
                if (err) {
                    res.status(400).send(err);
                    return;
                }

                res.status(200).send("Successfully added tenant: " + req.body.tName + " TID: " + req.body.tid);
            });
        });

});

app.get('/tenant', function (req, res) {
    if (req.query['tid']) {
        Tenant.find({
            tid: req.query['tid']
        }, function (err, tenants) {
            if (err) {
                res.status(500).send(err);
                return;
            }
            res.status(200).send(tenants);
        });
    } else {
        Tenant.find({}, function (err, tenants) {
            if (err) {
                res.status(500).send(err);
                return;
            }
            res.status(200).send(tenants);
        });
    }
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

var server = app.listen(3000, "0.0.0.0", function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Finance service listening at http://%s:%s', host, port);
});