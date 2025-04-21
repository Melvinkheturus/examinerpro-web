const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['theme', 'pdfSaveLocation', 'evaluationRate']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp when document is updated
SettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Initialize default settings if they don't exist
SettingSchema.statics.initializeDefaults = async function() {
  const defaults = [
    { key: 'theme', value: { isDarkMode: false } },
    { key: 'pdfSaveLocation', value: './downloads' },
    { key: 'evaluationRate', value: 10.0 }
  ];

  for (const setting of defaults) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true, new: true }
    );
  }
};

const Setting = mongoose.model('Setting', SettingSchema);

module.exports = Setting; 