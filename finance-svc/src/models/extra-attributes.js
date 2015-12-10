var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ExtraAttrSchema = new Schema({
    ssn: {
        type: String,
        required: true
    },
    tid: {
        type: Number,
        required: true
    },
    attrName: {
        type: String,
        required:true
    },
    attrValue: {
        type: Schema.Types.Mixed,
        required:true
    }
});

module.exports = mongoose.model('ExtraAttr', ExtraAttrSchema);