var SchemaChanges = require('../models/schema-changes.js');
var ResponseHelper = require('../models/response.js');

var _save_schema = function (entry) {
    var schema = new SchemaChanges(entry);

    return schema.save(function (err, saved) {
        if (err)
            throw new Error(err);
        return saved;
    });
}

var _get_schema_changes = function (tid) {
    var query_opts = tid ? {tid: tid} : {};

    return SchemaChanges.find(query_opts, function (err, changes) {
        if (err)
            throw new Error(err);
        return changes;
    });
}

var _get = function (tid) {
    console.log("getting schema changes");
    return _get_schema_changes(tid)
        .then(function (changes) {
                return new ResponseHelper(null, 200, changes);
            },
            function (err) {
                return new ResponseHelper(err, 500, null);
            });
}

var _post = function (entry) {

    return SchemaChanges.count({tid:entry.tid, columnName:entry.columnName}, function(err, count){
        if(err)
            throw new Error(err);
        return count;
    }).then(function (count) {
        if (count > 0)
            return new ResponseHelper("Entry already exists", 409, null);
        return _save_schema(entry).then(function (saved) {
            return new ResponseHelper(null, 200, "Successfully added column for TID: " + req.body.tid);
        }, function (err) {
            return new ResponseHelper(err, 500, null);
        });
    }, function (err) {
        return new ResponseHelper(err, 500, null);
    });
}

module.exports = {
    get_changes: _get_schema_changes,
    web_get: _get,
    web_post: _post
}