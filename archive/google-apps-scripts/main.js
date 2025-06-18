/**
 * Import modules
 */
const PatternAnalysis = require('./modules/patterns/patternAnalysis.js');
const ChecklistHandler = require('./modules/patterns/checklistHandler.js');

/**
 * Main entry point for the spreadsheet when it opens.
 * This consolidates all menu creation in one place to avoid conflicts.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trade Tools')
    .addItem('Predict Trade Setup', 'showTradePredictorForm')
    .addToUi();
}

/**
 * Creates the Dashboard Tools menu.
 */
function createDashboardMenu(ui) {
  ui.createMenu('Dashboard Tools')
    .addItem('Process Dashboard Data', 'processAllDashboardData')
    .addSeparator()
    .addItem('Build Standard Dashboard', 'buildFinalizedDashboard')
    .addItem('Build Grid-Based Dashboard', 'buildGridBasedDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('Filter Options')
      .addItem('Apply Current Filters', 'applyCurrentFilters')
      .addItem('Reset Filters to Default', 'resetFiltersToDefault')
      .addItem('Setup Filter Triggers', 'setupFilterTriggers'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Individual Sections')
      .addItem('Update Performance Summary', 'updatePerformanceSummaryDisplay')
      .addItem('Update Model Comparison', 'updateModelComparisonDisplay')
      .addItem('Update Top Performers', 'updateTopPerformersDisplay')
      .addItem('Update Pattern Quality', 'updatePatternQualityDisplay')
      .addItem('Update Recent Trades', 'updateRecentTradesDisplay')
      .addItem('Update Best Trading Days', 'updateBestTradingDaysDisplay')
      .addItem('Update Trade Distributions', 'updateTradeDistributionsDisplay')
      .addItem('Update Risk-Adjusted Metrics', 'updateRiskAdjustedMetricsDisplay')
      .addItem('Update Psychological Metrics', 'updatePsychologicalMetricsDisplay')
      .addItem('Update Performance Heatmap', 'createPerformanceHeatmap')
      .addItem('Update Correlation Matrix', 'createCorrelationMatrix'))
    .addToUi();
}

/**
 * Pattern Analysis Wrapper Functions
 */
function scoreNewPattern(analysisData) {
  const result = PatternAnalysis.saveAnalysis(analysisData);
  if (result.success) {
    showPatternScoreDialog();
  } else {
    SpreadsheetApp.getUi().alert('Error', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function viewQualityHistory() {
  const history = PatternAnalysis.getPredictionHistory();
  // Create and show history display
  const html = HtmlService.createHtmlOutput(createHistoryHtml(history))
    .setWidth(600)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pattern Quality History');
}

function viewQualityAnalytics() {
  const accuracy = PatternAnalysis.getPredictionAccuracy();
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'Pattern Quality Analytics',
    `Total Predictions: ${accuracy.totalPredictions}\n` +
    `Correct Predictions: ${accuracy.correctPredictions}\n` +
    `Accuracy Rate: ${(accuracy.accuracy * 100).toFixed(2)}%`,
    ui.ButtonSet.OK
  );
}

function viewSessionStats() {
  const stats = PatternAnalysis.getModelSessionStats();
  // Create and show stats display
  const html = HtmlService.createHtmlOutput(createStatsHtml(stats))
    .setWidth(700)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Session Performance Stats');
}

/**
 * Update Pattern Quality menu to use wrapper functions
 */
function createPatternQualityMenu(ui) {
  ui.createMenu('Pattern Quality')
    .addItem('Score New Pattern', 'scoreNewPattern')
    .addItem('View Quality History', 'viewQualityHistory')
    .addItem('View Quality Analytics', 'viewQualityAnalytics')
    .addItem('View Session Stats', 'viewSessionStats')
    .addToUi();
}

/**
 * Creates the Trading Charts menu.
 */
function createTradingChartsMenu(ui) {
  ui.createMenu('Trading Charts')
    .addItem('Show Chart Gallery', 'showChartSidebar')
    .addSeparator()
    .addItem('Upload Chart for Selected Row', 'uploadChartForSelectedRow')
    .addToUi();
}

/**
 * Creates the Setup Analysis menu.
 */
function createSetupAnalysisMenu(ui) {
  ui.createMenu('Setup Analysis')
    .addItem('Open Setup Statistical Form', 'openForm')
    .addItem('Open as Dialog', 'openFormAsDialog')
    .addToUi();
}

/**
 * Creates the Trade Tools menu.
 */
function createTradeToolsMenu(ui) {
  ui.createMenu('Trade Tools')
    .addItem('Quick Pre-Trade Checklist ⚡', 'showPreTradeChecklist')
    .addItem('Enhanced Pre-Trade Checklist', 'showEnhancedPreTradeChecklist')
    .addSeparator()
    .addItem('Predict Trade Setup 🔮', 'showTradePredictorForm')
    .addSeparator()
    .addSubMenu(ui.createMenu('Pattern Analysis')
      .addItem('View Prediction History', 'getPredictionHistory')
      .addItem('Update Trade Results', 'updateTradeResults')
      .addItem('Analyze Prediction Accuracy', 'analyzeTradeChecklist'))
    .addToUi();
}

/**
 * Shows the trade predictor form dialog
 */
function showTradePredictorForm() {
  const html = HtmlService.createHtmlOutputFromFile('ui/html/tradePredictorForm')
    .setWidth(500)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Trade Setup Predictor');
}

// This script is designed to manage the finalized dashboard in Google Sheets.
function showPatternScoreDialog() {
  const html = HtmlService.createHtmlOutputFromFile('PatternScoreForm')
      .setWidth(700)
      .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'Score Trading Pattern');
}

/**
 * Shows the pre-trade checklist dialog
 */
function showPreTradeChecklist() {
  const html = HtmlService.createHtmlOutputFromFile('ui/html/preTradeChecklist')
    .setWidth(420)
    .setHeight(480)
    .setTitle('Pre-Trade Checklist');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Pre-Trade Checklist');
}

/**
 * Logs trade check results.
 * From the new Pre-Trade Checklist functionality.
 */
function logTradeCheck(goDecision, checkedItems) {
  try {
    // Log to console for now
    Logger.log(`Trade check result: ${goDecision ? 'GO' : 'NO-GO'}`);
    Logger.log(`Checked items: ${checkedItems.join(', ')}`);
    
    return true;
  } catch(e) {
    Logger.log('Error logging trade check: ' + e.toString());
    return false;
  }
}

function onFilterChange(e) {
  try {
    if (!e) return; // Guard against manual execution
    
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Check if we're in the finalized dashboard and the Apply Filters button was clicked
    if (sheet.getName() === DISPLAY_CONFIG.sheets.finalizedDashboard && 
        range.getRow() === 2 && range.getColumn() === 10) {
      
      Logger.log("Apply Filters button clicked - updating dashboard");
      
      // Get current filter values
      const dateRangeFilter = sheet.getRange('C2').getValue() || 'All Time';
      const setupTypeFilter = sheet.getRange('F2').getValue() || 'All';
      const resultFilter = sheet.getRange('I2').getValue() || 'All';
      
      // Create filter settings object
      const filterSettings = {
        dateRange: dateRangeFilter,
        setupType: setupTypeFilter,
        result: resultFilter
      };
      
      Logger.log("Applied filters: " + JSON.stringify(filterSettings));
      
      // Show loading indicator
      const ui = SpreadsheetApp.getUi();
      ui.alert("Applying filters...", "Please wait while the dashboard updates with your filter selections.", ui.ButtonSet.OK);
      
      // Process all dashboard data with new filters
      processAllDashboardData(filterSettings);
      
      // Rebuild finalized dashboard visuals
      Utilities.sleep(500); // Short delay to ensure data processing is complete
      
      // Update all dashboard displays with new data
      updatePerformanceSummaryDisplay();
      updateModelComparisonDisplay();
      updateBestTradingDaysDisplay();
      updateTopPerformersDisplay();
      updateTradeDistributionsDisplay();
      updatePatternQualityDisplay(); 
      updateRiskAdjustedMetricsDisplay();
      updateRecentTradesDisplay();
      updatePsychologicalMetricsDisplay();
      createPerformanceHeatmap();
      
      // Confirmation message
      ui.alert("Filters Applied", "The dashboard has been updated with your filter selections.", ui.ButtonSet.OK);
    }
  } catch (e) {
    Logger.log("Error applying filters: " + e.toString());
    SpreadsheetApp.getUi().alert("Error applying filters: " + e.message);
  }
}

function applyCurrentFilters() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!finalizedSheet) {
      SpreadsheetApp.getUi().alert("Finalized Dashboard sheet not found");
      return;
    }
    
    // Get current filter values
    const dateRangeFilter = finalizedSheet.getRange('C2').getValue() || 'All Time';
    const setupTypeFilter = finalizedSheet.getRange('F2').getValue() || 'All';
    const resultFilter = finalizedSheet.getRange('I2').getValue() || 'All';
    
    // Create filter settings object
    const filterSettings = {
      dateRange: dateRangeFilter,
      setupType: setupTypeFilter,
      result: resultFilter
    };
    
    Logger.log("Manually applying filters: " + JSON.stringify(filterSettings));
    
    // Show loading indicator
    const ui = SpreadsheetApp.getUi();
    ui.alert("Applying filters...", "Please wait while the dashboard updates with your filter selections.", ui.ButtonSet.OK);
    
    // Process all dashboard data with new filters
    processAllDashboardData(filterSettings);
    
    // Rebuild finalized dashboard visuals
    Utilities.sleep(500); // Short delay to ensure data processing is complete
    
    // Update all dashboard displays with new data
    updatePerformanceSummaryDisplay();
    updateModelComparisonDisplay();
    updateBestTradingDaysDisplay();
    updateTopPerformersDisplay();
    updateTradeDistributionsDisplay();
    updatePatternQualityDisplay(); 
    updateRiskAdjustedMetricsDisplay();
    updateRecentTradesDisplay();
    updatePsychologicalMetricsDisplay();
    createPerformanceHeatmap();
    
    // Confirmation message
    ui.alert("Filters Applied", "The dashboard has been updated with your filter selections.", ui.ButtonSet.OK);
  } catch (e) {
    Logger.log("Error applying filters: " + e.toString());
    SpreadsheetApp.getUi().alert("Error applying filters: " + e.message);
  }
}

function resetFiltersToDefault() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!finalizedSheet) {
      SpreadsheetApp.getUi().alert("Finalized Dashboard sheet not found");
      return;
    }
    
    // Reset filter values
    finalizedSheet.getRange('C2').setValue('All Time');
    finalizedSheet.getRange('F2').setValue('All');
    finalizedSheet.getRange('I2').setValue('All');
    
    // Update the dashboard with reset filters
    applyCurrentFilters();
    
    SpreadsheetApp.getUi().alert("Filters have been reset to default values");
  } catch (e) {
    Logger.log("Error resetting filters: " + e.toString());
    SpreadsheetApp.getUi().alert("Error resetting filters: " + e.toString());
  }
}

function setupFilterTriggers() {
  try {
    // Check if the trigger already exists
    const triggers = ScriptApp.getProjectTriggers();
    let triggerExists = false;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFilterChange') {
        triggerExists = true;
      }
    });
    
    // Only create the trigger if it doesn't exist
    if (!triggerExists) {
      ScriptApp.newTrigger('onFilterChange')
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();
      
      Logger.log("Filter trigger created successfully");
      SpreadsheetApp.getUi().alert("Filter trigger successfully created");
    } else {
      Logger.log("Filter trigger already exists");
      SpreadsheetApp.getUi().alert("Filter trigger is already set up");
    }
  } catch (e) {
    Logger.log("Error setting up filter triggers: " + e.toString());
    SpreadsheetApp.getUi().alert("Error setting up filter triggers: " + e.toString());
  }
}

function testDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dashboardSheet) {
      logMessage("ERROR: Dashboard sheet not found!");
      return;
    }
    
    // Check for the presence of each data section
    const sections = [
      { name: "Performance Summary", key: "PERFORMANCE_SUMMARY_DATA", cell: "A1" },
      { name: "Model Comparison", key: "MODEL_COMPARISON_DATA", cell: "B1" },
      { name: "Top Performers", key: "TOP_PERFORMERS_DATA", cell: "C1" },
      { name: "Quality Rating", key: "QUALITY_RATING_DATA", cell: "D1" },
      { name: "Recent Trades", key: "RECENT_TRADES_DATA", cell: "E1" },
      { name: "Best Trading Days", key: "BEST_TRADING_DAYS_DATA", cell: "F1" },
      { name: "Risk Metrics", key: "RISK_ADJUSTED_METRICS_DATA", cell: "G1" },
      { name: "Psychological Metrics", key: "PSYCHOLOGICAL_METRICS_DATA", cell: "H1" },
      { name: "Trade Distributions", key: "TRADE_DISTRIBUTIONS_DATA", cell: "I1" }
    ];
    
    let allSectionsFound = true;
    
    sections.forEach(section => {
      const headerValue = dashboardSheet.getRange(section.cell).getValue();
      const dataValue = dashboardSheet.getRange(section.cell.replace("1", "2")).getValue();
      
      if (headerValue !== section.key) {
        logMessage(`ERROR: ${section.name} header not found (expected ${section.key}, got ${headerValue})`);
        allSectionsFound = false;
      } else if (!dataValue) {
        logMessage(`ERROR: ${section.name} data is empty`);
        allSectionsFound = false;
      } else {
        // Try to parse the JSON to verify it's valid
        try {
          const parsedData = JSON.parse(dataValue);
          logMessage(`SUCCESS: ${section.name} data verified (${Object.keys(parsedData).length} keys)`);
        } catch (e) {
          logMessage(`ERROR: ${section.name} data is not valid JSON: ${e.toString()}`);
          allSectionsFound = false;
        }
      }
    });
    
    if (allSectionsFound) {
      logMessage("ALL DATA SECTIONS VERIFIED SUCCESSFULLY!");
    } else {
      logMessage("WARNING: Some dashboard data sections are missing or invalid");
    }
    
  } catch (e) {
    logMessage("Error testing dashboard data: " + e.toString());
  }
}

/**
 * Process checklist submission from the UI
 */
function processChecklistSubmission(formData) {
  const result = ChecklistHandler.processSubmission(formData);
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  // If successful, update pattern analysis
  const analysisData = {
    modelType: 'Pre-Trade',
    setupType: formData.marketContext,
    qualityScore: parseFloat(formData.patternQuality),
    liquidityResistance: formData.liquidityResistance,
    priceClarity: 'clear',
    calculatedProbability: '60%',
    probabilityTier: 'Medium'
  };
  
  return PatternAnalysis.saveAnalysis(analysisData);
}

/**
 * Handles trade prediction form submission
 */
function predictTradeSetup(formData) {
  try {
    const TradePredictor = require('./modules/trades/tradePredictor');
    const result = TradePredictor.predictSetup(formData);
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return {
      success: true,
      prediction: result.prediction
    };
  } catch (e) {
    Logger.log('Error predicting trade setup:', e);
    return {
      success: false,
      message: e.message
    };
  }
}
