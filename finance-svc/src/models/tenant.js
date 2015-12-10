var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TenantSchema = new Schema({
    tid: {type: Number, required: true},
    tName: {type: String, required:true}
});

module.exports = mongoose.model('Tenant', TenantSchema);