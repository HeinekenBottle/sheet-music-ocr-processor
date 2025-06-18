const { expect } = require('chai');
const sinon = require('sinon');
const FilterManager = require('../modules/dashboard/filterManager.js');

describe('FilterManager', () => {
  let mockSpreadsheet;
  let mockDashboard;
  let mockRange;

  beforeEach(() => {
    // Set up test mocks
    mockRange = {
      getValues: sinon.stub().returns([
        ['All Models'],
        ['All Sessions'],
        ['All Setups'],
        ['Last 30 Days']
      ]),
      clearContent: sinon.stub().returnsThis(),
      setValues: sinon.stub().returnsThis(),
      getFilter: sinon.stub().returns({ remove: sinon.stub() }),
      createFilter: sinon.stub().returns({
        setColumnFilterCriteria: sinon.stub()
      })
    };

    mockDashboard = {
      getRange: sinon.stub().returns(mockRange),
      getName: sinon.stub().returns('Dashboard')
    };

    mockSpreadsheet = {
      getSheetByName: sinon.stub().returns(mockDashboard)
    };

    // Mock Google Apps Script globals
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

  describe('applyCurrentFilters', () => {
    it('should apply filters successfully', () => {
      const result = FilterManager.applyCurrentFilters();
      expect(result.success).to.be.true;
      expect(result.message).to.equal('Filters applied successfully');
    });

    it('should handle errors gracefully', () => {
      mockDashboard.getRange.throws(new Error('Test error'));
      const result = FilterManager.applyCurrentFilters();
      expect(result.success).to.be.false;
      expect(result.message).to.include('Test error');
    });
  });
});