const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  date: { type: String, required: true } // YYYY-MM-DD
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  role: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  type: { type: String, default: '' },
  salary: { type: String, default: '' },
  url: { type: String, default: '' },
  platform: { type: String, default: '' },
  status: { type: String, default: 'Wishlist' },
  dateSaved: { type: String, default: '' },
  lastUpdated: { type: String, default: '' },
  notes: { type: String, default: '' },
  statusHistory: [statusHistorySchema]
});

// Using a custom toJSON to map _id to id so frontend doesn't need to change much
applicationSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('Application', applicationSchema);
