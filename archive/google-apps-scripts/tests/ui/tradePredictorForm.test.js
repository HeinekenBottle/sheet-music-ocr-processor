const { expect } = require('chai');
const sinon = require('sinon');
const TradePredictorFormController = require('../../ui/js/tradePredictorForm');

describe('TradePredictorFormController', () => {
  let controller;
  let mockElements;
  let mockForm;

  beforeEach(() => {
    // Setup mock form elements
    mockElements = {
      modelType: { 
        value: '',
        addEventListener: sinon.stub(),
        classList: { toggle: sinon.stub() }
      },
      qualityScore: { 
        value: '',
        addEventListener: sinon.stub(),
        classList: { toggle: sinon.stub() }
      },
      currentPrice: { 
        value: '',
        addEventListener: sinon.stub(),
        classList: { toggle: sinon.stub() }
      },
      volatility: {
        value: '',
        addEventListener: sinon.stub(),
        classList: { toggle: sinon.stub() }
      }
    };

    // Setup mock form
    mockForm = {
      addEventListener: sinon.stub(),
      querySelector: sinon.stub().returns({
        disabled: false
      })
    };

    // Setup global document mock
    global.document = {
      getElementById: (id) => {
        if (id === 'tradePredictorForm') return mockForm;
        return mockElements[id];
      }
    };

    // Setup global Google Apps Script mock
    global.google = {
      script: {
        run: {
          withSuccessHandler: sinon.stub().returnsThis(),
          withFailureHandler: sinon.stub().returnsThis(),
          predictTradeSetup: sinon.stub().resolves({})
        }
      }
    };

    controller = new TradePredictorFormController('tradePredictorForm');
  });

  afterEach(() => {
    sinon.restore();
    delete global.document;
  });

  describe('Form Initialization', () => {
    it('should setup event listeners', () => {
      expect(mockForm.addEventListener.calledWith('submit')).to.be.true;
      expect(mockElements.modelType.addEventListener.calledWith('input')).to.be.true;
      expect(mockElements.qualityScore.addEventListener.calledWith('input')).to.be.true;
    });
  });

  describe('Validation', () => {
    it('should validate quality scores correctly', () => {
      expect(controller.validators.qualityScore('3')).to.be.true;
      expect(controller.validators.qualityScore('6')).to.be.false;
      expect(controller.validators.qualityScore('-1')).to.be.false;
      expect(controller.validators.qualityScore('abc')).to.be.false;
    });

    it('should validate prices correctly', () => {
      expect(controller.validators.currentPrice('100')).to.be.true;
      expect(controller.validators.currentPrice('0')).to.be.false;
      expect(controller.validators.currentPrice('-50')).to.be.false;
      expect(controller.validators.currentPrice('abc')).to.be.false;
    });

    it('should validate model type correctly', () => {
      expect(controller.validators.modelType('FVG-RD')).to.be.true;
      expect(controller.validators.modelType('')).to.be.false;
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with invalid data', async () => {
      const event = { preventDefault: sinon.stub() };
      await controller.handleSubmit(event);
      
      expect(event.preventDefault.called).to.be.true;
      expect(google.script.run.predictTradeSetup.called).to.be.false;
    });

    it('should submit valid form data', async () => {
      mockElements.modelType.value = 'FVG-RD';
      mockElements.qualityScore.value = '4.5';
      mockElements.currentPrice.value = '100';

      const event = { preventDefault: sinon.stub() };
      await controller.handleSubmit(event);
      
      expect(event.preventDefault.called).to.be.true;
      expect(google.script.run.predictTradeSetup.called).to.be.true;
    });
  });
});