const mongoose = require('mongoose');

const learningSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Content'
  },
  feedback: {
    type: String,
    required: true
  },
  metrics: {
    engagement: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  },
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const modelWeightsSchema = new mongoose.Schema({
  engagement: {
    type: Number,
    required: true,
    default: 1.0
  },
  relevance: {
    type: Number,
    required: true,
    default: 1.0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Static method to get latest weights
modelWeightsSchema.statics.getLatestWeights = async function() {
  const weights = await this.findOne().sort({ lastUpdated: -1 });
  return weights || {
    engagement: 1.0,
    relevance: 1.0,
    lastUpdated: new Date()
  };
};

// Static method to update weights
modelWeightsSchema.statics.updateWeights = async function(newWeights) {
  return this.create(newWeights);
};

// Static method to get training stats
modelWeightsSchema.statics.getTrainingStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        avgEngagement: { $avg: '$engagement' },
        avgRelevance: { $avg: '$relevance' },
        totalUpdates: { $sum: 1 }
      }
    }
  ]);

  return stats[0] || {
    avgEngagement: 1.0,
    avgRelevance: 1.0,
    totalUpdates: 0
  };
};

const LearningModel = mongoose.model('Learning', learningSchema);
const ModelWeights = mongoose.model('ModelWeights', modelWeightsSchema);

LearningModel.getLatestWeights = async () => {
  return {
    engagement: 1.2,
    relevance: 1.1,
    lastUpdated: new Date().toISOString()
  };
};

LearningModel.updateWeights = async (newWeights) => {
  return newWeights;
};

module.exports = {
  LearningModel,
  ModelWeights
}; 