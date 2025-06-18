/**
 * Trade Predictor Module
 * Handles trade setup analysis and risk management
 */

const { formatDate } = require('../../utils/dateUtils');
const PatternAnalysis = require('../patterns/patternAnalysis');

const TradePredictor = {
  /**
   * Predicts trade success probability
   * @param {Object} setup - Trade setup details
   * @returns {Object} Prediction results
   */
  predictSetup: function(setup) {
    try {
      if (!this._validateSetup(setup)) {
        return {
          success: false,
          message: 'Invalid setup data'
        };
      }

      const history = PatternAnalysis.getPredictionHistory();
      const similarTrades = this._findSimilarTrades(setup, history);
      const prediction = this._calculateProbability(similarTrades);
      const baseStopLoss = this._calculateStopLoss(setup);

      return {
        success: true,
        prediction: {
          probability: prediction.probability,
          confidence: prediction.confidence,
          recommendedEntry: this._calculateEntry(setup),
          suggestedStopLoss: baseStopLoss,
          adjustedStopLoss: this._adjustForVolatility(setup, baseStopLoss),
          timeframeAlignment: this._analyzeTimeframes(setup),
          positionSize: this._calculatePositionSize(setup, baseStopLoss),
          timestamp: formatDate(new Date())
        }
      };
    } catch (e) {
      Logger.log('Prediction error:', e);
      return {
        success: false,
        message: e.toString()
      };
    }
  },

  /**
   * Finds similar historical trades with enhanced quality matching
   * @private
   */
  _findSimilarTrades: function(setup, history) {
    if (!history || !history.length) return [];

    // First get exact matches
    const exactMatches = history.filter(trade => 
      trade.modelType === setup.modelType &&
      trade.session === setup.session &&
      Math.abs(trade.qualityScore - setup.qualityScore) <= 0.2
    );

    // Use exact matches if we have enough
    if (exactMatches.length >= 2) {
      return exactMatches.slice(0, 5); // Limit to 5 matches
    }

    // Otherwise use broader criteria
    return history
      .filter(trade => 
        trade.modelType === setup.modelType &&
        trade.session === setup.session &&
        Math.abs(trade.qualityScore - setup.qualityScore) <= 0.5
      )
      .slice(0, 5); // Limit to 5 matches
  },

  /**
   * Calculates trade similarity score
   * @private
   */
  _calculateSimilarity: function(setup, trade) {
    // Quality score similarity (0-1)
    const qualityDiff = Math.abs(trade.qualityScore - setup.qualityScore);
    const qualitySimilarity = Math.max(0, 1 - (qualityDiff / 5));

    // Session time similarity if available
    let timeSimilarity = 1;
    if (setup.timestamp && trade.timestamp) {
      const hourDiff = Math.abs(
        new Date(setup.timestamp).getHours() - 
        new Date(trade.timestamp).getHours()
      );
      timeSimilarity = Math.max(0, 1 - (hourDiff / 24));
    }

    // Combined similarity score
    return Number(((qualitySimilarity * 0.7) + (timeSimilarity * 0.3)).toFixed(2));
  },

  /**
   * Calculates success probability with quality weighting
   * @private
   */
  _calculateProbability: function(similarTrades) {
    if (!similarTrades.length) {
      return {
        probability: 0,
        confidence: 0.1
      };
    }

    // Basic success ratio
    const successCount = similarTrades.filter(t => t.result === 'Success').length;
    const totalCount = similarTrades.length;
    
    // Quality weighted calculation
    const weights = similarTrades.map(trade => ({
      ...trade,
      weight: this._calculateTradeWeight(trade)
    }));

    const avgQuality = weights.reduce((sum, t) => sum + t.weight, 0) / weights.length;
    
    return {
      probability: Number((successCount / totalCount).toFixed(2)),
      confidence: Number(Math.max(0.15, Math.min(avgQuality, 1)).toFixed(2))
    };
  },

  /**
   * Calculates weight factor based on trade quality
   * @private
   */
  _calculateTradeWeight: function(trade) {
    // Start with higher base weight
    const baseWeight = 0.2;
    
    // Quality scaling (0.2 - 1.5 range)
    const qualityFactor = trade.qualityScore / 5;
    const qualityWeight = baseWeight + (qualityFactor * 1.3);
    
    // Recency factor (0.8 - 1.0 range)
    let recencyFactor = 1.0;
    if (trade.timestamp) {
      const daysSince = (new Date() - new Date(trade.timestamp)) / (1000 * 60 * 60 * 24);
      recencyFactor = Math.max(0.8, 1 - (daysSince / 30));
    }

    // Ensure final weight is above 0.1
    const finalWeight = Number((qualityWeight * recencyFactor).toFixed(2));
    return Math.max(0.2, finalWeight);
  },

  /**
   * Calculates recommended entry price
   * @private
   */
  _calculateEntry: function(setup) {
    // Implementation depends on your specific entry calculation logic
    return setup.currentPrice || 0;
  },

  /**
   * Calculates suggested stop loss
   * @private
   */
  _calculateStopLoss: function(setup) {
    // Implementation depends on your risk management rules
    const riskPercentage = 0.01; // 1% risk
    return setup.currentPrice * (1 - riskPercentage);
  },

  /**
   * Adjusts stop loss for volatility
   * @private
   */
  _adjustForVolatility: function(setup, baseStopLoss) {
    if (setup.volatility === 'high') {
      return baseStopLoss * 0.85; // Tighter stop for high volatility
    }
    return baseStopLoss;
  },

  /**
   * Analyzes timeframes for alignment
   * @private
   */
  _analyzeTimeframes: function(setup) {
    if (!setup.timeframes || !setup.timeframes.length) {
      return null;
    }

    return setup.timeframes.reduce((acc, tf) => {
      acc[tf] = {
        trend: 'bullish', // Placeholder - implement real trend analysis
        strength: 0.8
      };
      return acc;
    }, {});
  },

  /**
   * Calculates position size based on risk
   * @private
   */
  _calculatePositionSize: function(setup, stopLoss) {
    if (!setup.accountBalance || !setup.maxRiskPercent) {
      return null;
    }

    const riskAmount = setup.accountBalance * (setup.maxRiskPercent / 100);
    const stopDistance = Math.abs(setup.currentPrice - stopLoss);
    return Math.floor(riskAmount / stopDistance);
  },

  /**
   * Validates setup data
   * @private
   */
  _validateSetup: function(setup) {
    return setup &&
           setup.modelType &&
           setup.session &&
           typeof setup.qualityScore === 'number' &&
           setup.qualityScore >= 0 &&
           setup.qualityScore <= 5;
  }
};

module.exports = TradePredictor;