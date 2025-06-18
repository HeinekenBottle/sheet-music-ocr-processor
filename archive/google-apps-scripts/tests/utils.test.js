const { expect } = require('chai');
const sinon = require('sinon');
const dateUtils = require('../utils/dateUtils');
const uiUtils = require('../utils/uiUtils');

describe('Utilities', () => {
  describe('dateUtils', () => {
    it('should format dates correctly', () => {
      const date = new Date('2025-04-22T12:00:00');
      const formatted = dateUtils.formatDate(date);
      expect(formatted).to.equal('2025-04-22 12:00:00');
    });

    it('should handle session start times', () => {
      const nySession = dateUtils.getSessionStartTime('NY');
      expect(nySession.getHours()).to.equal(14);
      expect(nySession.getMinutes()).to.equal(30);

      const londonSession = dateUtils.getSessionStartTime('LONDON');
      expect(londonSession.getHours()).to.equal(8);
      expect(londonSession.getMinutes()).to.equal(0);
    });

    it('should calculate date ranges', () => {
      const range = dateUtils.getDateRange('Last7Days');
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      
      expect(range.end).to.be.instanceOf(Date);
      expect(range.start).to.be.instanceOf(Date);
      expect(range.start.getDate()).to.equal(sevenDaysAgo.getDate());
    });
  });

  describe('uiUtils', () => {
    beforeEach(() => {
      // Mock Google Apps Script services
      global.SpreadsheetApp = {
        getUi: () => ({
          alert: sinon.stub(),
          ButtonSet: { OK: 'OK' }
        }),
        getActiveSheet: () => ({
          getRange: () => ({
            getValue: () => 'original',
            setValue: sinon.stub()
          })
        })
      };

      global.HtmlService = {
        createHtmlOutput: (content) => ({
          setWidth: function(width) { 
            this.width = width;
            return this;
          },
          setHeight: function(height) {
            this.height = height;
            return this;
          },
          content: content
        })
      };
    });

    afterEach(() => {
      delete global.SpreadsheetApp;
      delete global.HtmlService;
    });

    it('should create styled HTML output', () => {
      const html = uiUtils.createStyledHtml('<div>Test</div>', { 
        width: 500, 
        height: 400 
      });
      
      expect(html.content).to.include('<style>');
      expect(html.content).to.include('<div>Test</div>');
      expect(html.width).to.equal(500);
      expect(html.height).to.equal(400);
    });

    it('should show loading indicator', () => {
      const loading = uiUtils.showLoading('Please wait...');
      expect(loading).to.have.property('clear');
      expect(loading.clear).to.be.a('function');
    });
  });
});