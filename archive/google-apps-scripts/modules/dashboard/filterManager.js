/**
 * Filter Management Module
 * Handles dashboard filter operations
 */

const FilterManager = {
  /**
   * Handles filter change events
   */
  onFilterChange: function(e) {
    try {
      const range = e.range;
      const sheet = range.getSheet();
      
      // Only process if change is in filter range
      if (sheet.getName() === 'Dashboard' && 
          range.getRow() >= 2 && range.getRow() <= 5 &&
          range.getColumn() === 2) {
        return this.applyCurrentFilters();
      }
      return { success: false, message: 'Not in filter range' };
    } catch (e) {
      Logger.log('Error in filter change: ' + e.toString());
      return { success: false, message: e.toString() };
    }
  },

  /**
   * Applies current filter settings
   */
  applyCurrentFilters: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dashboard = ss.getSheetByName('Dashboard');
      const filters = this._getFilterValues(dashboard);
      
      // Apply filters to data
      const dataRange = dashboard.getRange('DataRange');
      const currentFilter = dataRange.getFilter();
      if (currentFilter) currentFilter.remove();
      
      const filter = dataRange.createFilter();
      const criteria = this._buildFilterCriteria(filters);
      
      Object.entries(criteria).forEach(([col, criterion]) => {
        if (criterion) {
          filter.setColumnFilterCriteria(col, criterion);
        }
      });

      return { 
        success: true, 
        message: 'Filters applied successfully',
        filters: filters
      };
    } catch (e) {
      Logger.log('Error applying filters: ' + e.toString());
      return { success: false, message: e.toString() };
    }
  },

  /**
   * Resets filters to default values
   */
  resetFiltersToDefault: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dashboard = ss.getSheetByName('Dashboard');
      
      // Reset filter values
      dashboard.getRange('FilterRange')
        .clearContent()
        .setValues([
          ['All Models'],
          ['All Sessions'],
          ['All Setups'],
          ['Last 30 Days']
        ]);
      
      this.applyCurrentFilters();
      return { success: true, message: 'Filters reset successfully' };
    } catch (e) {
      Logger.log('Error resetting filters: ' + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  
  /**
   * Sets up filter change triggers
   */
  setupFilterTriggers: function() {
    try {
      // Remove existing triggers
      const triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'onFilterChange') {
          ScriptApp.deleteTrigger(trigger);
        }
      });
      
      // Create new trigger
      ScriptApp.newTrigger('onFilterChange')
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();
        
      return { success: true, message: 'Filter triggers set up successfully' };
    } catch (e) {
      Logger.log('Error setting up triggers: ' + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  
  /**
   * Gets current filter values from dashboard
   */
  _getFilterValues: function(dashboard) {
    const filterRange = dashboard.getRange('B2:B5');
    const values = filterRange.getValues();
    
    return {
      model: values[0][0],
      session: values[1][0],
      setup: values[2][0],
      dateRange: values[3][0]
    };
  },

  /**
   * Builds filter criteria based on current values
   */
  _buildFilterCriteria: function(filters) {
    const criteria = {};
    
    if (filters.model !== 'All Models') {
      criteria[1] = SpreadsheetApp.newFilterCriteria()
        .whenTextEqualTo(filters.model)
        .build();
    }
    
    if (filters.session !== 'All Sessions') {
      criteria[2] = SpreadsheetApp.newFilterCriteria()
        .whenTextEqualTo(filters.session)
        .build();
    }
    
    if (filters.setup !== 'All Setups') {
      criteria[3] = SpreadsheetApp.newFilterCriteria()
        .whenTextEqualTo(filters.setup)
        .build();
    }
    
    return criteria;
  }
};

module.exports = FilterManager;