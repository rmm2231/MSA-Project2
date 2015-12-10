var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FinanceSchema = new Schema({
    ssn: {type: String, required: true},
    firstName: String,
    lastName: String,
    balance: Number,
    due: Date,
    tid: {type: Number, required: true}
});

module.exports = mongoose.model('Finance', FinanceSchema);