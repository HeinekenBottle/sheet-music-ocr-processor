/**
 * UI helper functions for Google Apps Script
 */

const uiUtils = {
  /**
   * Shows an alert dialog with custom message
   * @param {string} title - Dialog title
   * @param {string} message - Alert message
   * @param {ButtonSet} buttons - Optional button set
   */
  showAlert: function(title, message, buttons = null) {
    const ui = SpreadsheetApp.getUi();
    buttons = buttons || ui.ButtonSet.OK;
    ui.alert(title, message, buttons);
  },

  /**
   * Shows a loading indicator in the spreadsheet
   * @param {string} message - Loading message to display
   * @returns {Object} Range object for cleanup
   */
  showLoading: function(message = 'Processing...') {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getRange('A1');
    const originalValue = range.getValue();
    range.setValue(message);
    
    return {
      clear: function() {
        range.setValue(originalValue);
      }
    };
  },

  /**
   * Creates a styled HTML output
   * @param {string} content - HTML content
   * @param {Object} options - Dialog options
   * @returns {HtmlOutput} Configured HTML output
   */
  createStyledHtml: function(content, options = {}) {
    const css = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
      </style>
    `;
    
    const html = HtmlService.createHtmlOutput(css + content)
      .setWidth(options.width || 600)
      .setHeight(options.height || 400);
      
    return html;
  }
};

module.exports = uiUtils;