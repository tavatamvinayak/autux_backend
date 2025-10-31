const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String },
  highlight: { type: String},
  subtitle: { type: String },
  url: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);