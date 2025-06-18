/**
 * Configuration Module
 * 
 * Centralizes all configuration settings for the trading dashboard application.
 * This allows for easier maintenance and consistent settings across modules.
 */

/**
 * Display configuration for visual elements
 */
const DISPLAY_CONFIG = {
  version: "2.0.0",
  
  // Sheet names
  sheets: {
    dataEntry: "Data Entry Form",
    tradePerformance: "Trade Performance Analysis", // Used for pattern quality
    dashboard: "Dashboard",
    finalizedDashboard: "Finalized Dashboard",
    patternQuality: "Pattern Quality",
    patternAnalysis: "Pattern Analysis History"
  },
  
  // Column indices for critical data (0-based)
  columns: {
    date: 0,        // Column A
    setupType: 3,   // Column D
    result: 14,     // Column O
    pl: 23,         // Column X
    rMultiple: 13,  // Column N
    risk: 22,       // Column W
    positionSize: 20, // Column U
    entryTime: 4,   // Column E
    exitTime: 5,    // Column F
    qualityRating: 15,  // Column P
    session: 2,     // Column C
    modelType: 1    // Column B (Model Type)
  },
  
  // Color scheme
  colors: {
    positive: "#b6d7a8",    // Green for positive values
    negative: "#ea9999",    // Red for negative values
    headerBg: "#4a86e8",    // Blue header background
    headerText: "#ffffff",  // White header text
    alternateBg: "#f3f3f3", // Light gray for alternating rows
    borderColor: "#d9d9d9"  // Light gray border
  },
  
  // Font settings
  fonts: {
    header: {
      size: 14,
      weight: "bold",
      family: "Arial"
    },
    body: {
      size: 11, 
      family: "Arial"
    }
  },
  
  // Number formatting
  formats: {
    currency: "$#,##0.00;($#,##0.00)",
    percentage: "0.00%",
    decimal: "0.00",
    date: "MM/dd/yyyy"
  }
};

/**
 * Layout configuration for dashboard positioning
 */
const LAYOUT_CONFIG = {
  // Left column configuration
  leftColumn: {
    startCol: 1,  // Starting at column A
    width: 6      // 6 columns wide (A-F)
  },
  
  // Right column configuration
  rightColumn: {
    startCol: 8,  // Starting at column H
    width: 6      // 6 columns wide (H-M)
  },
  
  // Section layout information
  sections: {
    // Left column sections
    performanceSummary: { column: 'left', order: 1, approxHeight: 5 },
    modelComparison: { column: 'left', order: 2, approxHeight: 7 },
    topPerformers: { column: 'left', order: 3, approxHeight: 11 },
    patternQuality: { column: 'left', order: 4, approxHeight: 8 },
    
    // Right column sections
    performanceHeatmap: { column: 'right', order: 1, approxHeight: 15 },
    bestTradingDays: { column: 'right', order: 2, approxHeight: 7 },
    tradeDistribution: { column: 'right', order: 3, approxHeight: 5 },
    riskAdjustedMetrics: { column: 'right', order: 4, approxHeight: 7 },
    recentTrades: { column: 'right', order: 5, approxHeight: 6 },
    psychologicalMetrics: { column: 'right', order: 6, approxHeight: 15 },
    correlationMatrix: { column: 'right', order: 7, approxHeight: 10 }
  }
};

/**
 * Date and timezone configuration
 */
const DATE_CONFIG = {
  defaultTimezone: "America/New_York",
  formats: {
    display: "MM/dd/yyyy",
    storage: "yyyy-MM-dd",
    full: "yyyy-MM-dd HH:mm:ss"
  }
};

/**
 * Get full configuration object
 * @return {Object} Complete configuration
 */
function getConfig() {
  return {
    display: DISPLAY_CONFIG,
    layout: LAYOUT_CONFIG,
    date: DATE_CONFIG
  };
}