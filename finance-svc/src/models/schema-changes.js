var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SchemaChangesSchema = new Schema({
    tid: {
        type: Number,
        required: true
    },
    columnName: {
        type: String,
        required:true
    },
    columnType: {
        type: String,
        required:true,
        validate: {
            validator: function(v) {
                return v == "String" || v == "Number" || v == "Date";
            },
            message: '{VALUE} is not a supported type. Supported types are "String", "Number", "Date"'
        }
    },
    required: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('SchemaChanges', SchemaChangesSchema);