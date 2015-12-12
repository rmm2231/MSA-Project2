var Finance = require('../models/finance.js');
var SchemaChanges = require('../models/schema-changes.js');
var ExtraAttr = require('../models/extra-attributes.js');

var HelperResponse = require('../models/response.js');
var SchemaHelper = require('./schema-helper.js');

//==== HELPERS ====\\

function _reflect(promise) {
    return promise.then(function (data) {
            return data;
        },
        function (err) {
            throw new Error(err);
        });
}

function successResponse(data) {
    return new HelperResponse(null, 200, data);
}

function errorResponse(err, code) {
    return new HelperResponse(err, code, null);
}

var _get_finances = function (ssn, tid) {
    var query_opts = !ssn && !tid ? {} : !tid ? {
        ssn: ssn
    } : {
        ssn: ssn,
        tid: tid
    };

    return Finance.find(query_opts, function (err, finances) {
        if (err)
            throw new Error(err);
        return finances;
    });
}

var _get_one_finance = function (ssn, tid) {
    return Finance.findOne({
        ssn: ssn,
        tid: tid
    }, function (err, finance) {
        if (err)
            throw new Error(err);
        return finance;
    });
}

var _get_extra_info = function (finance) {
    return ExtraAttr.find({
        ssn: finance.ssn,
        tid: finance.tid
    }, function (err, attrs) {
        if (err)
            throw new Error(err);
        return attrs;
    });
}

var _get_extra_attr = function (ssn, tid, columnName) {
    return ExtraAttr.findOne({
        ssn: ssn,
        tid: tid,
        attrName: columnName
    }, function (err, attr) {
        if (err)
            throw new Error(err);
        return attr;
    });
}

var _count_finances = function (ssn, tid) {
    return Finance.count({
        ssn: ssn,
        tid: tid
    }, function (err, count) {
        if (err)
            throw new Error(err);
        return count;
    });
}

var _save_finance = function (entry) {
    var finance = new Finance(entry);

    return finance.save(function (err, saved) {
        if (err)
            throw new Error(err);
        return saved;
    });
}

var _save_extra_attr = function (attr) {
    var extra_attr = new ExtraAttr(attr);

    return extra_attr.save(function (err, saved) {
        if (err)
            throw new Error(err);
        return saved;
    });
}


var _update_or_insert_attr = function(entry, schemaChange) {
   return ExtraAttr.findOne({ssn:entry.ssn, tid:entry.tid, attrName:schemaChange.columnName}, function(err, old) {
        if (err)
            throw new Error(err);
        extraAttr = {};
        columnName = schemaChange.columnName;

        if (schemaChange.required && !entry.hasOwnProperty(columnName) && old == null) {
            return {old:old, attrName:columnName, err: {error_msg:"Field: " + columnName + " is required.", error_code:400} };
        }

        extraAttr.attrName = columnName;
        extraAttr.ssn = entry.ssn;
        extraAttr.tid = entry.tid;

        switch (schemaChange.columnType) {
        case "Number":
            var val = Number(entry[columnName] ? entry[columnName] : old.attrValue);
            if (isNaN(val)) {
                return {old:old, attrName:columnName, err: {error_msg:"Field: " + columnName + " must be a valid number", error_code:400} };
            }
            extraAttr.attrValue = val;
            break;
        case "String":
            extraAttr.attrValue = entry[columnName] ? entry[columnName] : old.attrValue;
            break;
        case "Date":
            var val = Date.parse(entry[columnName] ? entry[columnName] : old.attrValue);
            if (isNaN(val)) {
                return {old:old, attrName:columnName, err: {error_msg:"Field: " + columnName + " must be a valid date", error_code:400} };
            }
            extraAttr.attrValue = val;
            break;
        }
       
        ExtraAttr.update({ssn:extraAttr.ssn, tid:extraAttr.tid, attrName:columnName}, extraAttr, {upsert: true}).exec();
        return {old: old, attrName:columnName, err:null};
    });
}

var _roll_back_post = function (ssn, tid) {
    Finance.remove({
        ssn: ssn,
        tid: tid
    }).exec();
    ExtraAttr.remove({
        ssn: ssn,
        tid: tid
    }).exec();
}

//==== CRUD HELPERS ====\\

var get_full_finance_info = function (ssn, tid) {
    var finances_promise = _get_finances(ssn, tid);
    var financesArr;
    var promises = new Array();
    var combinedArr = new Array();

    return finances_promise.then(function (finances) {
        financesArr = finances;

        for (var i = 0; i < finances.length; i++) {
            promises.push(_get_extra_info(finances[i]));
        }
    }).then(function () {
        return Promise.all(promises.map(_reflect)).then(function (results) {
            results = [].concat.apply([], results);

            for (var i = 0; i < financesArr.length; i++) {
                var to_add = financesArr[i].toObject();
                var extraAttrs = results.filter(function (x) {
                    return x.tid == to_add.tid && x.ssn == to_add.ssn
                });

                for (var j = 0; j < extraAttrs.length; j++) {
                    to_add[extraAttrs[j].attrName] = extraAttrs[j].attrValue;
                }

                combinedArr.push(to_add);
            }

            return new HelperResponse(null, 200, combinedArr);
        }, function (err) {
            return new HelperResponse(err, 500, null);
        });
    });
}

var post_finances = function (entry) {
    var exists_promise = _count_finances(entry.ssn, entry.tid);

    return exists_promise.then(function (count) {
        if (count > 0) {
            return new HelperResponse("Entry already exists", 409, null);
        }
        return _save_finance(entry).then(function (saved) {
            //Get all the additional columns for this tenant
            return SchemaHelper.get_changes(saved.tid).then(function (changes) {
                //for each change, create and save the extra info that exists (or return if required)
                var save_promises = new Array();
                var extraAttr;
                var columnName;

                for (var i = 0; i < changes.length; i++) {
                    extraAttr = new ExtraAttr();
                    columnName = changes[i].columnName;

                    if (changes[i].required && !entry.hasOwnProperty(columnName)) {
                        _roll_back_post(entry.ssn, entry.tid);
                        return new HelperResponse("Field: " + columnName + " is required.", 400, null);
                    }
                    extraAttr.attrName = columnName;
                    extraAttr.ssn = entry.ssn;
                    extraAttr.tid = entry.tid;

                    switch (changes[i].columnType) {
                    case "Number":
                        var val = Number(entry[columnName]);
                        if (isNaN(val)) {
                            _roll_back_post(entry.ssn, entry.tid);
                            return new HelperResponse("Field: " + columnName + " must be a valid number", 400, null);
                        }
                        extraAttr.attrValue = val;
                        break;
                    case "String":
                        extraAttr.attrValue = entry[columnName];
                        break;
                    case "Date":
                        var val = Date.parse(entry[columnName]);
                        if (isNaN(val)) {
                            _roll_back_post(entry.ssn, entry.tid);
                            return new HelperResponse("Field: " + columnName + " must be a valid date", 400, null);
                        }
                        extraAttr.attrValue = val;
                        break;
                    }

                    save_promises.push(_save_extra_attr(extraAttr));
                }

                return Promise.all(save_promises.map(_reflect)).then(function (results) {
                    return new HelperResponse(null, 200, "Saved entry for SSN: " + entry.ssn + " TID: " + entry.tid);
                }, function (err) {
                    _roll_back_post(entry.ssn, entry.tid);
                    return new HelperResponse(err, 500, null);
                });

            }, function (err) {
                _roll_back_post(entry.ssn, entry.tid);
                return new HelperResponse(err, 500, null);
            });
        }, function (err) {
            _roll_back_post(entry.ssn, entry.tid);
            return new HelperResponse(err, 500, null);
        });
    }, function (err) {
        _roll_back_post(entry.ssn, entry.tid);
        return new HelperResponse(err, 500, null);
    });
}

var put_finances = function(entry) {
    return _get_one_finance(entry.ssn, entry.tid).then(function(finance) {
        var old = finance.toObject();
        delete old._id;
        console.log("updating finance");
        Finance.update({ssn:entry.ssn, tid:entry.tid}, entry, {}).exec();
        
        return SchemaHelper.get_changes(entry.tid).then(function (changes) {
            var save_promises = new Array();
            
            console.log("got changes " + changes.length);
            
            for (var i = 0; i < changes.length; i++) {
                console.log("pushing to array");
                save_promises.push(_update_or_insert_attr(entry, changes[i]));
            }
            
            console.log("made it out of the loop");
            
            return Promise.all(save_promises.map(_reflect)).then(function (results) {
                console.log("finished saving -- checking error");
                var error = results.filter(function(x) {return x.err != null;});
                
                if (error.length != 0) {
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].old != null)
                            ExtraAttr.findOneAndUpdate({ssn:results[i].old.ssn, tid:results[i].old.tid}, results[i].old, {}).exec();
                        else 
                            ExtraAttr.remove({ssn:entry.ssn, tid:entry.tid, attrName:results[i].attrName}).exec();
                    }
                    Finance.findOneAndUpdate({ssn:old.ssn, tid:old.tid}, old, {}).exec();
                    return errorResponse(error[0].err.error_msg, error[0].err.error_code);
                }
                return successResponse("Saved entry for SSN: " + entry.ssn + " TID: " + entry.tid);
            }, function (err) {
                return errorResponse(err, 500);
            });

        }, function (err) {
            Finance.findOneAndUpdate({
                ssn: entry.ssn,
                tid: entry.tid
            }, old, {}).exec();
            return errorResponse(err, 500);
        });
        
    }, function (err) {
        return errorResponse(err, 500); 
    });
}

var delete_finances = function(ssn, tid) {
    var query_opts = {ssn: ssn, tid: tid};
    
    return Finance.remove(query_opts, function(err) {
       if (err)
           throw new Error(err);
    }).then(function(){
        return ExtraAttr.remove(query_opts, function(err){
            if (err)
                throw new Error(err);
        }).then(function() {
            return successResponse("Deleted finance data for SSN: " + ssn + " TID: " + tid);
        }, function(err){
            return errorResponse(err, 500)
        })
    }, function(err) {
        return errorResponse(err, 500);  
    });
}

module.exports = {
    post_finances: post_finances,
    get_finances: get_full_finance_info,
    put_finances: put_finances,
    delete_finances: delete_finances
}