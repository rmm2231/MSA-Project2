var Tenant = require('../models/tenant.js');
var ResponseHelper = require('../models/response.js');

var _save_tenant = function(entry) {
    var tenant = new Tenant(entry);
    
    return tenant.save(function(err, saved){
       if (err)
           throw new Error(err);
        return saved;
    });
}

var _post_tenant = function(entry) {
    var tenant = new Tenant(entry);
    
    return Tenant.count({tid: entry.tid}, function(err, count) {
        if (err)
            throw new Error(err);
        return count;
    }).then(function(count){
        if (count > 0)
            return new ResponseHelper("Entry already exists for TID: " + entry.tid, 409, null);
        return _save_tenant(entry).then(function(saved){
            return new ResponseHelper(null, 200, "Saved entry for TID: " + entry.tid);
        }, function(err){
            return new ResponseHelper(err, 500, null);
        });
    },function(err){
        return new ResponseHelper(err, 500, null);
    });
}

var _get_tenant = function(tid) {
    var query_opt = tid ? {tid:tid} : {};
    
    return Tenant.find(query_opt, function(err, tenant){
       if (err)
           throw new Error(err);
        return tenant;
    }).then(function(tenant){
        return new ResponseHelper(null, 200, tenant);
    }, function(err){
        return new ResponseHelper(err, 500, null);
    });
}

var _put_tenant = function(entry) {
    return Tenant.update({tid:entry.tid}, {tName: entry.tName}, {}, function(err, saved) {
        if (err)
            throw new Error(err);
        return saved;
    }).then(function(saved){
        return new ResponseHelper(null, 200, "Updated TID: " + saved.tid);
    }, function(err){
        return new ResponseHelper(err, 500, null);
    });
}

var _delete_tenant = function(tid) {
    return Tenant.remove({tid:tid}, function(err) {
        if (err)
            throw new Error(err);
    }).then(function(){
        return new ResponseHelper(null, 200, "Deleted Entry with TID: " + tid);
    }, function(err){
        return new ResponseHelper(err, 500, null);
    });
}

var _process_message = function(message) {
    switch(message.Method){
        case "POST":
            return _post_tenant(message.Data);
        case "PUT":
            return _put_tenant(message.Data);
        case "GET":
            return _get_tenant(message.Data.tid);
        case "DELETE":
            return _delete_tenant(message.Data.tid);
        default:
            return new Promise(function(resolve, reject) {
                resolve(errorResponse("Method not supported", 501));
            });
    }
}

module.exports = {
    post_tenant: _post_tenant,
    get_tenant: _get_tenant,
    put_tenant: _put_tenant,
    delete_tenant: _delete_tenant,
    process_message: _process_message
};