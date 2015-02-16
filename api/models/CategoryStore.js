// api/models/CategoryStoreStore.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CategoryStoreStoreSchema = new Schema({
  name          : { type: String, required: true },
  reps          : { type: Number, required: true },
  experts       : { type: Number, required: true },
  investors     : { type: Number, required: true },
  timeStamp     : { type: Date, default: Date.now },
});

module.exports = mongoose.model('CategoryStore', CategoryStoreStoreSchema);
