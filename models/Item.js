const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  highlight: { type: String, required: true },
  subtitle: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);