var Finance = require('../models/finance.js');
var SchemaChanges = require('../models/schema-changes.js');
var ExtraAttr = require('../models/extra-attributes.js');

var _add_entry = function (req, res) {

    Finance.count({
        ssn: req.body.ssn,
        tid: req.body.tid
    }, function (err, count) {
        if (err)
            res.status(500).send(err);
        else if (count > 0)
            res.status(409).send("Entry already exists");
        else {
            // Add the base data
            var finance = new Finance();
            var error = null;

            finance.ssn = req.body.ssn;
            finance.firstName = req.body.firstName;
            finance.lastName = req.body.lastName;
            finance.balance = req.body.balance ? req.body.balance : 0;
            finance.due = req.body.due ? Date.parse(req.body.due) : new Date();
            finance.tid = req.body.tid;

            finance.save(function (err) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    var promise = SchemaChanges.find({
                        tid: req.body.tid
                    }).exec();
                    promise.then(function (changes) {
                            //Get all the schema changes for this tid
                            var extraAttr = new ExtraAttr();
                            extraAttr.ssn = finance.ssn;
                            extraAttr.tid = finance.tid;

                            for (i = 0; i < changes.length; i++) {
                                var columnName = changes[i].columnName;

                                if (changes[i].required && !req.body.hasOwnProperty(columnName)) {
                                    throw new Error("Field: " + columnName + " is required.");
                                }
                                extraAttr.attrName = columnName;

                                switch (changes[i].columnType) {
                                case "Number":
                                    var val = Number(req.body[columnName]);
                                    if (value == NaN)
                                        throw new Error("Field: " + columnName + " must be a valid number");
                                    extraAttr.attrValue = val;
                                    break;
                                case "String":
                                    extraAttr.attrValue = req.body[columnName];
                                    break;
                                case "Date":
                                    var val = Date.parse(req.body[columnName]);
                                    if (val == NaN)
                                        throw new Error("Field: " + columnName + " must be a valid date");
                                    extraAttr.attrValue = val;
                                    break;
                                }

                                extraAttr.save(function (err) {
                                    if (err)
                                        throw new Error(err);
                                });
                            }

                            res.status(200).send('Finance added for SSN: ' + finance.ssn + " TID: " + finance.tid);
                        }, function (err) {
                            res.status(500).send(error);
                            return;
                        })
                        .then(null, function (err) {
                            // on error rollback
                            ExtraAttr.remove({
                                ssn: finance.ssn,
                                tid: finance.tid
                            }).exec();
                            Finance.remove({
                                ssn: finance.ssn,
                                tid: finance.tid
                            }).exec();
                            res.status(500).send("Failed to save this user's information (" + err + ")");
                        });
                }
            });
        }
    });




}

var _get_finances = function (req, res) {
    var combined = {};
    var combinedArr = new Array();

    if (req.query['tid'] && req.query['ssn']) {
        var promise = Finance.findOne({
            ssn: req.query['ssn'],
            tid: req.query['tid']
        }).exec();

        promise.then(function (finance) {
            combined = finance;

            return ExtraAttr.find({
                ssn: finance.ssn,
                tid: finance.tid
            }).exec();

        }).then(function (attrs) {
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i];
                combined._doc[attr.attrName] = attr.attrValue;
            }

            res.status(200).send(combined);
        }).then(null, function (err) {
            res.status(500).send(err);
        });
    
    // this get all is more of a test, this shouldn't really be used
    } else {
        Finance.find(function (err, finances) {
            if (err) {
                res.send(err);
                return;
            }
            res.send(finances);
        });
    }
}

var _update_finances = function (req, res) {
    Finance.findOne({
            ssn: req.body.ssn,
            tid: req.body.tid
        },
        function (err, finance) {
            if (err) {
                res.status(500).send(err);
                return;
            }

            finance.firstName = req.body.firstName ? req.body.firstName : finance.firstName;

            finance.lastName = req.body.lastName ? req.body.lastName : finance.lastName;

            finance.balance = req.body.balance ? req.body.balance : finance.balance;

            finance.due = req.body.due ? req.body.due : finance.due;
            finance.save(function (err) {
                if (err) {
                    res.status(500).send("Error updating user");
                    return;
                } else {
                    var promise = SchemaChanges.find({
                        tid: req.body.tid
                    }).exec();

                    promise.then(function (changes) {
                            for (var i = 0; i < changes; i++) {
                                ExtraAttr.findOne({
                                    ssn: finance.ssn,
                                    tid: finance.tid,
                                    attrName: changes[i].columnName
                                }, function (err, attr) {
                                    if (err)
                                        throw new Error(err);
                                    if (attr == null) {
                                        var addAttr = new ExtraAttr();
                                        switch (changes[i].columnType) {
                                        case "String":
                                            addAttr.attrValue = req.body[attrName];
                                            break;
                                        case "Number":
                                            var value = Number(req.body[attrName]);
                                            if (value == NaN)
                                                throw new Error("Field " + req.body[attrName] + " must be a Number");
                                            addAttr.attrValue = value;
                                            break;
                                        case "Date":
                                            var value = Date(req.body[attrName]);
                                            if (value == NaN)
                                                throw new Error("Field " + req.body[attrName] + " must be a Date");
                                            addAttr.attrValue = value;
                                            break;
                                        }

                                        addAttr.save(function (err) {
                                            if (err)
                                                throw new Error(err);
                                        });
                                    } else if (attr.attrValue != req.body[attr.attrName] && req.body[attr.attrName] != null) {
                                        switch (changes[i].columnType) {
                                        case "String":
                                            attr.attrValue = req.body[attrName];
                                            break;
                                        case "Number":
                                            var value = Number(req.body[attrName]);
                                            if (value == NaN)
                                                throw new Error("Field " + req.body[attrName] + " must be a Number");
                                            attr.attrValue = value;
                                            break;
                                        case "Date":
                                            var value = Date(req.body[attrName]);
                                            if (value == NaN)
                                                throw new Error("Field " + req.body[attrName] + " must be a Date");
                                            attr.attrValue = value;
                                            break;
                                        }
                                        attr.save(function (err) {
                                            if (err)
                                                throw new Error(err);
                                        });
                                    }
                                });
                            }

                            res.status(200).send("Successfully updated information for user SSN: " + req.body.ssn + " TID: " + req.body.tid);

                        })
                        .then(null, function (err) {
                            res.status(500).send(err);
                        });

                }
            });
        }
    );
}

var _delete_finances = function (req, res) {
    if (!req.query['tid'] || !req.query['ssn']) {
        res.status(400).send("TID and SSN are required for delete");
        return;
    }
        Finance.remove({
                ssn: req.query['ssn'],
                tid: req.query['tid']
            }, function (err) {
                if (err)
                    throw new Error(err);
            })
            .then(function (finance) {
                return ExtraAttr.remove({
                    ssn: req.query['ssn'],
                    tid: req.query['tid']
                }, function (err) {
                    if (err)
                        throw new Error(err);
                });
            }, function (err) {
                res.status(500).send("Failed to delete for SSN: " + req.query['ssn'] + " TID: " + req.query['tid'] + "(" + err + ")");
            })
            .then(function (obj) {
                res.status(200).send("Deleted finances for SSN: " + req.query['ssn'] + " TID: " + req.query['tid']);
            }, function (err) {
                res.status(500).send("Failed to delete for SSN: " + req.query['ssn'] + " TID: " + req.query['tid'] + "(" + err + ")");
            });
}

module.exports = {
    add_entry: _add_entry,
    get_finances: _get_finances,
    update_finances: _update_finances,
    delete_finances: _delete_finances
}