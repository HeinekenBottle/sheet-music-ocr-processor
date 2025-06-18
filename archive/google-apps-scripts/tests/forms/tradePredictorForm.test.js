const { expect } = require('chai');
const sinon = require('sinon');
const TradePredictorForm = require('../../modules/forms/tradePredictorForm');

describe('TradePredictorForm', () => {
  let mockSheet;
  let mockRange;
  let mockValidation;
  let mockUi;

  beforeEach(() => {
    // Mock validation builder
    mockValidation = {
      requireNumberBetween: sinon.stub().returnsThis(),
      requireNumberGreaterThan: sinon.stub().returnsThis(),
      setHelpText: sinon.stub().returnsThis(),
      build: sinon.stub().returns({})
    };

    // Mock range with chainable methods
    mockRange = {
      setValues: sinon.stub().returnsThis(),
      getValues: sinon.stub().returns([
        ['Model Type:', 'FVG-RD'],
        ['Session:', 'London'],
        ['Quality Score:', '4.5'],
        ['Current Price:', '100'],
        ['Volatility:', 'medium'],
        ['Account Balance:', '10000'],
        ['Max Risk %:', '1']
      ]),
      setDataValidation: sinon.stub().returnsThis(),
      setBackground: sinon.stub().returnsThis(),
      setFontWeight: sinon.stub().returnsThis()
    };

    // Mock sheet
    mockSheet = {
      getRange: sinon.stub().returns(mockRange)
    };

    // Enhanced UI mock
    mockUi = {
      alert: sinon.stub(),
      ButtonSet: { OK: 'OK' }
    };

    // Update SpreadsheetApp mock with UI
    global.SpreadsheetApp = {
      getActiveSheet: sinon.stub().returns(mockSheet),
      newDataValidation: () => mockValidation,
      getUi: () => mockUi
    };

    // Mock Logger
    global.Logger = {
      log: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Form Creation', () => {
    it('should create form with correct layout', () => {
      const form = TradePredictorForm.createForm(mockSheet);
      expect(mockRange.setValues.calledOnce).to.be.true;
      expect(mockRange.setValues.firstCall.args[0]).to.have.length(7);
    });

    it('should set up proper data validation rules', () => {
      TradePredictorForm.createForm(mockSheet);
      expect(mockValidation.requireNumberBetween.called).to.be.true;
      expect(mockValidation.setHelpText.called).to.be.true;
    });

    it('should apply correct formatting', () => {
      TradePredictorForm.createForm(mockSheet);
      expect(mockRange.setBackground.calledWith('#f3f3f3')).to.be.true;
      expect(mockRange.setFontWeight.calledWith('bold')).to.be.true;
    });
  });

  describe('Form Validation', () => {
    it('should validate quality score range', () => {
      mockRange.getValues.returns([
        ['Model Type:', 'FVG-RD'],
        ['Session:', 'London'],
        ['Quality Score:', '6'], // Invalid score
        ['Current Price:', '100'],
        ['Volatility:', 'medium'],
        ['Account Balance:', '10000'],
        ['Max Risk %:', '1']
      ]);

      const result = TradePredictorForm.handleSubmit();
      
      expect(result).to.be.false;
      expect(mockUi.alert.called).to.be.true;
      const alertMessage = mockUi.alert.firstCall.args[1];
      expect(alertMessage).to.include('Quality Score');
    });

    // Add more specific validation tests
    it('should validate numeric inputs', () => {
      mockRange.getValues.returns([
        ['Model Type:', 'FVG-RD'],
        ['Session:', 'London'],
        ['Quality Score:', 'invalid'],
        ['Current Price:', '100'],
        ['Volatility:', 'medium'],
        ['Account Balance:', '10000'],
        ['Max Risk %:', '1']
      ]);

      const result = TradePredictorForm.handleSubmit();
      expect(result).to.be.false;
      expect(mockUi.alert.called).to.be.true;
    });

    it('should validate required fields', () => {
      mockRange.getValues.returns([
        ['Model Type:', ''],
        ['Session:', 'London'],
        ['Quality Score:', '4.5'],
        ['Current Price:', '100'],
        ['Volatility:', 'medium'],
        ['Account Balance:', '10000'],
        ['Max Risk %:', '1']
      ]);

      const result = TradePredictorForm.handleSubmit();
      expect(result).to.be.false;
      expect(mockUi.alert.called).to.be.true;
    });
  });

  // ...rest of test cases...
});