// Visual section formatters
function formatStandardTable(sheet, headerRow, startColumn, rows, columns, title, headerLabels) {
  // Create section header with blue background and white text
  sheet.getRange(headerRow, startColumn, 1, columns)
    .merge()
    .setValue(title)
    .setFontWeight('bold')
    .setBackground('#4285f4') // Bright blue header
    .setFontColor('white')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, false, false);
  
  // Create table headers with light gray background
  const tableHeaderRow = headerRow + 1;
  if (headerLabels && headerLabels.length > 0) {
    sheet.getRange(tableHeaderRow, startColumn, 1, headerLabels.length)
      .setValues([headerLabels])
      .setFontWeight('bold')
      .setBackground('#e6e6e6') // Light gray for headers
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);
  }
  
  // Pre-format the data rows with borders
  sheet.getRange(tableHeaderRow + 1, startColumn, rows, columns)
    .setBorder(true, true, true, true, true, true);
  
  return tableHeaderRow;
}
function formatMetricCell(cell, value, formatType) {
  if (formatType === 'percentage') {
    cell.setNumberFormat('0.00%');
    // Color coding for percentages (green for high, red for low)
    if (value > 0.6) {
      cell.setBackground(DISPLAY_CONFIG.colors.positive);
    } else if (value < 0.4) {
      cell.setBackground(DISPLAY_CONFIG.colors.negative);
    }
  } else if (formatType === 'currency') {
    cell.setNumberFormat('$#,##0.00');
    // Color coding for currency (green for positive, red for negative)
    if (value > 0) {
      cell.setBackground(DISPLAY_CONFIG.colors.positive);
    } else if (value < 0) {
      cell.setBackground(DISPLAY_CONFIG.colors.negative);
    }
  } else if (formatType === 'decimal') {
    cell.setNumberFormat('0.00');
  }
  
  cell.setHorizontalAlignment('center');
}
function findSectionRow(sheet, sectionName) {
  if (!sheet || !sectionName) return 0;
  
  const lastRow = Math.min(sheet.getLastRow(), 100); // Limit search for performance
  if (lastRow === 0) return 0;
  
  const searchRange = sheet.getRange(1, 1, lastRow, 10); // Search first 10 columns
  const values = searchRange.getValues();
  const cleanSearch = sectionName.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
  
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      if (!values[i][j]) continue;
      
      const cellText = String(values[i][j]).toLowerCase().replace(/[^a-z0-9\s]/gi, '');
      if (cellText.includes(cleanSearch)) {
        Logger.log(`Found section "${sectionName}" at row ${i+1}, column ${j+1}`);
        return i + 1;
      }
    }
  }
  Logger.log(`Section "${sectionName}" not found`);
  return 0;
}
function findSectionStartColumn(sheet, sectionName) {
  const sectionRow = findSectionRow(sheet, sectionName);
  if (!sectionRow) return 0;
  
  // Search for the first column where this section appears
  const lastColumn = Math.min(sheet.getMaxColumns(), 15); // Limit search to 15 columns
  const searchRange = sheet.getRange(sectionRow, 1, 1, lastColumn);
  const values = searchRange.getValues()[0];
  
  for (let col = 0; col < values.length; col++) {
    if (values[col] === sectionName || 
        (values[col] && values[col].toString().includes(sectionName))) {
      Logger.log(`Found section "${sectionName}" starting at column ${col+1}`);
      return col + 1;
    }
  }
  
  // Look for merged cells that might contain the section header
  const mergedRanges = sheet.getRange(sectionRow, 1, 1, lastColumn).getMergedRanges();
  for (let i = 0; i < mergedRanges.length; i++) {
    const range = mergedRanges[i];
    if (range.getRow() === sectionRow) {
      const value = sheet.getRange(range.getRow(), range.getColumn()).getValue();
      if (value === sectionName || 
          (value && value.toString().includes(sectionName))) {
        Logger.log(`Found section "${sectionName}" starting at column ${range.getColumn()}`);
        return range.getColumn();
      }
    }
  }
  
  Logger.log(`Could not determine start column for "${sectionName}"`);
  return 0;
}
function findSectionEndColumn(sheet, sectionName) {
  const sectionRow = findSectionRow(sheet, sectionName);
  if (!sectionRow) return 0;
  
  // Check for merged ranges first
  const headerRange = sheet.getRange(sectionRow, 1, 1, sheet.getMaxColumns());
  const mergedRanges = headerRange.getMergedRanges();
  
  for (let i = 0; i < mergedRanges.length; i++) {
    const range = mergedRanges[i];
    if (range.getRow() === sectionRow) {
      Logger.log(`Found merged range for "${sectionName}" ending at column ${range.getLastColumn()}`);
      return range.getLastColumn();
    }
  }
  
  // If no merged range, find last non-empty cell
  const values = headerRange.getValues()[0];
  for (let col = values.length - 1; col >= 0; col--) {
    if (values[col]) {
      Logger.log(`Found end column for "${sectionName}" at column ${col+1}`);
      return col + 1;
    }
  }
  
  Logger.log(`Could not determine end column for "${sectionName}"`);
  return 0;
}

// Core rendering function (new)
function renderDashboardSection(sheet, config, dataGetter) {
  try {
    // Get the data
    const data = dataGetter();
    if (!data) return 0;
    
    // Create the section header
    const tableHeaderRow = formatStandardTable(
      sheet,
      config.startRow,
      config.startCol,
      config.rows,
      config.cols,
      config.title,
      config.headers
    );
    
    // Render the section content
    const sectionHeight = config.renderer(sheet, tableHeaderRow, data, config);
    return sectionHeight;
  } catch (e) {
    logMessage(`Error rendering ${config.title}: ${e.toString()}`);
    return 0;
  }
}
function renderSection(sectionName, startRow, startCol, sheet) {
  try {
    let sectionHeight = 0;
    
    // Call appropriate function for each section
    switch(sectionName) {
      case 'performanceSummary':
        sectionHeight = updatePerformanceSummaryDisplay(startRow, startCol);
        break;
      
      case 'modelComparison':
        sectionHeight = updateModelComparisonDisplay(startRow, startCol);
        break;
      
      case 'topPerformers':
        sectionHeight = updateTopPerformersDisplay(startRow, startCol);
        break;
        
      case 'patternQuality':
        sectionHeight = updatePatternQualityDisplay(startRow, startCol);
        break;
        
      case 'bestTradingDays':
        sectionHeight = updateBestTradingDaysDisplay(startRow, startCol);
        break;
        
      case 'tradeDistribution':
        sectionHeight = updateTradeDistributionsDisplay(startRow, startCol);
        break;
        
      case 'riskAdjustedMetrics':
        sectionHeight = updateRiskAdjustedMetricsDisplay(startRow, startCol);
        break;
        
      case 'recentTrades':
        sectionHeight = updateRecentTradesDisplay(startRow, startCol);
        break;
        
      case 'psychologicalMetrics':
        sectionHeight = updatePsychologicalMetricsDisplay(startRow, startCol);
        break;
        
      case 'performanceHeatmap':
        sectionHeight = createPerformanceHeatmap(startRow, startCol);
        break;
        
      case 'correlationMatrix':
        sectionHeight = createCorrelationMatrix(startRow, startCol);
        break;
        
      default:
        logMessage(`Unknown section: ${sectionName}`);
        sectionHeight = 0;
    }
    
    logMessage(`Rendered section ${sectionName} at row ${startRow}, col ${startCol} with height ${sectionHeight}`);
    return sectionHeight;
  } catch (e) {
    logMessage(`Error rendering section ${sectionName}: ${e.toString()}`);
    return 0; // Return 0 height on error
  }
}

// Individual section renderers (with position parameters)
function updatePerformanceSummaryDisplay(startRow = 3, startColumn = 1) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('A2').getValue();
    if (!rawData) {
      Logger.log("Performance summary data not found");
      return 0;
    }
    
    const summaryData = JSON.parse(rawData);
    
    // Position for Performance Summary - now using parameters
    const headerRow = startRow;
    const columns = 4;
    
    // Make the rows much taller for bigger impact
    finalizedSheet.setRowHeight(headerRow, 30);     // Taller header
    finalizedSheet.setRowHeight(headerRow + 1, 28); // Taller label row
    finalizedSheet.setRowHeight(headerRow + 2, 40); // Much taller data row for emphasis
    
    // Make columns wider
    for (let i = 0; i < columns; i++) {
      finalizedSheet.setColumnWidth(startColumn + i, 140); // Wider columns
    }
    
    // Clear any existing content in this section area
    finalizedSheet.getRange(headerRow, startColumn, 3, columns).clear();
    
    // Apply standardized table formatting
    finalizedSheet.getRange(headerRow, startColumn, 1, columns)
      .merge()
      .setValue('PERFORMANCE SUMMARY')
      .setFontWeight('bold')
      .setBackground('#4285f4') // Blue header
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setFontSize(14); // Larger font
    
    // Add a border to the header
    finalizedSheet.getRange(headerRow, startColumn, 1, columns)
      .setBorder(true, true, true, true, null, null, '#3366cc', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    
    // Create header row for metrics with icons
    const metricsRow = headerRow + 1;
    finalizedSheet.getRange(metricsRow, startColumn).setValue('📊 Total Trades');
    finalizedSheet.getRange(metricsRow, startColumn + 1).setValue('🎯 Win Rate');
    finalizedSheet.getRange(metricsRow, startColumn + 2).setValue('💰 Total P/L');
    finalizedSheet.getRange(metricsRow, startColumn + 3).setValue('⚖️ Avg R-Multiple');
    
    // Format the header row - removing black borders
    finalizedSheet.getRange(metricsRow, startColumn, 1, columns)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#e6e6e6') // Light gray for headers
      .setFontSize(12)
      .setBorder(null, null, null, null, null, null); // Remove all borders
    
    // Add a subtle bottom border only
    finalizedSheet.getRange(metricsRow, startColumn, 1, columns)
      .setBorder(false, false, true, false, false, false, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
    
    // Define gradients for data cells
    const lightBlue = '#cfe2f3';
    const darkBlue = '#9fc5e8';
    const lightGreen = '#d9ead3';
    const darkGreen = '#b6d7a8';
    const lightOrange = '#f9cb9c';
    const darkOrange = '#f6b26b';
    const lightYellow = '#fff2cc';
    const darkYellow = '#ffe599';
    
    // Add values row with colored boxes and matching borders
    const valuesRow = metricsRow + 1;
    
    // Total Trades with blue background and matching border
    finalizedSheet.getRange(valuesRow, startColumn)
      .setValue(summaryData.totalTrades)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle') // Center vertically in the larger cell
      .setBackground(lightBlue) // Light blue background
      .setBorder(true, true, true, true, null, null, darkBlue, SpreadsheetApp.BorderStyle.SOLID)
      .setFontSize(18) // Much larger font for data values
      .setFontWeight('bold');
    
    // Win Rate with green background and matching border
    finalizedSheet.getRange(valuesRow, startColumn + 1)
      .setValue(summaryData.winRate)
      .setNumberFormat('0.00%')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle') // Center vertically in the larger cell
      .setBackground(lightGreen) // Light green background
      .setBorder(true, true, true, true, null, null, darkGreen, SpreadsheetApp.BorderStyle.SOLID)
      .setFontSize(18) // Much larger font for data values
      .setFontWeight('bold');
    
    // Total P/L with orange background and matching border
    finalizedSheet.getRange(valuesRow, startColumn + 2)
      .setValue(summaryData.totalPL)
      .setNumberFormat('$#,##0.00')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle') // Center vertically in the larger cell
      .setBackground(lightOrange) // Orange background
      .setBorder(true, true, true, true, null, null, darkOrange, SpreadsheetApp.BorderStyle.SOLID)
      .setFontSize(18) // Much larger font for data values
      .setFontWeight('bold');
    
    // Avg R-Multiple with yellow background and matching border
    finalizedSheet.getRange(valuesRow, startColumn + 3)
      .setValue(summaryData.avgRMultiple)
      .setNumberFormat('0.00')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle') // Center vertically in the larger cell
      .setBackground(lightYellow) // Light yellow background
      .setBorder(true, true, true, true, null, null, darkYellow, SpreadsheetApp.BorderStyle.SOLID)
      .setFontSize(18) // Much larger font for data values
      .setFontWeight('bold');
    
    Logger.log(`Performance summary display updated at row ${startRow}, column ${startColumn}`);
    
    // Return the height of this section (3 rows used)
    return 3;
  } catch (e) {
    Logger.log("Error updating performance summary display: " + e.toString());
    return 0;
  }
}
function updateModelComparisonDisplay(startRow = 9, startColumn = 1) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) return 0;
    
    // Get raw model comparison data
    const rawData = dataSheet.getRange('B2').getValue();
    if (!rawData) return 0;
    const comparisonData = JSON.parse(rawData);
    
    Logger.log(`Positioning Model Comparison display at row ${startRow}, column ${startColumn}`);
    
    const columns = 4;
    
    // Build table header (includes 4 metrics + best session row)
    const tableHeaderRow = formatStandardTable(
      finalizedSheet,
      startRow,
      startColumn,
      5,
      columns,
      'MODEL COMPARISON',
      ['Metric', 'RD‑Cont', 'FVG‑RD', 'Difference',]
    );
    
    // Define metrics
    const metrics = [
      { name: 'Win Rate',   rdCont: comparisonData.models.rdCont.winRate,   fvgRd: comparisonData.models.fvgRd.winRate,   diff: comparisonData.differences.winRate,   format: 'percentage', diffFormat: 'percentage' },
      { name: 'Avg P/L',    rdCont: comparisonData.models.rdCont.avgPL,      fvgRd: comparisonData.models.fvgRd.avgPL,      diff: comparisonData.differences.avgPL,      format: 'currency',   diffFormat: 'currency' },
      { name: 'Avg Risk',   rdCont: comparisonData.models.rdCont.avgR,       fvgRd: comparisonData.models.fvgRd.avgR,       diff: comparisonData.differences.avgR,       format: 'decimal',    diffFormat: 'decimal' },
      { name: 'Total Trades', rdCont: comparisonData.models.rdCont.totalTrades, fvgRd: comparisonData.models.fvgRd.totalTrades, diff: comparisonData.differences.totalTrades, format: 'decimal', diffFormat: 'decimal' }
    ];
    
    // Populate metric rows
    metrics.forEach((metric, i) => {
      const row = tableHeaderRow + 1 + i;
      finalizedSheet.getRange(row, startColumn)
        .setValue(metric.name)
        .setHorizontalAlignment('left');
      
      // RD‑Cont
      const rdCell = finalizedSheet.getRange(row, startColumn + 1);
      rdCell.setValue(metric.rdCont);
      formatMetricCell(rdCell, metric.rdCont, metric.format);
      
      // FVG‑RD
      const fvCell = finalizedSheet.getRange(row, startColumn + 2);
      fvCell.setValue(metric.fvgRd);
      formatMetricCell(fvCell, metric.fvgRd, metric.format);
      
      // Difference
      const diffCell = finalizedSheet.getRange(row, startColumn + 3);
      diffCell.setValue(metric.diff);
      // Use the appropriate diffFormat for number formatting
      switch (metric.diffFormat) {
        case 'percentage':
          diffCell.setNumberFormat('+0.00%;-0.00%');
          break;
        case 'currency':
          diffCell.setNumberFormat('+$#,##0.00;-$#,##0.00');
          break;
        default:
          diffCell.setNumberFormat('+0.00;-0.00');
      }
      // Color positive/negative differences
      if (metric.diff > 0) {
        diffCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (metric.diff < 0) {
        diffCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
    });
    
    // Add Best Session row below metrics
    const bestRow = tableHeaderRow + 1 + metrics.length;
    finalizedSheet.getRange(bestRow, startColumn)
      .setValue('Best Session')
      .setHorizontalAlignment('left')
      .setFontWeight('bold');
    
    // RD‑Cont best session text
    finalizedSheet.getRange(bestRow, startColumn + 1)
      .setValue(comparisonData.models.rdCont.bestSession)
      .setHorizontalAlignment('left')
      .setWrap(true);
    
    // FVG‑RD best session text
    finalizedSheet.getRange(bestRow, startColumn + 2)
      .setValue(comparisonData.models.fvgRd.bestSession)
      .setHorizontalAlignment('left')
      .setWrap(true);
    
    // Format best session row
    finalizedSheet.getRange(bestRow, startColumn, 1, columns)
      .setBackground('#f0f0f0')
      .setBorder(true, true, true, true, null, null);
    finalizedSheet.setRowHeight(bestRow, 40);
    
    Logger.log("Model comparison display updated.");
    return 7; // header + table header + 4 metrics + best session
  } catch (e) {
    Logger.log("Error updating model comparison display: " + e.toString());
    return 0;
  }
}

function updateTopPerformersDisplay(startRow = 15, startColumn = 1) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('C2').getValue();
    if (!rawData) {
      Logger.log("Top performers data not found");
      return 0;
    }
    
    const performersData = JSON.parse(rawData);
    
    Logger.log(`Positioning Top Performers at row ${startRow}, column ${startColumn}`);
    
    // Calculate number of rows needed (based on data, with maximum of 10)
    const numRows = Math.min(performersData.length, 10);
    
    if (numRows === 0) {
      Logger.log("No top performers data to display");
      return 0;
    }
    
    // Apply standardized table formatting
    const tableHeaderRow = formatStandardTable(
      finalizedSheet,
      startRow,
      startColumn,
      numRows,
      5, // Number of columns
      'Top Performing Setup Types',
      ['Setup Type', 'Win Rate', 'Total P/L', 'Total Trades', 'Performance']
    );
    
    // Sort performers by win rate first, then by total P/L
    const sortedPerformers = performersData
      .sort((a, b) => {
        if (Math.abs(a.winRate - b.winRate) < 0.01) {
          return b.totalPL - a.totalPL;
        }
        return b.winRate - a.winRate;
      })
      .slice(0, numRows);
    
    // Display top performers
    sortedPerformers.forEach((performer, i) => {
      const row = tableHeaderRow + 1 + i;
      
      // Setup Type
      finalizedSheet.getRange(row, startColumn)
        .setValue(performer.setupType)
        .setHorizontalAlignment('left');
      
      // Win Rate
      const winRateCell = finalizedSheet.getRange(row, startColumn + 1);
      winRateCell.setValue(performer.winRate)
        .setNumberFormat('0.00%')
        .setHorizontalAlignment('center');
        
      if (performer.winRate > 0.6) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (performer.winRate < 0.4) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Total P/L
      const plCell = finalizedSheet.getRange(row, startColumn + 2);
      plCell.setValue(performer.totalPL)
        .setNumberFormat('$#,##0.00')
        .setHorizontalAlignment('center');
        
      if (performer.totalPL > 0) {
        plCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (performer.totalPL < 0) {
        plCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Total Trades
      finalizedSheet.getRange(row, startColumn + 3)
        .setValue(performer.totalTrades)
        .setHorizontalAlignment('center');
      
      // Performance rating based on win rate and trades
      let rating;
      if (performer.winRate > 0.7 && performer.totalTrades >= 5) {
        rating = 'Excellent';
      } else if (performer.winRate > 0.6 && performer.totalTrades >= 3) {
        rating = 'Very Good';
      } else if (performer.winRate > 0.5) {
        rating = 'Good';
      } else if (performer.winRate > 0.4) {
        rating = 'Fair';
      } else {
        rating = 'Poor';
      }
      
      finalizedSheet.getRange(row, startColumn + 4)
        .setValue(rating)
        .setHorizontalAlignment('center');
    });
    
    // Add alternating row colors for readability
    for (let i = 0; i < numRows; i++) {
      if (i % 2 === 1) {
        finalizedSheet.getRange(tableHeaderRow + 1 + i, startColumn, 1, 5)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    }
    
    Logger.log("Top performers display updated");
    
    // Return total height: header + table header + data rows
    return 2 + numRows; // 1 (header) + 1 (table header) + numRows (data)
  } catch (e) {
    Logger.log("Error updating top performers display: " + e.toString());
    return 0;
  }
}
function updatePatternQualityDisplay(startRow = 30, startColumn = 1) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      logMessage("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('D2').getValue();
    if (!rawData) {
      logMessage("Pattern quality data not found");
      return 0;
    }
    
    // Parse the new data structure
    let qualityData;
    try {
      const parsedData = JSON.parse(rawData);
      qualityData = parsedData.data || { overallAvg: 0, breakdown: [] };
    } catch (e) {
      logMessage(`Error parsing pattern quality data: ${e.toString()}`);
      return 0;
    }
    
    Logger.log(`Positioning Pattern Quality at row ${startRow}, column ${startColumn}`);
    
    // Calculate number of rows needed based on breakdown array
    const numRows = Math.min(qualityData.breakdown.length, 8); // Limit to 8 setup types
    
    if (numRows === 0 && qualityData.overallAvg === 0) {
      logMessage("No pattern quality data to display");
      return 0;
    }
    
    // Apply standardized table formatting
    const tableHeaderRow = formatStandardTable(
      finalizedSheet,
      startRow,
      startColumn,
      numRows + 1, // Add one for the overall average row
      5, // Number of columns
      'Pattern Quality Ratings',
      ['Setup Type', 'Avg Rating', 'Count', 'Quality Assessment', 'Action']
    );
    
    // First add the overall average row
    const overallRow = tableHeaderRow + 1;
    finalizedSheet.getRange(overallRow, startColumn).setValue("OVERALL AVERAGE");
    finalizedSheet.getRange(overallRow, startColumn).setFontWeight("bold");
    
    finalizedSheet.getRange(overallRow, startColumn + 1)
      .setValue(qualityData.overallAvg)
      .setNumberFormat("0.00")
      .setHorizontalAlignment('center');
    
    // Set total count
    const totalCount = qualityData.breakdown.reduce((sum, item) => sum + item.count, 0);
    finalizedSheet.getRange(overallRow, startColumn + 2)
      .setValue(totalCount)
      .setHorizontalAlignment('center');
    
    // Overall quality assessment
    let overallAssessment;
    if (qualityData.overallAvg >= 4.0) {
      overallAssessment = "Excellent";
    } else if (qualityData.overallAvg >= 3.5) {
      overallAssessment = "Very Good";
    } else if (qualityData.overallAvg >= 3.0) {
      overallAssessment = "Good";
    } else if (qualityData.overallAvg >= 2.5) {
      overallAssessment = "Fair";
    } else {
      overallAssessment = "Needs Improvement";
    }
    
    finalizedSheet.getRange(overallRow, startColumn + 3)
      .setValue(overallAssessment)
      .setHorizontalAlignment('center');
    
    // Highlight the overall row
    finalizedSheet.getRange(overallRow, startColumn, 1, 5)
      .setBackground("#e6e6e6");
    
    // Display breakdown by setup type
    if (qualityData.breakdown && qualityData.breakdown.length > 0) {
      // Sort by average rating descending
      const sortedBreakdown = qualityData.breakdown
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, numRows);
      
      sortedBreakdown.forEach((item, i) => {
        const row = tableHeaderRow + 2 + i; // +2 because we have overall row first
        
        // Setup Type (truncate if too long)
        const setupType = item.setupType === "Unknown" ? "Unspecified Setup" : item.setupType;
        const displaySetup = setupType.length > 40 ? setupType.substring(0, 37) + "..." : setupType;
        finalizedSheet.getRange(row, startColumn)
          .setValue(displaySetup)
          .setHorizontalAlignment('left');
        
        // Average Rating
        const ratingCell = finalizedSheet.getRange(row, startColumn + 1);
        ratingCell.setValue(item.avgRating)
          .setNumberFormat("0.00")
          .setHorizontalAlignment('center');
        
        // Color by rating
        if (item.avgRating >= 4.0) {
          ratingCell.setBackground(DISPLAY_CONFIG.colors.positive);
        } else if (item.avgRating < 3.0) {
          ratingCell.setBackground(DISPLAY_CONFIG.colors.negative);
        }
        
        // Count
        finalizedSheet.getRange(row, startColumn + 2)
          .setValue(item.count)
          .setHorizontalAlignment('center');
        
        // Quality Assessment
        let assessment;
        if (item.avgRating >= 4.0) {
          assessment = "Excellent";
        } else if (item.avgRating >= 3.5) {
          assessment = "Very Good";
        } else if (item.avgRating >= 3.0) {
          assessment = "Good";
        } else if (item.avgRating >= 2.5) {
          assessment = "Fair";
        } else {
          assessment = "Needs Improvement";
        }
        
        finalizedSheet.getRange(row, startColumn + 3)
          .setValue(assessment)
          .setHorizontalAlignment('center');
        
        // Action recommendations
        let action;
        if (item.avgRating >= 4.0) {
          action = "Prioritize";
        } else if (item.avgRating >= 3.0) {
          action = "Continue";
        } else {
          action = "Review/Refine";
        }
        
        finalizedSheet.getRange(row, startColumn + 4)
          .setValue(action)
          .setHorizontalAlignment('center');
      });
      
      // Add alternating row colors for readability
      for (let i = 0; i < sortedBreakdown.length; i++) {
        if (i % 2 === 1) {
          finalizedSheet.getRange(tableHeaderRow + 2 + i, startColumn, 1, 5)
            .setBackground(DISPLAY_CONFIG.colors.alternateBg);
        }
      }
    }
    
    logMessage("Pattern quality display updated with new data format");
    
    // Return the total height (header + table header + overall row + breakdown rows)
    return 2 + 1 + Math.min(qualityData.breakdown.length, numRows);
  } catch (e) {
    logMessage("Error updating pattern quality display: " + e.toString());
    return 0;
  }
}
function updateBestTradingDaysDisplay(startRow = 9, startColumn = 8) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('F2').getValue();
    if (!rawData) {
      Logger.log("Best trading days data not found");
      return 0;
    }
    
    const daysData = JSON.parse(rawData);
    
    Logger.log(`Positioning Best Trading Days at row ${startRow}, column ${startColumn}`);
    
    // Calculate number of rows needed
    const numRows = Math.min(daysData.length, 5);
    
    if (numRows === 0) {
      Logger.log("No trading days data to display");
      return 0;
    }
    
    // Create header with correct merge and border
    finalizedSheet.getRange(startRow, startColumn, 1, 6) // 6 columns
      .merge()
      .setValue('Best Trading Days (By Weekday)')
      .setFontWeight('bold')
      .setBackground('#4285f4') // Bright blue header
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
    
    // Create table headers - exactly 6 columns to match data
    const tableHeaderRow = startRow + 1;
    finalizedSheet.getRange(tableHeaderRow, startColumn, 1, 6)
      .setValues([['Day', 'Total P/L', 'Avg P/L', 'Win Rate', 'Trades', 'Win/Loss']])
      .setFontWeight('bold')
      .setBackground('#e6e6e6') // Light gray for headers
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);
    
    // Sort data by total P/L
    const sortedData = daysData
      .sort((a, b) => b.totalPL - a.totalPL)
      .slice(0, numRows);
    
    // Display days data with Win/Loss ratio
    sortedData.forEach((day, i) => {
      const row = tableHeaderRow + 1 + i;
      
      // Calculate wins and losses
      const wins = Math.round(day.trades * day.winRate);
      const losses = day.trades - wins;
      const winLossRatio = `${wins}/${losses}`;
      
      // Create a data array with exactly 6 values to match the range
      const rowData = [
        day.day,                             // Day
        day.totalPL,                         // Total P/L
        day.avgPL,                           // Avg P/L
        day.winRate,                         // Win Rate
        day.trades,                          // Trades
        winLossRatio                         // Win/Loss ratio
      ];
      
      // Set all values at once to ensure column count matches
      finalizedSheet.getRange(row, startColumn, 1, 6).setValues([rowData]);
      
      // Format each cell separately
      // Day name
      finalizedSheet.getRange(row, startColumn)
        .setHorizontalAlignment('left')
        .setBorder(true, true, true, true, false, false);
      
      // Total P/L
      const totalPLCell = finalizedSheet.getRange(row, startColumn + 1);
      totalPLCell
        .setNumberFormat('$#,##0.00')
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, false, false);
        
      if (day.totalPL > 0) {
        totalPLCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (day.totalPL < 0) {
        totalPLCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Avg P/L
      const avgPLCell = finalizedSheet.getRange(row, startColumn + 2);
      avgPLCell
        .setNumberFormat('$#,##0.00')
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, false, false);
        
      if (day.avgPL > 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (day.avgPL < 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Win Rate
      const winRateCell = finalizedSheet.getRange(row, startColumn + 3);
      winRateCell
        .setNumberFormat('0.00%')
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, false, false);
        
      if (day.winRate > 0.6) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (day.winRate < 0.4) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Total Trades
      finalizedSheet.getRange(row, startColumn + 4)
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, false, false);
      
      // Win/Loss Ratio
      finalizedSheet.getRange(row, startColumn + 5)
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, false, false);
    });
    
    // Add alternating row colors for readability
    for (let i = 0; i < numRows; i++) {
      if (i % 2 === 1) {
        finalizedSheet.getRange(tableHeaderRow + 1 + i, startColumn, 1, 6)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    }
    
    Logger.log("Best trading days display updated");
    
    // Return total height: header + table header + data rows
    return 2 + numRows; // 1 (header) + 1 (table header) + numRows (data)
  } catch (e) {
    Logger.log("Error updating best trading days display: " + e.toString());
    return 0;
  }
}
function updateTradeDistributionsDisplay(startRow = 25, startColumn = 8) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('I2').getValue();
    if (!rawData) {
      Logger.log("Trade distributions data not found");
      return 0;
    }
    
    const distributionData = JSON.parse(rawData);
    
    Logger.log(`Positioning Trade Distributions at row ${startRow}, column ${startColumn}`);
    
    // Create header
    finalizedSheet.getRange(startRow, startColumn, 1, 6)
      .merge()
      .setValue('Trade Distribution Analysis')
      .setFontWeight('bold')
      .setBackground('#4285f4') // Bright blue header
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
    
    // Create table headers
    const tableHeaderRow = startRow + 1;
    finalizedSheet.getRange(tableHeaderRow, startColumn, 1, 6)
      .setValues([['Statistic', 'Duration (mins)', 'P/L per Minute ($)', 'Risk per Minute', 'Avg P/L per Trade', 'Avg Risk per Trade']])
      .setFontWeight('bold')
      .setBackground('#e6e6e6') // Light gray for headers
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);
    
    // Create rows for each statistic - Max, Mean, Median
    const stats = [
      { label: "Max", duration: distributionData.duration.max, plPerMin: distributionData.plPerMinute.max, 
        riskPerMin: distributionData.riskPerMinute.max, plPerTrade: distributionData.plPerTrade.max, 
        riskPerTrade: distributionData.riskPerTrade.max },
      { label: "Mean", duration: distributionData.duration.mean, plPerMin: distributionData.plPerMinute.mean, 
        riskPerMin: distributionData.riskPerMinute.mean, plPerTrade: distributionData.plPerTrade.mean, 
        riskPerTrade: distributionData.riskPerTrade.mean },
      { label: "Median", duration: distributionData.duration.median, plPerMin: distributionData.plPerMinute.median, 
        riskPerMin: distributionData.riskPerMinute.median, plPerTrade: distributionData.plPerTrade.median, 
        riskPerTrade: distributionData.riskPerTrade.median }
    ];
    
    stats.forEach((stat, i) => {
      const row = tableHeaderRow + 1 + i;
      
      // Create a row array for all values
      const rowData = [
        stat.label,
        stat.duration,
        stat.plPerMin,
        stat.riskPerMin,
        stat.plPerTrade,
        stat.riskPerTrade
      ];
      
      // Set all values at once
      finalizedSheet.getRange(row, startColumn, 1, 6)
        .setValues([rowData])
        .setBorder(true, true, true, true, true, true);
      
      // Set formatting for each cell
      finalizedSheet.getRange(row, startColumn).setHorizontalAlignment('left');
      finalizedSheet.getRange(row, startColumn + 1).setNumberFormat('0.00');
      finalizedSheet.getRange(row, startColumn + 2).setNumberFormat('$#,##0.00');
      finalizedSheet.getRange(row, startColumn + 3).setNumberFormat('0.00');
      finalizedSheet.getRange(row, startColumn + 4).setNumberFormat('$#,##0.00');
      finalizedSheet.getRange(row, startColumn + 5).setNumberFormat('0.00');
      
      // Add alternating row colors for readability
      if (i % 2 === 1) {
        finalizedSheet.getRange(row, startColumn, 1, 6)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    });
    
    Logger.log("Trade distributions display updated with position parameters");
    
    // Return total height: header + table header + stats rows (3)
    return 5; // 1 (header) + 1 (table header) + 3 (stat rows)
  } catch (e) {
    Logger.log("Error updating trade distributions display: " + e.toString());
    return 0;
  }
}
function updateRecentTradesDisplay(startRow = 20, startColumn = 8) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('E2').getValue();
    if (!rawData) {
      Logger.log("Recent trades data not found");
      return 0;
    }
    
    const tradesData = JSON.parse(rawData);
    
    Logger.log(`Positioning Recent Trades Summary at row ${startRow}, column ${startColumn}`);
    
    // Calculate number of rows needed
    const numRows = Math.min(tradesData.trades.length, 4);  // Show up to 4 most recent trades
    
    if (numRows === 0) {
      Logger.log("No recent trades data to display");
      return 0;
    }
    
    // Create section header
    finalizedSheet.getRange(startRow, startColumn, 1, 4)
      .merge()
      .setValue('Recent Trades Summary')
      .setFontWeight('bold')
      .setBackground('#4285f4')  // Bright blue header
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
    
    // Create table headers
    const tableHeaderRow = startRow + 1;
    finalizedSheet.getRange(tableHeaderRow, startColumn, 1, 4)
      .setValues([['Date', 'Setup Type', 'Result', 'P/L']])
      .setFontWeight('bold')
      .setBackground('#e6e6e6')  // Light gray for headers
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);
    
    // Display recent trades - most recent first
    for (let i = 0; i < numRows; i++) {
      const trade = tradesData.trades[i];
      const row = tableHeaderRow + 1 + i;
      
      // Format the date
      let dateValue = trade.date;
      if (typeof dateValue === 'string') {
        // Try to parse the date string
        dateValue = new Date(dateValue);
      }
      
      // Create a data array with exactly 4 values to match the range
      const rowData = [
        dateValue,                         // Date
        trade.setupType,                   // Setup Type
        trade.result,                      // Result
        trade.pl                           // P/L
      ];
      
      // Set all values at once to ensure column count matches
      finalizedSheet.getRange(row, startColumn, 1, 4).setValues([rowData]);
      
      // Format each cell
      // Date
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        finalizedSheet.getRange(row, startColumn).setNumberFormat(DISPLAY_CONFIG.formats.date);
      }
      
      // Setup Type
      finalizedSheet.getRange(row, startColumn + 1)
        .setHorizontalAlignment('left');
      
      // Result
      const resultCell = finalizedSheet.getRange(row, startColumn + 2);
      resultCell.setHorizontalAlignment('center');
        
      if (trade.result.toString().toLowerCase() === 'win') {
        resultCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (trade.result.toString().toLowerCase() === 'loss') {
        resultCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // P/L
      const plCell = finalizedSheet.getRange(row, startColumn + 3);
      plCell
        .setNumberFormat(DISPLAY_CONFIG.formats.currency)
        .setHorizontalAlignment('center');
        
      if (trade.pl > 0) {
        plCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (trade.pl < 0) {
        plCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Add borders to all cells
      finalizedSheet.getRange(row, startColumn, 1, 4)
        .setBorder(true, true, true, true, true, true);
    }
    
    Logger.log("Recent trades display updated with position parameters");
    
    // Return the total height (header + table header + data rows)
    return 2 + numRows; // 1 (header) + 1 (table header) + numRows
  } catch (e) {
    Logger.log("Error updating recent trades display: " + e.toString());
    return 0;
  }
}
function updateRiskAdjustedMetricsDisplay(startRow = 30, startColumn = 8) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    Logger.log(`Positioning Risk-Adjusted Metrics at row ${startRow}, column ${startColumn}`);
    
    // Get raw data
    const rawData = dataSheet.getRange('G2').getValue();
    if (!rawData) {
      Logger.log("No risk-adjusted metrics data found");
      return 0;
    }
    
    // Parse data
    let metricsData;
    try {
      metricsData = JSON.parse(rawData);
    } catch (parseError) {
      Logger.log(`Error parsing risk-adjusted metrics data: ${parseError}`);
      return 0;
    }
    
    // Create section header using standardized formatting
    const tableHeaderRow = formatStandardTable(
      finalizedSheet, 
      startRow, 
      startColumn, 
      5, // Number of data rows
      3, // Number of columns
      'Risk-Adjusted Performance Metrics',
      ['Metric', 'Value', 'Description']
    );
    
    // Define metrics to display with descriptions
    const metrics = [
      { name: 'Sharpe Ratio', value: metricsData.sharpeRatio, format: '0.00', description: 'Return vs Volatility' },
      { name: 'Maximum Drawdown', value: metricsData.maxDrawdownPct, format: '0.00%', description: 'Largest peak-to-trough decline' },
      { name: 'Avg Recovery Time', value: metricsData.avgRecoveryDays, format: '0.0 "days"', description: 'Time to recover from drawdowns' },
      { name: 'Profit Factor', value: metricsData.profitFactor, format: '0.00', description: 'Gross profits / gross losses' },
      { name: 'Expectancy', value: metricsData.expectancy, format: '0.00 "R"', description: 'Average R-multiple per trade' }
    ];
    
    // Populate metrics data
    metrics.forEach((metric, i) => {
      const row = tableHeaderRow + 1 + i;
      
      // Metric name
      finalizedSheet.getRange(row, startColumn).setValue(metric.name);
      
      // Value with formatting
      const valueCell = finalizedSheet.getRange(row, startColumn + 1);
      valueCell.setValue(metric.value).setNumberFormat(metric.format);
      
      // Description
      finalizedSheet.getRange(row, startColumn + 2).setValue(metric.description);
      
      // Apply conditional formatting based on metric type
      if (metric.name === 'Sharpe Ratio' || metric.name === 'Profit Factor' || metric.name === 'Expectancy') {
        if (metric.value > 1) {
          valueCell.setBackground(DISPLAY_CONFIG.colors.positive);
        } else if (metric.value < 1) {
          valueCell.setBackground(DISPLAY_CONFIG.colors.negative);
        }
      } else if (metric.name === 'Maximum Drawdown') {
        // Lower drawdown is better
        if (metric.value < 0.15) {
          valueCell.setBackground(DISPLAY_CONFIG.colors.positive);
        } else if (metric.value > 0.25) {
          valueCell.setBackground(DISPLAY_CONFIG.colors.negative);
        }
      }
    });
    
    // Add alternating row colors for readability
    for (let i = 0; i < metrics.length; i++) {
      if (i % 2 === 1) {
        finalizedSheet.getRange(tableHeaderRow + 1 + i, startColumn, 1, 3)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    }
    
    Logger.log("Risk-adjusted performance metrics display updated with position parameters");
    
    // Return total height: header + table header + metrics rows
    return 2 + metrics.length; // 1 (header) + 1 (table header) + 5 (metric rows)
  } catch (e) {
    Logger.log("Error updating risk-adjusted metrics display: " + e.toString());
    return 0;
  }
}
function updatePsychologicalMetricsDisplay(startRow = 40, startColumn = 8) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!dataSheet || !finalizedSheet) {
      Logger.log("Required sheets not found");
      return 0;
    }
    
    // Get raw data
    const rawData = dataSheet.getRange('H2').getValue();
    if (!rawData) {
      Logger.log("Psychological metrics data not found");
      return 0;
    }
    
    const psychData = JSON.parse(rawData);
    
    Logger.log(`Positioning Psychological Metrics at row ${startRow}, column ${startColumn}`);
    
    // Track total height
    let totalHeight = 0;
    
    // Apply standardized table formatting for streak analysis
    const streakHeaderRow = formatStandardTable(
      finalizedSheet,
      startRow,
      startColumn,
      4, // 4 metrics
      4, // 4 columns
      'Psychological Analysis - Trading Streak Impact',
      ['Streak Type', 'Win Rate', 'Avg P/L', 'Total Trades']
    );
    
    // Display streak metrics
    const streakLabels = [
      { key: 'afterWin', label: 'After a Win' },
      { key: 'afterLoss', label: 'After a Loss' },
      { key: 'afterTwoWins', label: 'After Two Wins' },
      { key: 'afterTwoLosses', label: 'After Two Losses' }
    ];
    
    streakLabels.forEach((item, i) => {
      const row = streakHeaderRow + 1 + i;
      const data = psychData.streakPerformance[item.key];
      
      // Streak type
      finalizedSheet.getRange(row, startColumn)
        .setValue(item.label)
        .setHorizontalAlignment('left');
      
      // Win Rate
      const winRateCell = finalizedSheet.getRange(row, startColumn + 1);
      winRateCell.setValue(data.winRate)
        .setNumberFormat('0.00%')
        .setHorizontalAlignment('center');
        
      if (data.winRate > 0.6) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (data.winRate < 0.4) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Avg P/L
      const avgPLCell = finalizedSheet.getRange(row, startColumn + 2);
      avgPLCell.setValue(data.avgPL)
        .setNumberFormat('$#,##0.00')
        .setHorizontalAlignment('center');
        
      if (data.avgPL > 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (data.avgPL < 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Total Trades
      finalizedSheet.getRange(row, startColumn + 3)
        .setValue(data.trades)
        .setHorizontalAlignment('center');
    });
    
    // Add alternating row colors for readability
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 1) {
        finalizedSheet.getRange(streakHeaderRow + 1 + i, startColumn, 1, 4)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    }
    
    // Update total height after streak section
    totalHeight = 2 + 4; // header + table header + 4 data rows
    
    // Position overtrading analysis below streak analysis with a 2-row gap
    const overtradingHeaderRow = formatStandardTable(
      finalizedSheet,
      startRow + totalHeight + 2, // Add 2-row gap
      startColumn,
      psychData.overtradingAnalysis.length,
      4, // 4 columns
      'Overtrading Analysis',
      ['Trades Per Day', 'Win Rate', 'Avg P/L Per Day', 'Number of Days']
    );
    
    // Display overtrading metrics
    psychData.overtradingAnalysis.forEach((item, i) => {
      const row = overtradingHeaderRow + 1 + i;
      
      // Trades Per Day
      finalizedSheet.getRange(row, startColumn)
        .setValue(item.tradesPerDay)
        .setHorizontalAlignment('center');
      
      // Win Rate
      const winRateCell = finalizedSheet.getRange(row, startColumn + 1);
      winRateCell.setValue(item.winRate)
        .setNumberFormat('0.00%')
        .setHorizontalAlignment('center');
        
      if (item.winRate > 0.6) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (item.winRate < 0.4) {
        winRateCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Avg P/L Per Day
      const avgPLCell = finalizedSheet.getRange(row, startColumn + 2);
      avgPLCell.setValue(item.avgPLPerDay)
        .setNumberFormat('$#,##0.00')
        .setHorizontalAlignment('center');
        
      if (item.avgPLPerDay > 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.positive);
      } else if (item.avgPLPerDay < 0) {
        avgPLCell.setBackground(DISPLAY_CONFIG.colors.negative);
      }
      
      // Number of Days
      finalizedSheet.getRange(row, startColumn + 3)
        .setValue(item.days)
        .setHorizontalAlignment('center');
    });
    
    // Add alternating row colors for overtrading analysis
    for (let i = 0; i < psychData.overtradingAnalysis.length; i++) {
      if (i % 2 === 1) {
        finalizedSheet.getRange(overtradingHeaderRow + 1 + i, startColumn, 1, 4)
          .setBackground(DISPLAY_CONFIG.colors.alternateBg);
      }
    }
    
    // Update total height after overtrading section
    totalHeight += 2 + 2 + psychData.overtradingAnalysis.length; // 2-row gap + header/table header + data rows
    
    // Only add time of day analysis if data exists
    if (psychData.timeOfDayPerformance && psychData.timeOfDayPerformance.length > 0) {
      const timeHeaderRow = startRow + totalHeight + 2; // Add 2-row gap
      
      const numTimeRows = Math.min(psychData.timeOfDayPerformance.length, 8);
      
      const timeTableHeaderRow = formatStandardTable(
        finalizedSheet,
        timeHeaderRow,
        startColumn,
        numTimeRows,
        4, // 4 columns
        'Time of Day Performance',
        ['Hour', 'Win Rate', 'Avg P/L', 'Total Trades']
      );
      
      // Display time of day metrics
      psychData.timeOfDayPerformance
        .sort((a, b) => a.hour - b.hour)
        .slice(0, numTimeRows)
        .forEach((item, i) => {
          const row = timeTableHeaderRow + 1 + i;
          
          // Format hour (e.g., "9:00" instead of just 9)
          const hourLabel = `${item.hour}:00`;
          
          // Hour
          finalizedSheet.getRange(row, startColumn)
            .setValue(hourLabel)
            .setHorizontalAlignment('center');
          
          // Win Rate
          const winRateCell = finalizedSheet.getRange(row, startColumn + 1);
          winRateCell.setValue(item.winRate)
            .setNumberFormat('0.00%')
            .setHorizontalAlignment('center');
            
          if (item.winRate > 0.6) {
            winRateCell.setBackground(DISPLAY_CONFIG.colors.positive);
          } else if (item.winRate < 0.4) {
            winRateCell.setBackground(DISPLAY_CONFIG.colors.negative);
          }
          
          // Avg P/L
          const avgPLCell = finalizedSheet.getRange(row, startColumn + 2);
          avgPLCell.setValue(item.avgPL)
            .setNumberFormat('$#,##0.00')
            .setHorizontalAlignment('center');
            
          if (item.avgPL > 0) {
            avgPLCell.setBackground(DISPLAY_CONFIG.colors.positive);
          } else if (item.avgPL < 0) {
            avgPLCell.setBackground(DISPLAY_CONFIG.colors.negative);
          }
          
          // Total Trades
          finalizedSheet.getRange(row, startColumn + 3)
            .setValue(item.trades)
            .setHorizontalAlignment('center');
        });
      
      // Add alternating row colors for time of day analysis
      for (let i = 0; i < numTimeRows; i++) {
        if (i % 2 === 1) {
          finalizedSheet.getRange(timeTableHeaderRow + 1 + i, startColumn, 1, 4)
            .setBackground(DISPLAY_CONFIG.colors.alternateBg);
        }
      }
      
      // Update total height to include time of day section
      totalHeight += 2 + 2 + numTimeRows; // 2-row gap + header/table header + data rows
    }
    
    Logger.log("Psychological metrics display updated with position parameters");
    
    // Return total height
    return totalHeight;
  } catch (e) {
    Logger.log("Error updating psychological metrics display: " + e.toString());
    return 0;
  }
}


function createPerformanceHeatmap(startRow = 9, startColumn = 16) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    // Create header (unchanged)
    finalizedSheet.getRange(startRow, startColumn, 1, 7)
      .merge()
      .setValue('PERFORMANCE HEATMAP (LAST 30 DAYS)')
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);

    // Add day labels (unchanged)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 0; d < 7; d++) {
      finalizedSheet.getRange(startRow + 1, startColumn + d)
        .setValue(days[d])
        .setHorizontalAlignment('center')
        .setFontWeight('bold')
        .setBackground('#e6e6e6')
        .setBorder(true, true, true, true, false, false);
      
      if (d === 0 || d === 6) {
        finalizedSheet.getRange(startRow + 1, startColumn + d)
          .setBackground('#f0f0f0')
          .setFontColor('#999999');
      }
    }

    // Load trade data for visualization
    const rawData = dashboardSheet.getRange('E2').getValue();
    let tradeData = { dateGroups: {} };
    try {
      const parsedData = JSON.parse(rawData);
      tradeData = parsedData;
    } catch (e) {
      logMessage(`Error parsing recent trades data: ${e.toString()}`);
    }

    // Get daily trade summary from dateGroups
    const dailyTrades = tradeData.dateGroups || {};

    // Calculate current date and range
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 30);

    // Find the first Sunday at or before start date for calendar grid
    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    // Colors for profit/loss gradients
    const profitColors = ['#b6d7a8', '#6aa84f', '#38761d']; // Light to dark green
    const lossColors = ['#f4cccc', '#ea9999', '#cc0000']; // Light to dark red
    
    // Thresholds for cell coloring (adjust as needed)
    const profitThresholds = [50, 100]; // Light, Medium, Strong profit
    const lossThresholds = [50, 100]; // Light, Medium, Heavy loss

    // Build the calendar grid (5 weeks)
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 7; day++) {
        const cellRow = startRow + 2 + week;
        const cellCol = startColumn + day;
        
        // Calculate date for this cell
        const cellDate = new Date(firstSunday);
        cellDate.setDate(firstSunday.getDate() + (week * 7 + day));
        
        // Format as YYYY-MM-DD for lookup
        const dateKey = Utilities.formatDate(cellDate, "America/New_York", 'yyyy-MM-dd');
        
        // Set date number in the cell
        const cell = finalizedSheet.getRange(cellRow, cellCol);
        cell.setValue(cellDate.getDate())
          .setHorizontalAlignment('center')
          .setNumberFormat('0')
          .setBorder(true, true, true, true, null, null);
        
        // Weekend styling
        const isWeekend = (day === 0 || day === 6);
        if (isWeekend) {
          cell.setBackground('#f0f0f0')
            .setFontColor('#999999')
            .setFontStyle('italic');
          continue; // Skip data display for weekends
        }
        
        // Check if we have trading data for this date
        if (dailyTrades[dateKey]) {
          const dayData = dailyTrades[dateKey];
          const pl = dayData.totalPL || 0;
          const wins = dayData.wins || 0;
          const losses = dayData.losses || 0;
          const tradeCount = dayData.trades?.length || 0;
          
          // Enhanced cell formatting with graphical indicators
          // 1. Color based on P/L
          let bgColor = '#ffffff'; // Default white
          if (pl > 0) {
            // Profit gradient
            if (pl >= profitThresholds[1]) {
              bgColor = profitColors[2]; // Strong profit
            } else if (pl >= profitThresholds[0]) {
              bgColor = profitColors[1]; // Good profit
            } else {
              bgColor = profitColors[0]; // Light profit
            }
          } else if (pl < 0) {
            // Loss gradient
            const absLoss = Math.abs(pl);
            if (absLoss >= lossThresholds[1]) {
              bgColor = lossColors[2]; // Heavy loss
            } else if (absLoss >= lossThresholds[0]) {
              bgColor = lossColors[1]; // Significant loss
            } else {
              bgColor = lossColors[0]; // Light loss
            }
          }
          cell.setBackground(bgColor);
          
          // 2. Add Win/Loss ratio visual indicator using rich text
          // Only if we have both wins and losses
          if (wins > 0 || losses > 0) {
            let cellText = cellDate.getDate().toString();
            
            // Add simple win/loss indicator in top right
            if (wins > 0 || losses > 0) {
              // Use rich text to format the win/loss indicator
              const richText = SpreadsheetApp.newRichTextValue()
                .setText(`${cellDate.getDate()}\n${wins}/${losses}`)
                .build();
              
              cell.setRichTextValue(richText);
            }
          }
          
          // 3. Create detailed tooltip with trade information
          const tooltipText = `Date: ${Utilities.formatDate(cellDate, "America/New_York", 'MM/dd/yyyy')}
Trades: ${tradeCount}
Wins: ${wins}, Losses: ${losses}
P/L: $${pl.toFixed(2)}`;
          
          cell.setNote(tooltipText);
          
        } else {
          // No data for this day - keep it empty/white
          cell.setBackground('#ffffff');
        }
      }
    }

    // Add legend as before...
    const legendRow = startRow + 2 + 5 + 1;
    finalizedSheet.getRange(legendRow, startColumn, 1, 7)
      .merge()
      .setValue('Legend:')
      .setFontWeight('bold')
      .setHorizontalAlignment('left');
    
    // Create legend items
    const legendItems = [
      { label: 'Strong Profit (>$100)', color: profitColors[2] },
      { label: 'Good Profit ($50-$100)', color: profitColors[1] },
      { label: 'Light Profit (<$50)', color: profitColors[0] },
      { label: 'Light Loss (<$50)', color: lossColors[0] },
      { label: 'Significant Loss ($50-$100)', color: lossColors[1] },
      { label: 'Heavy Loss (>$100)', color: lossColors[2] },
      { label: 'No Trades', color: '#ffffff' }
    ];
    
    // Add one row of legend items
    const row1 = legendRow + 1;
    for (let i = 0; i < Math.min(legendItems.length, 7); i++) {
      finalizedSheet.getRange(row1, startColumn + i)
        .setBackground(legendItems[i].color)
        .setBorder(true, true, true, true, null, null);
        
      finalizedSheet.getRange(row1 + 1, startColumn + i)
        .setValue(legendItems[i].label)
        .setFontSize(8)
        .setWrap(true);
    }
    
    // Make row height taller for legend labels
    finalizedSheet.setRowHeight(row1 + 1, 30);
    
    logMessage("Performance heatmap created with enhanced trading data visualization");
    return 11; // Return total height including legend
    
  } catch (e) {
    logMessage(`Error creating performance heatmap: ${e.toString()}`);
    return 0;
  }
}
function createCorrelationMatrix(startRow = 25, startColumn = 16) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    if (!dataSheet || !finalizedSheet) {
      logMessage("Required sheets not found for correlation matrix");
      return 0;
    }
    logMessage(`Creating correlation matrix at row ${startRow}, column ${startColumn}`);
    
    // Get trade data for correlation calculation
    const tradeData = prepareTradingDataForCorrelation();
    if (!tradeData || tradeData.length === 0) {
      logMessage("No valid trade data for correlation analysis");
      return 0;
    }
    
    // Define metrics for correlation analysis - now including new metrics
    const metrics = [
      { key: 'plValue', label: 'P/L Value' },
      { key: 'riskValue', label: 'Risk Amount' },
      { key: 'rMultiple', label: 'R-Multiple' },
      { key: 'duration', label: 'Trade Duration' },
      { key: 'timeOfDay', label: 'Time of Day' },
      { key: 'isWin', label: 'Win/Loss' },
      { key: 'qualityRating', label: 'Pattern Quality' }, // New metric
      { key: 'afterWin', label: 'After Win' }           // New metric
    ];
    
    // Log metrics for debugging
    logMessage(`Using ${metrics.length} metrics: ${metrics.map(m => m.label).join(', ')}`);
    
    // Create the header
    finalizedSheet.getRange(startRow, startColumn, 1, metrics.length + 1)
      .merge()
      .setValue('Trading Metrics Correlation Matrix')
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
    
    // Create row headers
    for (let i = 0; i < metrics.length; i++) {
      finalizedSheet.getRange(startRow + 2 + i, startColumn)
        .setValue(metrics[i].label)
        .setFontWeight('bold')
        .setBackground('#e6e6e6')
        .setHorizontalAlignment('left')
        .setBorder(true, true, true, true, false, false);
    }
    
    // Create column headers
    for (let i = 0; i < metrics.length; i++) {
      finalizedSheet.getRange(startRow + 1, startColumn + 1 + i)
        .setValue(metrics[i].label)
        .setFontWeight('bold')
        .setBackground('#e6e6e6')
        .setHorizontalAlignment('center')
        .setTextRotation(90)
        .setBorder(true, true, true, true, false, false);
    }
    
    // Calculate and render correlation values
    for (let row = 0; row < metrics.length; row++) {
      for (let col = 0; col < metrics.length; col++) {
        // Extract data for correlation
        const xValues = tradeData.map(t => t[metrics[row].key]);
        const yValues = tradeData.map(t => t[metrics[col].key]);
        
        // Calculate correlation
        const correlation = calculateCorrelation(xValues, yValues);
        
        // Get the cell
        const cell = finalizedSheet.getRange(startRow + 2 + row, startColumn + 1 + col);
        
        // Set value with formatting
        cell.setValue(correlation)
          .setNumberFormat('0.00')
          .setHorizontalAlignment('center')
          .setBorder(true, true, true, true, false, false);
        
        // Highlight the diagonal
        if (row === col) {
          cell.setBackground('#f3f3f3');
          continue;
        }
        
        // Color code by correlation strength
        if (Math.abs(correlation) > 0.7) {
          cell.setBackground(correlation > 0 ? '#b6d7a8' : '#ea9999');
          cell.setFontWeight('bold');
        } else if (Math.abs(correlation) > 0.4) {
          cell.setBackground(correlation > 0 ? '#d9ead3' : '#f4cccc');
        }
      }
    }
    
    // Add legend and explanatory text (keeping same as before)
    // ... [Rest of your legend code]
    
    // The rest of your function remains the same
    const legendRow = startRow + 2 + metrics.length + 1;
    finalizedSheet.getRange(legendRow, startColumn, 1, metrics.length + 1)
      .merge()
      .setValue('Correlation Strength Legend:')
      .setFontWeight('bold')
      .setHorizontalAlignment('left');
    
    // Legend items
    const legendItems = [
      { label: 'Strong Positive (>0.7)', color: '#b6d7a8' },
      { label: 'Moderate Positive (0.4-0.7)', color: '#d9ead3' },
      { label: 'Weak/No Correlation (-0.4 to 0.4)', color: '#ffffff' },
      { label: 'Moderate Negative (-0.7 to -0.4)', color: '#f4cccc' },
      { label: 'Strong Negative (<-0.7)', color: '#ea9999' }
    ];
    
    // Create the legend
    const legendStartCol = startColumn;
    for (let i = 0; i < Math.min(legendItems.length, 7); i++) {
      const col = legendStartCol + i;
      if (col > startColumn + metrics.length) continue;
      
      finalizedSheet.getRange(legendRow + 1, col)
        .setBackground(legendItems[i].color)
        .setBorder(true, true, true, true, null, null);
      
      finalizedSheet.getRange(legendRow + 2, col)
        .setValue(legendItems[i].label)
        .setFontSize(8)
        .setWrap(true);
    }
    
    // Add updated interpretation note
    finalizedSheet.getRange(legendRow + 3, startColumn, 1, metrics.length + 1)
      .merge()
      .setValue('📊 Interpretation: Strong correlations may indicate related factors in your trading success. Pattern Quality and After-Win/Loss metrics show how quality and psychology affect outcomes.')
      .setFontStyle('italic')
      .setWrap(true);
    
    logMessage("Correlation matrix created successfully with expanded metrics");
    
    // Calculate total height and return
    return 1 + 1 + metrics.length + 1 + 1 + 2 + 1;
  } catch (e) {
    logMessage(`Error creating correlation matrix: ${e.toString()}`);
    return 0;
  }
}
// Main dashboard builder
function buildGridBasedDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);

    // Cleanup existing sheet
    if (finalizedSheet) {
      // Remove all merged ranges and formatting
      finalizedSheet.getDataRange().breakApart();
      finalizedSheet.clearConditionalFormatRules();
      
      // Reset all columns to default width
      const cols = finalizedSheet.getMaxColumns();
      for (let i = 1; i <= cols; i++) {
        finalizedSheet.setColumnWidth(i, 100);
      }
    } else {
      // Create new sheet if it doesn't exist
      finalizedSheet = ss.insertSheet(DISPLAY_CONFIG.sheets.finalizedDashboard);
    }

    // Clear all existing content
    finalizedSheet.clear();
    
    // Set column widths based on layout config
    for (let i = 0; i < LAYOUT_CONFIG.leftColumn.width; i++) {
      finalizedSheet.setColumnWidth(LAYOUT_CONFIG.leftColumn.startCol + i, 120);
    }
    
    // Create a spacing column
    finalizedSheet.setColumnWidth(LAYOUT_CONFIG.leftColumn.startCol + LAYOUT_CONFIG.leftColumn.width, 50);
    
    // Right column
    for (let i = 0; i < LAYOUT_CONFIG.rightColumn.width; i++) {
      finalizedSheet.setColumnWidth(LAYOUT_CONFIG.rightColumn.startCol + i, 120);
    }

    // Create dashboard header (full width across both columns)
    const headerWidth = LAYOUT_CONFIG.rightColumn.startCol + LAYOUT_CONFIG.rightColumn.width - LAYOUT_CONFIG.leftColumn.startCol;
    const header = finalizedSheet.getRange(1, LAYOUT_CONFIG.leftColumn.startCol, 1, headerWidth);
    header.merge()
      .setValue('Trading Performance Dashboard')
      .setFontWeight('bold')
      .setFontSize(16)
      .setBackground(DISPLAY_CONFIG.colors.headerBg)
      .setFontColor(DISPLAY_CONFIG.colors.headerText);

    // Create filter row with bold, light blue background
    finalizedSheet.setRowHeight(2, 30); // Make filter row taller
    finalizedSheet.getRange(2, LAYOUT_CONFIG.leftColumn.startCol, 1, headerWidth)
      .setBackground('#c9daf8'); // Light blue background for filter row
    
    // Add filter labels and controls
    // 1. Date Range Filter
    finalizedSheet.getRange(2, LAYOUT_CONFIG.leftColumn.startCol, 1, 2)
      .merge()
      .setValue('📅 Date Range Filter:')
      .setFontWeight('bold')
      .setHorizontalAlignment('right')
      .setVerticalAlignment('middle');
    
    finalizedSheet.getRange(2, LAYOUT_CONFIG.leftColumn.startCol + 2)
      .setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(['All Time', 'This Week', 'This Month', 'YTD'], true))
      .setValue('All Time')
      .setBackground('#ffffff')
      .setBorder(true, true, true, true, null, null);
    
    // 2. Setup Type Filter
    finalizedSheet.getRange(2, LAYOUT_CONFIG.leftColumn.startCol + 3, 1, 2)
      .merge()
      .setValue('📊 Setup Type Filter:')
      .setFontWeight('bold')
      .setHorizontalAlignment('right')
      .setVerticalAlignment('middle');
    
    // Get unique setup types from data
    let setupTypes = ['All'];
    try {
      const additionalTypes = getUniqueSetupTypes();
      if (additionalTypes && additionalTypes.length > 0) {
        setupTypes = setupTypes.concat(additionalTypes);
      } else {
        // Fallback default setup types if needed
        setupTypes = setupTypes.concat(['RD-Cont', 'FVG-RD', 'SMT', 'BOS']);
      }
    } catch (e) {
      // Fallback if the function isn't available
      setupTypes = ['All', 'RD-Cont', 'FVG-RD', 'SMT', 'BOS'];
      logMessage("Using default setup types: " + e.toString());
    }
    
    finalizedSheet.getRange(2, LAYOUT_CONFIG.leftColumn.startCol + 5)
      .setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(setupTypes, true))
      .setValue('All')
      .setBackground('#ffffff')
      .setBorder(true, true, true, true, null, null);
    
    // 3. Result Filter
    finalizedSheet.getRange(2, LAYOUT_CONFIG.rightColumn.startCol, 1, 2)
      .merge()
      .setValue('🎯 Result Filter:')
      .setFontWeight('bold')
      .setHorizontalAlignment('right')
      .setVerticalAlignment('middle');
    
    finalizedSheet.getRange(2, LAYOUT_CONFIG.rightColumn.startCol + 2)
      .setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(['All', 'Win', 'Loss'], true))
      .setValue('All')
      .setBackground('#ffffff')
      .setBorder(true, true, true, true, null, null);
    
    // Add Apply Filter button
    finalizedSheet.getRange(2, LAYOUT_CONFIG.rightColumn.startCol + 3)
      .setValue('Apply Filters')
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, null, null)
      .setNote('Click this cell to apply filters to the dashboard');
    
    // Initialize row trackers for each column
    let leftCurrentRow = 3; // Start at row 3 after header and filters
    let rightCurrentRow = 3; // Start at row 3 after header and filters
    
    // LEFT COLUMN SECTIONS (sorted by order)
    const leftSections = Object.entries(LAYOUT_CONFIG.sections)
      .filter(([name, config]) => config.column === 'left')
      .sort((a, b) => a[1].order - b[1].order);
    
    for (const [sectionName, config] of leftSections) {
      // Call the display function with position parameters
      const sectionHeight = renderSection(
        sectionName, 
        leftCurrentRow, 
        LAYOUT_CONFIG.leftColumn.startCol,
        finalizedSheet
      );
      
      // Update position for next section
      leftCurrentRow += (sectionHeight > 0 ? sectionHeight : config.approxHeight) + 2;
    }
    
    // RIGHT COLUMN SECTIONS (sorted by order)
    const rightSections = Object.entries(LAYOUT_CONFIG.sections)
      .filter(([name, config]) => config.column === 'right')
      .sort((a, b) => a[1].order - b[1].order);
    
    for (const [sectionName, config] of rightSections) {
      // Call the display function with position parameters
      const sectionHeight = renderSection(
        sectionName, 
        rightCurrentRow, 
        LAYOUT_CONFIG.rightColumn.startCol,
        finalizedSheet
      );
      
      // Update position for next section
      rightCurrentRow += (sectionHeight > 0 ? sectionHeight : config.approxHeight) + 2;
    }
    
    // Add footer
    const lastRow = Math.max(leftCurrentRow, rightCurrentRow);
    finalizedSheet.getRange(lastRow, LAYOUT_CONFIG.leftColumn.startCol, 1, headerWidth)
      .merge()
      .setValue('Last updated: ' + new Date().toLocaleString())
      .setFontStyle('italic')
      .setHorizontalAlignment('center');
    
    // Return success message
    return "Dashboard built successfully with grid-based layout!";
  } catch (e) {
    logMessage("Error building grid-based dashboard: " + e.toString());
    return "Error: " + e.toString();
  }
}
