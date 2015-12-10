var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var mongoose = require('mongoose');

var Finance = require('./models/finance.js');

// Docker Environment
var mongodb_ip = 'mongodb://'+process.env.MONGO_PORT_27017_TCP_ADDR+':'  +process.env.MONGO_PORT_27017_TCP_PORT;

var connectWithRetry = function() {
  return mongoose.connect(mongodb_ip, function(err) {
    if (err) {
        console.error('Failed to connect to mongo on startup - retrying in 1 sec', err);
        setTimeout(connectWithRetry, 1000);
      }
  });
};
connectWithRetry();
console.log("Connect to Mongodb at "+mongodb_ip);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', function (req, res) {
  res.send('This is Finance service');
});

/* Add a new entry to the finances table */
app.post('/finances', function(req, res) {
    if (req.body == null) {
        res.status(400).send('Request body is empty!');
        return;
    }
    
    Finance.find({
            ssn:req.body.ssn,
            tid:req.body.tid
        },
        function(err, result) {
            var finance = new Finance();
        
            if (result.length > 0) {
                res.status(409).send('this entry already exists');
                return;
            }
            finance.ssn = req.body.ssn;
            finance.firstName = req.body.firstName;
            finance.lastName = req.body.lastName;
            finance.balance = req.body.balance
                                ? req.body.balance
                                : 0;
            finance.due = req.body.due
                                ? Date.parse(req.body.due)
                                : new Date();
            finance.tid = req.body.tid;

            finance.save(function(err) {
                if (err) {
                    res.status(500).send(err);
                    return;
                }
                res.status(400).send('Finance added for SSN: ' + finance.ssn);
            });
        }
    );
});

/* Gets all of the finances */
app.get('/finances', function(req,res) {
    if (req.query['tid'] && req.query['ssn']) {
        Finance.find(
            {ssn:req.params.ssn, tid:req.params.tid},
            function(err,results) {
                if (err) {
                    res.status(500).send("Error finding finances for SSN: " + req.params.ssn + " and TID: " + req.params.tid);
                    return;
                }
                res.send(results);
            }
        );
    } else if (req.query['ssn']) {
        Finance.find(
            {ssn:req.params.ssn},
            function(err,results) {
                if (err) {
                    res.status(500).send("Error finding finances for SSN: " + req.params.ssn);
                    return;
                }
                res.send(results);
            }
        );
    } else {
        Finance.find(function(err, finances) {
            if(err) {
                res.send(err);
                return;
            }
            res.send(finances);
        });
    }
});

/* Update this users information*/
app.put('/finances', function(req, res) {
    if (req.body.ssn == null || req.body.tid == null) {
        res.status(400).send("SSN and TID required")
    }
    
    Finance.findOne(
        {ssn:req.body.ssn, tid:req.body.tid},
        function(err, finance) {
            if (err) {
                res.status(500).send(err);
                return;
            }
            
            finance.firstName = req.body.firstName
                                ? req.body.firstName
                                : finance.firstName;
            
            finance.lastName = req.body.lastName
                                ? req.body.lastName
                                : finance.lastName;
            
            finance.balance = req.body.balance
                                ? req.body.balance
                                : finance.balance;
            
            finance.due = req.body.due
                                ? req.body.due
                                : finance.due;
            finance.save(function(err) {
                if (err) {
                    res.status(500).send("Error updating user");
                    return;
                }
                
                res.json({message: "Updated user finances"});
            });
        }
    );
});

/* Delete a user from the finance table */
app.delete('/finances', function(req, res) {
    if (req.query == null) {
        res.status(400).send('No parameters');
        return;
    }
    
    if (req.query['ssn'] == null) {
        res.status(400).send('SSN required');
        return;
    }
    
    if (req.query['tid']) {
        Finance.remove({ssn:req.query['ssn'], tid:req.query['tid']}, 
            function(err) {
                if (err) {
                    res.status(500).send("Failed to delete for SSN: " + req.query['ssn'] + "and TID: " + req.query['tid']);
                    return;
                }
                res.json({message: "successfully deleted for SSN: " + req.query['ssn'] + "and TID: " + req.query['tid']});
            }
        );
        
        return;
    }
    
    Finance.remove({ssn:req.query['ssn']},
        function(err) {
            if (err) {
                res.status(500).send("Failed to delete for SSN: " + req.query['ssn']);
                return;
            }
            res.json({message: "successfully deleted for SSN: " + req.query['ssn']});
        }
    );
});

var server = app.listen(3000, "0.0.0.0", function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Finance service listening at http://%s:%s', host, port);
});