/**
 * Trade Predictor Form Module
 * Handles setup input and validation
 */

const { formatDate } = require('../../utils/dateUtils');
const { showAlert } = require('../../utils/uiUtils');
const TradePredictor = require('../trades/tradePredictor');

const TradePredictorForm = {
  /**
   * Creates the setup form in the specified sheet
   */
  createForm: function(sheet) {
    const form = sheet.getRange('B2:C8');
    
    // Apply form styling with error handling
    try {
      form.setBackground('#f3f3f3');
      form.setFontWeight('bold');
      
      form.setValues([
        ['Model Type:', '=DROPDOWN(ModelTypes)'],
        ['Session:', '=DROPDOWN(Sessions)'],
        ['Quality Score:', ''],
        ['Current Price:', ''],
        ['Volatility:', '=DROPDOWN({"low","medium","high"})'],
        ['Account Balance:', ''],
        ['Max Risk %:', '1']
      ]);

      // Add input validation
      const qualityCell = sheet.getRange('C4');
      const priceCell = sheet.getRange('C5');
      const balanceCell = sheet.getRange('C7');
      const riskCell = sheet.getRange('C8');

      // Quality score validation
      qualityCell.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberBetween(0, 5)
          .setHelpText('Enter a score between 0-5')
          .build()
      );

      // Price validation
      priceCell.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberGreaterThan(0)
          .setHelpText('Enter a valid price')
          .build()
      );

      // Balance validation
      balanceCell.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberGreaterThan(0)
          .setHelpText('Enter account balance')
          .build()
      );

      // Risk validation
      riskCell.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberBetween(0.1, 5)
          .setHelpText('Enter risk percentage (0.1-5%)')
          .build()
      );

      return form;
    } catch (e) {
      Logger.log('Form creation error:', e);
      throw new Error('Failed to create form: ' + e.message);
    }
  },

  /**
   * Handles form submission with enhanced validation
   */
  handleSubmit: function() {
    try {
      const sheet = SpreadsheetApp.getActiveSheet();
      const setupData = this._getFormData(sheet);

      const validationResult = this._validateFormData(setupData);
      if (!validationResult.isValid) {
        showAlert('Validation Error', validationResult.message);
        return false;
      }

      const result = TradePredictor.predictSetup(setupData);
      if (!result.success) {
        showAlert('Prediction Error', result.message);
        return false;
      }

      this._displayResults(sheet, result.prediction);
      return true;

    } catch (e) {
      Logger.log('Form submission error:', e);
      showAlert('Error', 'Failed to process form: ' + e.message);
      return false;
    }
  },

  /**
   * Gets form data with type conversion
   * @private
   */
  _getFormData: function(sheet) {
    try {
      const values = sheet.getRange('B2:C8').getValues();
      return {
        modelType: String(values[0][1] || ''),
        session: String(values[1][1] || ''),
        qualityScore: Number(values[2][1] || 0),
        currentPrice: Number(values[3][1] || 0),
        volatility: String(values[4][1] || 'medium'),
        accountBalance: Number(values[5][1] || 0),
        maxRiskPercent: Number(values[6][1] || 1),
        timestamp: new Date()
      };
    } catch (e) {
      throw new Error('Failed to get form data: ' + e.message);
    }
  },

  /**
   * Validates form input with detailed feedback
   * @private
   */
  _validateFormData: function(data) {
    const validations = [
      {
        condition: Boolean(data.modelType),
        message: 'Model Type is required'
      },
      {
        condition: Boolean(data.session),
        message: 'Session is required'
      },
      {
        condition: data.qualityScore >= 0 && data.qualityScore <= 5,
        message: 'Quality Score must be between 0 and 5'
      },
      {
        condition: data.currentPrice > 0,
        message: 'Current Price must be greater than 0'
      },
      {
        condition: data.accountBalance > 0,
        message: 'Account Balance must be greater than 0'
      },
      {
        condition: data.maxRiskPercent > 0 && data.maxRiskPercent <= 5,
        message: 'Risk % must be between 0 and 5'
      }
    ];

    const failed = validations.find(v => !v.condition);
    return {
      isValid: !failed,
      message: failed ? failed.message : ''
    };
  },

  /**
   * Displays prediction results
   * @private
   */
  _displayResults: function(sheet, prediction) {
    const resultsRange = sheet.getRange('E2:F8');
    resultsRange.setValues([
      ['Probability:', `${(prediction.probability * 100).toFixed(1)}%`],
      ['Confidence:', `${(prediction.confidence * 100).toFixed(1)}%`],
      ['Entry Price:', prediction.recommendedEntry],
      ['Stop Loss:', prediction.suggestedStopLoss],
      ['Position Size:', prediction.positionSize || 'N/A'],
      ['Time:', prediction.timestamp],
      ['Status:', 'Analysis Complete']
    ]);
  }
};

module.exports = TradePredictorForm;