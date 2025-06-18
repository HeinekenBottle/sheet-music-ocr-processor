const { expect } = require('chai');
const sinon = require('sinon');
const PatternAnalysis = require('../modules/patterns/patternAnalysis.js');

describe('PatternAnalysis', () => {
  let mockSheet;
  let mockSpreadsheet;
  const testData = [
    ['Timestamp', 'Model Type', 'Setup Type', 'Quality Score', 'Result', 'Session'],
    [new Date('2025-04-22'), 'FVG-RD', 'Breakout', 4.5, 'Success', 'London'],
    [new Date('2025-04-22'), 'FVG-RD', 'Pullback', 3.5, 'Failure', 'NY'],
    [new Date('2025-04-22'), 'FVG-RD', 'Breakout', 4.0, 'Success', 'London']
  ];

  beforeEach(() => {
    mockSheet = {
      getLastRow: sinon.stub().returns(testData.length),
      getRange: sinon.stub().returns({
        setValues: sinon.stub().returnsThis(),
        setFontWeight: sinon.stub().returnsThis()
      }),
      getDataRange: sinon.stub().returns({
        getValues: sinon.stub().returns(testData)
      })
    };

    mockSpreadsheet = {
      getSheetByName: sinon.stub().returns(mockSheet),
      insertSheet: sinon.stub().returns(mockSheet)
    };

    global.SpreadsheetApp = {
      getActiveSpreadsheet: sinon.stub().returns(mockSpreadsheet)
    };

    global.Logger = {
      log: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveAnalysis', () => {
    it('should save pattern analysis successfully', () => {
      const analysisData = {
        modelType: 'FVG-RD',
        setupType: 'Breakout',
        qualityScore: 4.5,
        liquidityResistance: 'high',
        priceClarity: 'clear'
      };

      const result = PatternAnalysis.saveAnalysis(analysisData);
      expect(result.success).to.be.true;
      expect(result.message).to.equal('Analysis saved successfully');
    });
  });

  describe('getPredictionHistory', () => {
    it('should retrieve prediction history successfully', () => {
      const history = PatternAnalysis.getPredictionHistory();
      expect(history).to.be.an('array');
      expect(history).to.have.lengthOf(3);
      expect(history[0].modelType).to.equal('FVG-RD');
      expect(history[0].qualityScore).to.equal(4.5);
    });

    it('should handle empty history', () => {
      mockSheet.getDataRange = sinon.stub().returns({
        getValues: sinon.stub().returns([
          ['Timestamp', 'Model Type', 'Setup Type', 'Quality Score', 'Result']
        ])
      });

      const history = PatternAnalysis.getPredictionHistory();
      expect(history).to.be.an('array');
      expect(history).to.have.lengthOf(0);
    });
  });

  describe('getPredictionAccuracy', () => {
    it('should calculate accuracy metrics correctly', () => {
      const accuracy = PatternAnalysis.getPredictionAccuracy();
      expect(accuracy).to.deep.include({
        totalPredictions: 3,
        correctPredictions: 2,
        accuracy: 2 / 3
      });
    });

    it('should handle filtering by model type', () => {
      const accuracy = PatternAnalysis.getPredictionAccuracy('FVG-RD');
      expect(accuracy.totalPredictions).to.equal(3);
    });
  });

  describe('getModelSessionStats', () => {
    it('should calculate session performance metrics', () => {
      const stats = PatternAnalysis.getModelSessionStats();
      expect(stats.totalTrades).to.equal(3);
      expect(stats.sessions.London.trades).to.equal(2);
      expect(stats.sessions.London.successRate).to.equal(1);
      expect(stats.sessions.NY.trades).to.equal(1);
    });

    it('should handle filtering by date range', () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const stats = PatternAnalysis.getModelSessionStats({ startDate: lastWeek });
      expect(stats.totalTrades).to.be.greaterThan(0);
    });

    it('should handle missing session data', () => {
      mockSheet.getDataRange = sinon.stub().returns({
        getValues: sinon.stub().returns([
          ['Timestamp', 'Model Type', 'Setup Type', 'Quality Score', 'Result'],
          [new Date(), 'FVG-RD', 'Breakout', 4.5, 'Success']
        ])
      });

      const stats = PatternAnalysis.getModelSessionStats();
      expect(stats.totalTrades).to.equal(1);
      expect(stats.sessions).to.deep.equal({
        Unknown: {
          trades: 1,
          successRate: 1.0,
          avgQuality: 4.5
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle sheet access errors', () => {
      mockSpreadsheet.getSheetByName.returns(null);
      const result = PatternAnalysis.saveAnalysis({
        modelType: 'FVG-RD',
        setupType: 'Breakout',
        qualityScore: 4.5
      });
      expect(result.message).to.include('Sheet not found');
    });

    it('should validate required analysis data', () => {
      const result = PatternAnalysis.saveAnalysis({});
      expect(result.success).to.be.false;
      expect(result.message).to.include('required fields');
    });
  });
});