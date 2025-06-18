const { expect } = require('chai');
const sinon = require('sinon');
const TradePredictor = require('../../modules/trades/tradePredictor');
const PatternAnalysis = require('../../modules/patterns/patternAnalysis');

describe('TradePredictor', () => {
  let mockHistory;

  beforeEach(() => {
    mockHistory = [
      {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.5,
        result: 'Success'
      },
      {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.3,
        result: 'Success'
      },
      {
        modelType: 'FVG-RD',
        session: 'NY',
        qualityScore: 3.5,
        result: 'Failure'
      }
    ];

    sinon.stub(PatternAnalysis, 'getPredictionHistory').returns(mockHistory);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('predictSetup', () => {
    it('should predict trade success probability', () => {
      const setup = {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.4,
        currentPrice: 100
      };

      const result = TradePredictor.predictSetup(setup);
      expect(result.success).to.be.true;
      expect(result.prediction).to.have.property('probability');
      expect(result.prediction.probability).to.equal(1); // Both similar trades were successful
      expect(result.prediction.confidence).to.equal(0.2); // 2 samples = 20% confidence
    });

    it('should handle invalid setup data', () => {
      const result = TradePredictor.predictSetup({});
      expect(result.success).to.be.false;
      expect(result.message).to.equal('Invalid setup data');
    });
  });

  describe('Advanced Prediction Scenarios', () => {
    it('should handle low confidence scenarios', () => {
      mockHistory = [{ 
        modelType: 'FVG-RD',
        session: 'Asian',
        qualityScore: 4.0,
        result: 'Success'
      }];
      
      const setup = {
        modelType: 'FVG-RD',
        session: 'Asian',
        qualityScore: 4.0,
        currentPrice: 100
      };

      const result = TradePredictor.predictSetup(setup);
      expect(result.prediction.confidence).to.equal(0.1); // 1 sample = 10% confidence
    });

    it('should consider market volatility', () => {
      const volatileSetup = {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.4,
        currentPrice: 100,
        volatility: 'high'
      };

      const result = TradePredictor.predictSetup(volatileSetup);
      expect(result.prediction).to.have.property('adjustedStopLoss');
      expect(result.prediction.adjustedStopLoss).to.be.below(result.prediction.suggestedStopLoss);
    });

    it('should handle multiple timeframe analysis', () => {
      const mtfSetup = {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.4,
        currentPrice: 100,
        timeframes: ['H1', 'H4', 'D1']
      };

      const result = TradePredictor.predictSetup(mtfSetup);
      expect(result.prediction).to.have.property('timeframeAlignment');
      expect(result.prediction.timeframeAlignment).to.be.an('object');
    });

    it('should weight trades by quality score', () => {
      mockHistory = [
        { 
          modelType: 'FVG-RD',
          session: 'Asian',
          qualityScore: 5.0,
          result: 'Success',
          timestamp: new Date()
        },
        {
          modelType: 'FVG-RD',
          session: 'Asian',
          qualityScore: 2.0,
          result: 'Success',
          timestamp: new Date()
        }
      ];
      
      const setup = {
        modelType: 'FVG-RD',
        session: 'Asian',
        qualityScore: 4.0,
        currentPrice: 100
      };

      const result = TradePredictor.predictSetup(setup);
      expect(result.prediction.confidence).to.be.above(0.1);
      expect(result.prediction.probability).to.be.above(0.5);
    });
  });

  describe('Risk Management', () => {
    it('should adjust position size based on risk parameters', () => {
      const setup = {
        modelType: 'FVG-RD',
        session: 'London',
        qualityScore: 4.4,
        currentPrice: 100,
        accountBalance: 10000,
        maxRiskPercent: 1
      };

      const result = TradePredictor.predictSetup(setup);
      expect(result.prediction).to.have.property('positionSize');
      expect(result.prediction.positionSize).to.be.a('number');
    });
  });
});