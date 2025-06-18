const { expect } = require('chai');
const sinon = require('sinon');
const ChecklistHandler = require('../modules/patterns/checklistHandler.js');

describe('ChecklistHandler', () => {
  let mockSpreadsheet;
  let mockSheet;
  
  beforeEach(() => {
    // Set up sheet mocks
    mockSheet = {
      getLastRow: sinon.stub().returns(1),
      getRange: sinon.stub().returns({
        setValues: sinon.stub(),
        setFontWeight: sinon.stub().returnsThis(),
        setBackground: sinon.stub().returnsThis()
      }),
      autoResizeColumn: sinon.stub()
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

  describe('processSubmission', () => {
    it('should save checklist data successfully', () => {
      const checklistData = {
        patternQuality: 4.5,
        liquidityResistance: 'High',
        riskReward: 2.5,
        marketContext: 'Strong'
      };

      const result = ChecklistHandler.processSubmission(checklistData);
      expect(result.success).to.be.true;
      expect(result.message).to.equal('Checklist saved successfully');
    });

    it('should create sheet if not exists', () => {
      mockSpreadsheet.getSheetByName.returns(null);
      
      const checklistData = {
        patternQuality: 4
      };

      ChecklistHandler.processSubmission(checklistData);
      expect(mockSpreadsheet.insertSheet.calledWith('Pre-Trade Analysis')).to.be.true;
    });
  });
});