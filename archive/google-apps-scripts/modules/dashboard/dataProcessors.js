function getFilterSettings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const finalizedSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.finalizedDashboard);
    
    if (!finalizedSheet) return { dateRange: 'All Time', setupType: 'All', result: 'All' };
    
    // Read filter values
    const dateRange = finalizedSheet.getRange('C2').getValue() || 'All Time';
    const setupType = finalizedSheet.getRange('F2').getValue() || 'All';
    const result = finalizedSheet.getRange('I2').getValue() || 'All';
    
    return {
      dateRange: dateRange,
      setupType: setupType,
      result: result
    };
  } catch (e) {
    logMessage("Error reading filter settings: " + e.toString());
    return { dateRange: 'All Time', setupType: 'All', result: 'All' };
  }
}
function filterTradesByDateRange(trades, dateRange) {
  if (!trades || !trades.length || dateRange === 'All Time') return trades;
  
  const nyTimezone = "America/New_York";
  const now = new Date();
  
  // Get current date in NY timezone at noon to avoid DST issues
  const todayNyStr = Utilities.formatDate(now, nyTimezone, 'yyyy-MM-dd');
  const todayNy = new Date(todayNyStr + 'T12:00:00');
  
  let startDate;
  
  switch (dateRange) {
    case 'This Week':
      startDate = new Date(todayNy);
      startDate.setDate(todayNy.getDate() - todayNy.getDay()); // Sunday in NY time
      break;
      
    case 'This Month':
      startDate = new Date(todayNy.getFullYear(), todayNy.getMonth(), 1);
      break;
      
    case 'YTD':
      startDate = new Date(todayNy.getFullYear(), 0, 1);
      break;
      
    default:
      return trades;
  }

  // Format start date as NY date string for logging
  const startDateStr = Utilities.formatDate(startDate, nyTimezone, 'yyyy-MM-dd');
  Logger.log(`Date filter: ${dateRange}, start date: ${startDateStr}`);
  
  return trades.filter(trade => {
    // Ensure trade.date is normalized
    const tradeDate = normalizeDate(trade.date);
    if (!tradeDate) return false;
    
    return tradeDate >= startDate;
  });
}


// Core processing template (new)
function processDataModule(dataProcessor, filterSettings) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return null;
    }
    
    // Get filter settings if not provided
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings();
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Process the data with the provided function
    const result = dataProcessor(dataSheet, dashboardSheet, filterSettings);
    return result;
  } catch (e) {
    logMessage(`Error processing data: ${e.toString()}`);
    return null;
  }
}

// Individual data processors
function processPerformanceSummary(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    // If no filter settings provided, use default or try to get current
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Get raw trade data from the Data Entry sheet
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    if (!dataSheet) {
      logMessage("Data Entry Form sheet not found");
      return;
    }
    
    // Read data with headers
    const allData = dataSheet.getDataRange().getValues();
    const headers = allData[0];
    const data = allData.slice(1).filter(row => row[0] !== ""); // Skip header, filter empty rows
    
    // Get column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const plCol = DISPLAY_CONFIG.columns.pl;
    const rMultipleCol = DISPLAY_CONFIG.columns.rMultiple;
    
    // Convert to array of trade objects for easier filtering
    const tradeObjects = data.map(row => {
      // Get date from the sheet
      let tradeDate = row[dateCol];
      
      // Ensure we're dealing with a proper Date object
      if (!(tradeDate instanceof Date) || isNaN(tradeDate.getTime())) {
        tradeDate = new Date(tradeDate);
      }
      
      // Create a normalized date at noon in local time to avoid timezone issues
      const normalizedDate = new Date(
        tradeDate.getFullYear(),
        tradeDate.getMonth(), 
        tradeDate.getDate(),
        12, 0, 0, 0 // noon local time to avoid any timezone edge cases
      );
      
      return {
        date: normalizedDate,
        setupType: (row[setupTypeCol] || '').toString(),
        result: (row[resultCol] || '').toString().toLowerCase(),
        pl: parseFloat(row[plCol] || 0),
        rMultiple: parseFloat(row[rMultipleCol] || 0)
      };
    });
    
    // Apply date range filter
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply setup type filter
    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply result filter
    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Calculate performance metrics
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter(trade => trade.result === 'win').length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const totalPL = filteredTrades.reduce((sum, trade) => sum + trade.pl, 0);
    const avgRMultiple = totalTrades > 0 ? 
        filteredTrades.reduce((sum, trade) => sum + trade.rMultiple, 0) / totalTrades : 0;
    
    // Create performance summary object
    const performanceSummary = {
      totalTrades: totalTrades,
      winRate: winRate,
      totalPL: totalPL,
      avgRMultiple: avgRMultiple,
      appliedFilters: filterSettings // Include the filters that were applied
    };
    
    // Store in dashboard
    dashboardSheet.getRange('A1').setValue("PERFORMANCE_SUMMARY_DATA");
    dashboardSheet.getRange('A2').setValue(JSON.stringify(performanceSummary));
    
    logMessage(`Performance summary processed: ${totalTrades} trades, win rate: ${(winRate * 100).toFixed(2)}%`);
  } catch (e) {
    logMessage("Error processing performance summary: " + e.toString());
  }
}
function processModelComparison(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }
    
    logMessage("Starting processModelComparison");
    
    // Ensure we have filter settings
    if (!filterSettings) {
      filterSettings = withErrorHandling(getFilterSettings, { 
        dateRange: 'All Time', 
        setupType: 'All', 
        result: 'All' 
      })();
    }
    
    // Extract trades with modelType and session
    const trades = withErrorHandling(extractTradeObjects)(dataSheet, {
      modelType: 1,   // Model Type column
      session: 2      // Session (Time Block) column
    });
    
    if (!trades || trades.length === 0) {
      logMessage("No trade data found");
      return;
    }
    
    // Apply standard filters
    const filteredTrades = withErrorHandling(applyFilters)(trades, filterSettings);
    logMessage(`Filtered trades count: ${filteredTrades.length}`);
    if (filteredTrades.length > 0) {
      logMessage(`First trade model type: ${filteredTrades[0].modelType}, session: ${filteredTrades[0].session}`);
    }
    
    // Separate by model types
    const rdContTrades = filteredTrades.filter(trade => {
      const type = (trade.modelType || '').toString().toLowerCase();
      return type.includes('rd-cont') || type.includes('rd cont');
    });
    const fvgRdTrades = filteredTrades.filter(trade => {
      const type = (trade.modelType || '').toString().toLowerCase();
      return type.includes('fvg-rd') || type.includes('fvg rd');
    });
    
    // Improved best session calculation - MODIFIED TO PRIORITIZE WIN RATE
    function calculateBestSession(modelTrades) {
      // Log sessions found
      const allSessions = modelTrades.map(t => (t.session || 'Unknown').trim() || 'Unknown');
      const uniqueSessions = [...new Set(allSessions)];
      logMessage(`Sessions found for model: ${uniqueSessions.join(', ')}`);

      // Aggregate stats per session
      const sessionStats = {};
      modelTrades.forEach(trade => {
        const session = (trade.session && trade.session.trim()) || 'Unknown';
        if (!sessionStats[session]) {
          sessionStats[session] = { name: session, totalPL: 0, trades: 0, wins: 0 };
        }
        sessionStats[session].totalPL += trade.pl;
        sessionStats[session].trades++;
        if (trade.result === 'win') sessionStats[session].wins++;
      });

      // Compute performance metrics with win rate as primary factor
      const performance = Object.values(sessionStats)
        .filter(s => s.trades >= 2) // Require at least 2 trades for statistical significance
        .map(s => {
          const winRate = s.wins / s.trades;
          const avgPL = s.totalPL / s.trades;
          return { name: s.name, trades: s.trades, winRate, avgPL, totalPL: s.totalPL };
        })
        .sort((a, b) => {
          // Primary sort: win rate (descending)
          if (b.winRate !== a.winRate) {
            return b.winRate - a.winRate;
          }
          // Secondary sort: average P/L (descending) - only as a tiebreaker
          return b.avgPL - a.avgPL;
        });

      logMessage(`Session performance for model (sorted by win rate): ${JSON.stringify(performance)}`);
      
      if (performance.length > 0) {
        const best = performance[0];
        // Format with win rate first to emphasize its importance
        return `${best.name} (WR: ${(best.winRate * 100).toFixed(0)}%, Avg: $${best.avgPL.toFixed(0)}, Trades: ${best.trades})`;
      }
      return 'No data';
    }
    
    // Determine best sessions with logging
    const rdContBest = rdContTrades.length > 0 ? calculateBestSession(rdContTrades) : 'No data';
    const fvgRdBest = fvgRdTrades.length > 0 ? calculateBestSession(fvgRdTrades) : 'No data';
    logMessage(`Best session for RD-Cont: ${rdContBest}`);
    logMessage(`Best session for FVG-RD: ${fvgRdBest}`);
    
    // Calculate other metrics
    function calcMetrics(tradesArray) {
      const wins = tradesArray.filter(t => t.result === 'win').length;
      const count = tradesArray.length;
      const totalPL = tradesArray.reduce((sum, t) => sum + t.pl, 0);
      const totalR = tradesArray.reduce((sum, t) => sum + t.rMultiple, 0);
      return {
        totalTrades: count,
        winRate: count > 0 ? wins / count : 0,
        avgPL: count > 0 ? totalPL / count : 0,
        avgR: count > 0 ? totalR / count : 0
      };
    }

    const rdContMetrics = calcMetrics(rdContTrades);
    const fvgRdMetrics = calcMetrics(fvgRdTrades);
    
    // Assemble model data
    const modelData = {
      rdCont: { ...rdContMetrics, bestSession: rdContBest },
      fvgRd: { ...fvgRdMetrics, bestSession: fvgRdBest }
    };

    // Differences
    const differences = {
      winRate: modelData.rdCont.winRate - modelData.fvgRd.winRate,
      avgPL: modelData.rdCont.avgPL - modelData.fvgRd.avgPL,
      avgR: modelData.rdCont.avgR - modelData.fvgRd.avgR,
      totalTrades: modelData.rdCont.totalTrades - modelData.fvgRd.totalTrades
    };
    
    // Package and store results
    const comparisonData = { models: modelData, differences, appliedFilters: filterSettings };
    dashboardSheet.getRange('B1').setValue("MODEL_COMPARISON_DATA");
    dashboardSheet.getRange('B2').setValue(JSON.stringify(comparisonData));
    
    logMessage("Model comparison data processed with filters");
  } catch (e) {
    logMessage("Error processing model comparison: " + e.toString());
  }
}

function processTopPerformers(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }
    
    // If no filter settings provided, use default or try to get current
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Read data with headers
    const allData = dataSheet.getDataRange().getValues();
    const headers = allData[0];
    const data = allData.slice(1).filter(row => row[0] !== ""); // Skip header, filter empty rows
    
    // Get column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const plCol = DISPLAY_CONFIG.columns.pl;
    
    // Convert to array of trade objects for easier filtering
    const tradeObjects = data.map(row => ({
      date: row[dateCol] instanceof Date ? row[dateCol] : new Date(row[dateCol]),
      setupType: (row[setupTypeCol] || '').toString(),
      result: (row[resultCol] || '').toString().toLowerCase(),
      pl: parseFloat(row[plCol] || 0)
    }));
    
    // Apply date range filter
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply result filter
    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Process the filtered trades by setup type
    const setupTypePerformance = {};
    
    filteredTrades.forEach(trade => {
      // Split setup types if needed (assuming they're separated by spaces)
      const setupTypesStr = trade.setupType.replace(/,/g, '');
      const setupTypes = setupTypesStr.split(' ').filter(type => type.trim() !== '');
      
      // Track metrics for each setup type
      setupTypes.forEach(type => {
        if (!setupTypePerformance[type]) {
          setupTypePerformance[type] = {
            setupType: type,
            totalTrades: 0,
            winningTrades: 0,
            totalPL: 0
          };
        }
        
        setupTypePerformance[type].totalTrades++;
        if (trade.result === 'win') setupTypePerformance[type].winningTrades++;
        setupTypePerformance[type].totalPL += trade.pl;
      });
    });
    
    // Calculate win rates and convert to array
    const performersData = Object.values(setupTypePerformance)
      .map(stats => ({
        ...stats,
        winRate: stats.totalTrades > 0 ? stats.winningTrades / stats.totalTrades : 0
      }))
      .sort((a, b) => b.winRate - a.winRate);
    
    // Add filter info
    const performersDataWithFilters = {
      performers: performersData,
      appliedFilters: filterSettings
    };
    
    // Store raw data
    dashboardSheet.getRange('C1').setValue("TOP_PERFORMERS_DATA");
    dashboardSheet.getRange('C2').setValue(JSON.stringify(performersData));
    
    logMessage("Top performers data processed with filters");
  } catch (e) {
    logMessage("Error processing top performers: " + e.toString());
  }
}

function calculateQualityMetrics(trades) {
  if (!trades || trades.length === 0) {
    return { overallAvg: 0, breakdown: [] };
  }

  // 1) Overall average rating
  const sum = trades.reduce((acc, t) => acc + (t.qualityRating || 0), 0);
  const overallAvg = sum / trades.length;

  // 2) Group ratings by setupType
  const byType = trades.reduce((acc, t) => {
    const key = t.setupType || "Unknown";
    acc[key] = acc[key] || [];
    acc[key].push(t.qualityRating);
    return acc;
  }, {});

  // 3) Compute per‑type counts & averages
  const breakdown = Object.entries(byType).map(([setupType, ratings]) => ({
    setupType,
    count: ratings.length,
    avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length
  }));

  return { overallAvg, breakdown };
}
function processPatternQuality(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }

    // DEBUGGING: Check if qualityRating column is defined
    logMessage(`qualityRating column index: ${DISPLAY_CONFIG.columns.qualityRating}`);
    
    // Check data in the sheet
    const sampleData = dataSheet.getRange(2, 1, 3, dataSheet.getLastColumn()).getValues();
    logMessage(`Sample data rows: ${JSON.stringify(sampleData.slice(0, 3))}`);

    // 1) Load filters
    const defaults = {
      dateRange: 'All Time',
      setupType: 'All',
      result: 'All'
    };
    filterSettings = filterSettings
      || withErrorHandling(getFilterSettings, defaults)();

    // 2) Extract & enrich in one pass
    const trades = withErrorHandling(extractTradeObjects)(dataSheet, {
      qualityRating: DISPLAY_CONFIG.columns.qualityRating
    });
    
    // NOW add debugging logs AFTER trades is defined
    logMessage(`Total trades extracted: ${trades?.length || 0}`);
    if (trades && trades.length > 0) {
      logMessage(`First few trades quality ratings: ${trades.slice(0, 3).map(t => t.qualityRating).join(', ')}`);
    }
    
    // Check for trades with quality ratings
    const qualityTradesCount = trades ? trades.filter(t => t.qualityRating > 0).length : 0;
    logMessage(`Trades with quality > 0: ${qualityTradesCount}`);
    
    if (qualityTradesCount === 0) {
      logMessage("WARNING: No trades with quality ratings > 0 found");
      // For debugging only - use all trades temporarily to see if the other processing works
      // dashboardSheet.getRange('D2')
      //   .setValue(JSON.stringify({ error: "No trades with quality ratings" }));
      // return;
    }

    if (!trades || trades.length === 0) {
      dashboardSheet.getRange('D2')
        .setValue(JSON.stringify({ error: "No trade data" }));
      logMessage("No valid trades found");
      return;
    }

    // 3) Keep only those with a positive qualityRating
    const qualityTrades = trades.filter(t => t.qualityRating > 0);
    
    // Log how many trades passed the quality filter
    logMessage(`Trades passing quality filter: ${qualityTrades.length}`);

    // 4) Apply data/time/type filters
    const filteredTrades = withErrorHandling(applyFilters)(
      qualityTrades,
      filterSettings
    );

    // after filtering but before metrics
    logMessage(`Filtered trades count: ${filteredTrades.length}`);
    logMessage(JSON.stringify(filteredTrades.slice(0, 5), null, 2));

    // 5) Compute your quality metrics
    const qualityData = withErrorHandling(calculateQualityMetrics)(
      filteredTrades
    );

    // 6) Persist results
    const result = {
      appliedFilters: filterSettings,
      data: qualityData,
      updated: new Date().toISOString()
    };
    dashboardSheet.getRange('D1').setValue("QUALITY_RATING_DATA");
    dashboardSheet.getRange('D2').setValue(JSON.stringify(result));

    logMessage("Pattern quality processed successfully");

  } catch (e) {
    logMessage(`Critical error in processPatternQuality: ${e.toString()}`);
  }
}

function processRecentTrades(filterSettings = null) {
  try {
    logMessage("Starting processRecentTrades with improved date handling");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }

    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings();
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }

    // Read all data from the Data Entry sheet
    const allData = dataSheet.getDataRange().getValues();
    const headers = allData[0];
    const dataRows = allData.slice(1).filter(row => row[0] !== ""); // Skip empty rows
    
    // Get column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const plCol = DISPLAY_CONFIG.columns.pl;

    // Process each trade with careful date handling
    logMessage(`Processing ${dataRows.length} rows from Data Entry form`);
    
    const tradeObjects = [];
    
    dataRows.forEach((row, index) => {
      // Normalize the date using our helper function
      const tradeDate = normalizeDate(row[dateCol]);
      
      // Skip rows with invalid dates
      if (!tradeDate) {
        logMessage(`Row ${index+2}: Skipping invalid date`);
        return;
      }
      
      // Create trade object
      const trade = {
        date: tradeDate,
        setupType: (row[setupTypeCol] || '').toString(),
        result: (row[resultCol] || '').toString().toLowerCase(),
        pl: parseFloat(row[plCol] || 0)
      };
      
      // Log for debugging
      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tradeDate.getDay()];
      logMessage(`Row ${index+2}: Date normalized to ${tradeDate.toISOString().substr(0, 10)} (${weekday}), P/L: ${trade.pl}`);
      
      tradeObjects.push(trade);
    });
    
    // Apply filters after all data is processed
    let filteredTrades = tradeObjects;
    
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }

    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }

    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }

    // Sort by date (newest first)
    filteredTrades.sort((a, b) => b.date - a.date);
    
    // Group trades by date for summary statistics
    const tradesByDate = {};
    
    filteredTrades.forEach(trade => {
      const dateStr = Utilities.formatDate(trade.date, "America/New_York", 'yyyy-MM-dd');
      
      if (!tradesByDate[dateStr]) {
        tradesByDate[dateStr] = {
          date: trade.date,
          trades: [],
          totalPL: 0,
          wins: 0,
          losses: 0,
          weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][trade.date.getDay()]
        };
      }
      
      tradesByDate[dateStr].trades.push(trade);
      tradesByDate[dateStr].totalPL += trade.pl;
      
      if (trade.result === 'win') {
        tradesByDate[dateStr].wins++;
      } else if (trade.result === 'loss') {
        tradesByDate[dateStr].losses++;
      }
    });
    
    // Log date grouping for verification
    Object.keys(tradesByDate).forEach(dateStr => {
      const day = tradesByDate[dateStr];
      logMessage(`Date ${dateStr} (${day.weekday}): ${day.trades.length} trades, W/L: ${day.wins}/${day.losses}, P/L: ${day.totalPL.toFixed(2)}`);
    });
    
    // Prepare final data for dashboard
    const recentTrades = filteredTrades.slice(0, 5).map(trade => ({
      date: trade.date,
      setupType: trade.setupType,
      pl: trade.pl,
      result: trade.result
    }));

    const totalTrades = recentTrades.length;
    const wins = recentTrades.filter(trade => trade.result === 'win').length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    const recentTradesData = {
      trades: recentTrades,
      summary: {
        totalTrades: totalTrades,
        winRate: winRate
      },
      appliedFilters: filterSettings,
      // Add date summary for other functions to use
      dateGroups: tradesByDate
    };

    // Store in dashboard
    dashboardSheet.getRange('E1').setValue("RECENT_TRADES_DATA");
    dashboardSheet.getRange('E2').setValue(JSON.stringify(recentTradesData));
    
    // Store trade distribution data separately for other functions
    dashboardSheet.getRange('I1').setValue("TRADE_DATE_SUMMARY");
    dashboardSheet.getRange('I2').setValue(JSON.stringify(tradesByDate));
    
    logMessage(`Recent trades processed with improved date handling: ${Object.keys(tradesByDate).length} unique dates found`);
    
    return recentTradesData;
  } catch (e) {
    logMessage("Error processing recent trades: " + e.toString());
  }
}
function processBestTradingDays(filterSettings = null) {
  try {
    logMessage("Starting processBestTradingDays");
    const nyTimezone = "America/New_York";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found for processBestTradingDays");
      return;
    }

    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings();
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings in processBestTradingDays: " + e.toString());
      }
    }

    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    logMessage(`Processing ${allData.length} rows of data in processBestTradingDays`);
    
    // Get column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const plCol = DISPLAY_CONFIG.columns.pl;
    
    // Get header row and data rows
    const headers = allData[0];
    const dataRows = allData.slice(1); // Skip header row
    
    // Process each data row using the utility function
    const tradeObjects = [];
    
    dataRows.forEach((row, index) => {
      // Skip empty rows or rows where the date column is empty
      if (!row[0] || !row[dateCol]) {
        return;
      }
      
      // Use our utility function to parse and normalize the date
      const normalizedDate = parseAndNormalizeDate(row[dateCol], index + 2, nyTimezone);
      
      // Skip if we couldn't parse the date
      if (!normalizedDate) {
        return;
      }
      
      // Create trade object with normalized date
      tradeObjects.push({
        date: normalizedDate,
        setupType: (row[setupTypeCol] || '').toString(),
        result: (row[resultCol] || '').toString().toLowerCase(),
        pl: parseFloat(row[plCol] || 0)
      });
    });
    
    logMessage(`Processed ${tradeObjects.length} valid trades in processBestTradingDays`);
    
    // Apply filters (with unchanged filter logic)
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }

    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }

    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }

    // Process weekdays with NY timezone
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const tradesByWeekday = {};
    weekdays.forEach(day => tradesByWeekday[day] = { day: day, trades: 0, wins: 0, losses: 0, totalPL: 0 });

    filteredTrades.forEach(trade => {
      // Get weekday based on date
      const weekdayName = weekdays[trade.date.getDay()];
      
      tradesByWeekday[weekdayName].trades++;
      if (trade.result === 'win') tradesByWeekday[weekdayName].wins++;
      else if (trade.result === 'loss') tradesByWeekday[weekdayName].losses++;
      tradesByWeekday[weekdayName].totalPL += trade.pl;
    });

    // Convert to array and calculate metrics
    const weekdayArray = Object.values(tradesByWeekday)
      .filter(day => day.trades > 0)
      .map(day => ({
        ...day,
        winRate: day.trades > 0 ? day.wins / day.trades : 0,
        avgPL: day.trades > 0 ? day.totalPL / day.trades : 0
      }));

    const sortedDays = weekdayArray.sort((a, b) => b.totalPL - a.totalPL);
    
    // Log results for debugging
    sortedDays.forEach(day => {
      logMessage(`${day.day}: ${day.trades} trades, Win Rate: ${(day.winRate * 100).toFixed(2)}%, Total P/L: ${day.totalPL.toFixed(2)}`);
    });
    
    // Store in dashboard
    dashboardSheet.getRange('F1').setValue("BEST_TRADING_DAYS_DATA");
    dashboardSheet.getRange('F2').setValue(JSON.stringify(sortedDays));
    
    logMessage(`Best trading days data processed: ${sortedDays.length} weekdays found`);
    
  } catch (e) {
    logMessage("Error processing best trading days: " + e.toString());
    try {
      const dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
      if (dashboardSheet) {
        dashboardSheet.getRange('F1').setValue("BEST_TRADING_DAYS_DATA");
        dashboardSheet.getRange('F2').setValue(JSON.stringify([]));
      }
    } catch (fallbackError) {
      logMessage("Failed to create fallback data structure: " + fallbackError.toString());
    }
  }
}
function processTradeDistributions(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }
    
    // If no filter settings provided, use default or try to get current
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    
    // Extract headers
    const headers = allData[0];
    
    // Use column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const entryTimeCol = DISPLAY_CONFIG.columns.entryTime;
    const exitTimeCol = DISPLAY_CONFIG.columns.exitTime;
    const plCol = DISPLAY_CONFIG.columns.pl;
    const riskCol = DISPLAY_CONFIG.columns.risk;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    
    // Skip header row
    const data = allData.slice(1);
    
    // Convert to trade objects for filtering
    const tradeObjects = data
      .filter(row => row[0]) // Skip empty rows
      .map(row => {
        // Get date from the sheet
        let tradeDate = row[dateCol];
        
        // Ensure we're dealing with a proper Date object
        if (!(tradeDate instanceof Date) || isNaN(tradeDate.getTime())) {
          tradeDate = new Date(tradeDate);
        }
        
        // Create a normalized date at noon in local time to avoid timezone issues
        const normalizedDate = new Date(
          tradeDate.getFullYear(),
          tradeDate.getMonth(), 
          tradeDate.getDate(),
          12, 0, 0, 0 // noon local time to avoid any timezone edge cases
        );
        
        return {
          date: normalizedDate,
          entryTime: row[entryTimeCol],
          exitTime: row[exitTimeCol],
          pl: parseFloat(row[plCol] || 0),
          risk: parseFloat(row[riskCol] || 0),
          setupType: (row[setupTypeCol] || '').toString(),
          result: (row[resultCol] || '').toString().toLowerCase(),
          // Calculate duration here if possible, otherwise will do later
          duration: calculateDuration(row[entryTimeCol], row[exitTimeCol])
        };
      });
    
    // Apply date range filter
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply setup type filter if not "All"
    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply result filter if not "All"
    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Extract valid data for calculations
    const durations = [];
    const profitLosses = [];
    const riskPoints = [];
    const plValues = [];
    const riskValues = [];
    
    for (const trade of filteredTrades) {
      // Only use trades with valid durations
      if (trade.duration !== null) {
        durations.push(trade.duration);
        
        if (trade.pl !== null) {
          profitLosses.push({ duration: trade.duration, value: trade.pl });
          plValues.push(trade.pl);
        }
        
        if (trade.risk !== null && trade.risk > 0) {
          riskPoints.push({ duration: trade.duration, value: trade.risk });
          riskValues.push(trade.risk);
        }
      }
    }
    
    // Calculate statistics
    function calculateStats(values) {
      if (!values || values.length === 0) {
        return { max: 0, mean: 0, median: 0 };
      }
      
      const sorted = values.slice().sort((a, b) => a - b);
      const max = sorted[sorted.length - 1];
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      
      // Calculate median
      let median;
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        median = sorted[mid];
      }
      
      return { max, mean, median };
    }
    
    // Calculate P/L per minute and Risk per minute
    function calculateRatioStats(dataPoints) {
      if (!dataPoints || dataPoints.length === 0) {
        return { max: 0, mean: 0, median: 0 };
      }
      
      // Calculate ratios (value per minute)
      const ratios = dataPoints.map(point => {
        if (point.duration === 0) return 0; // Avoid division by zero
        return point.value / point.duration;
      });
      
      return calculateStats(ratios);
    }
    
    const durationStats = calculateStats(durations);
    const plPerMinuteStats = calculateRatioStats(profitLosses);
    const riskPerMinuteStats = calculateRatioStats(riskPoints);
    const avgPlPerTradeStats = calculateStats(plValues);
    const avgRiskPerTradeStats = calculateStats(riskValues);
    
    // Prepare results object
    const distributionData = {
      duration: {
        max: Math.round(durationStats.max * 100) / 100,
        mean: Math.round(durationStats.mean * 100) / 100,
        median: Math.round(durationStats.median * 100) / 100
      },
      plPerMinute: {
        max: Math.round(plPerMinuteStats.max * 100) / 100,
        mean: Math.round(plPerMinuteStats.mean * 100) / 100,
        median: Math.round(plPerMinuteStats.median * 100) / 100
      },
      riskPerMinute: {
        max: Math.round(riskPerMinuteStats.max * 100) / 100,
        mean: Math.round(riskPerMinuteStats.mean * 100) / 100,
        median: Math.round(riskPerMinuteStats.median * 100) / 100
      },
      plPerTrade: {
        max: Math.round(avgPlPerTradeStats.max * 100) / 100,
        mean: Math.round(avgPlPerTradeStats.mean * 100) / 100,
        median: Math.round(avgPlPerTradeStats.median * 100) / 100
      },
      riskPerTrade: {
        max: Math.round(avgRiskPerTradeStats.max * 100) / 100,
        mean: Math.round(avgRiskPerTradeStats.mean * 100) / 100,
        median: Math.round(avgRiskPerTradeStats.median * 100) / 100
      },
      appliedFilters: filterSettings, // Include filter info
      tradeCounts: {
        total: filteredTrades.length,
        withDuration: durations.length
      }
    };
    
    // Store in Dashboard sheet
    dashboardSheet.getRange('I1').setValue("TRADE_DISTRIBUTIONS_DATA");
    dashboardSheet.getRange('I2').setValue(JSON.stringify(distributionData));
    
    logMessage(`Trade distributions processed with filters: ${filteredTrades.length} filtered trades`);
  } catch (e) {
    logMessage("Error processing trade distributions: " + e.toString());
  }
}
function processRiskAdjustedMetrics(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }
    
    // If no filter settings provided, use default or try to get current
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    
    // Extract headers and check for required columns
    const headers = allData[0];
    
    // Use column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const plCol = DISPLAY_CONFIG.columns.pl;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const riskCol = DISPLAY_CONFIG.columns.risk;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    
    // Create trade objects for filtering
    const tradeObjects = allData.slice(1)
      .filter(row => row[0]) // Skip empty rows
      .map(row => {
        // Get date from the sheet
        let tradeDate = row[dateCol];
        
        // Ensure we're dealing with a proper Date object
        if (!(tradeDate instanceof Date) || isNaN(tradeDate.getTime())) {
          tradeDate = new Date(tradeDate);
        }
        
        // Create a normalized date at noon in local time to avoid timezone issues
        const normalizedDate = new Date(
          tradeDate.getFullYear(),
          tradeDate.getMonth(), 
          tradeDate.getDate(),
          12, 0, 0, 0 // noon local time to avoid any timezone edge cases
        );
        
        return {
          date: normalizedDate,
          pl: parseFloat(row[plCol] || 0),
          risk: parseFloat(row[riskCol] || 0),
          isWin: isWin(row, resultCol, plCol),
          setupType: (row[setupTypeCol] || '').toString(),
          result: (row[resultCol] || '').toString().toLowerCase()
        };
      }).filter(trade => !isNaN(trade.date.getTime())); // Filter invalid dates
    
    // Apply date range filter
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply setup type filter if not "All"
    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply result filter if not "All"
    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }
    
    if (filteredTrades.length === 0) {
      logMessage("No valid trade data found after filtering");
      dashboardSheet.getRange('G1').setValue("RISK_ADJUSTED_METRICS_DATA");
      dashboardSheet.getRange('G2').setValue(JSON.stringify({
        error: "No valid trade data found with current filters",
        appliedFilters: filterSettings
      }));
      return;
    }
    
    // Sort trades by date (oldest to newest)
    filteredTrades.sort((a, b) => a.date - b.date);
    
    // Calculate basic metrics
    const returns = filteredTrades.map(trade => trade.pl);
    const wins = filteredTrades.filter(trade => trade.isWin).length;
    const losses = filteredTrades.length - wins;
    
    // Calculate profit factor
    const grossProfit = returns.filter(r => r > 0).reduce((sum, val) => sum + val, 0);
    const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((sum, val) => sum + val, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    // Calculate Sharpe Ratio (simplified)
    const meanReturn = returns.reduce((sum, val) => sum + val, 0) / filteredTrades.length;
    const variance = returns.map(r => Math.pow(r - meanReturn, 2))
                          .reduce((sum, val) => sum + val, 0) / (returns.length - 1 || 1);
    const stdDev = Math.sqrt(variance || 0);
    const sharpeRatio = stdDev === 0 ? 0 : meanReturn / stdDev;
    
    // Calculate Maximum Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let equity = 0;
    
    for (const trade of filteredTrades) {
      equity += trade.pl;
      
      if (equity > peak) {
        peak = equity;
      }
      
      if (peak > 0) {
        const drawdown = ((peak - equity) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    // Calculate average recovery periods (simplified)
    const recoveryPeriods = [];
    let inDrawdown = false;
    let drawdownStart = null;
    let drawdownPeak = 0;
    let runningEquity = 0;
    
    for (let i = 0; i < filteredTrades.length; i++) {
      runningEquity += filteredTrades[i].pl;
      
      if (!inDrawdown && runningEquity < drawdownPeak) {
        // Start of drawdown
        inDrawdown = true;
        drawdownStart = filteredTrades[i].date;
      } else if (inDrawdown && runningEquity >= drawdownPeak) {
        // End of drawdown, calculate recovery period
        const endDate = filteredTrades[i].date;
        const days = Math.round((endDate - drawdownStart) / (1000 * 60 * 60 * 24));
        
        if (days > 0) {
          recoveryPeriods.push(days);
        }
        
        inDrawdown = false;
      }
      
      if (runningEquity > drawdownPeak) {
        drawdownPeak = runningEquity;
      }
    }
    
    // Calculate expectancy (average R-multiple)
    const validRMultiples = filteredTrades.filter(t => t.risk > 0)
                               .map(t => t.pl / t.risk);
    const expectancy = validRMultiples.length > 0 ?
                     validRMultiples.reduce((sum, r) => sum + r, 0) / validRMultiples.length :
                     0;
    
    // Prepare results object
    const metrics = {
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      maxDrawdownPct: parseFloat((maxDrawdown / 100).toFixed(4)), // Convert to decimal
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      avgRecoveryDays: recoveryPeriods.length > 0 ? 
                     parseFloat((recoveryPeriods.reduce((sum, days) => sum + days, 0) / 
                               recoveryPeriods.length).toFixed(1)) :
                     0,
      winRate: filteredTrades.length > 0 ? parseFloat((wins / filteredTrades.length).toFixed(3)) : 0,
      totalTrades: filteredTrades.length,
      totalPL: parseFloat(returns.reduce((sum, r) => sum + r, 0).toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      appliedFilters: filterSettings // Include filter info
    };
    
    // Store in Dashboard sheet
    dashboardSheet.getRange('G1').setValue("RISK_ADJUSTED_METRICS_DATA");
    dashboardSheet.getRange('G2').setValue(JSON.stringify(metrics));
    
    logMessage(`Risk-adjusted metrics processed with filters: ${filteredTrades.length} trades`);
  } catch (e) {
    logMessage("Error processing risk-adjusted metrics: " + e.toString());
  }
}
function processPsychologicalMetrics(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dataSheet || !dashboardSheet) {
      logMessage("Required sheets not found");
      return;
    }
    
    // If no filter settings provided, use default or try to get current
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    
    // Use column indices from config
    const dateCol = DISPLAY_CONFIG.columns.date;
    const plCol = DISPLAY_CONFIG.columns.pl;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const positionSizeCol = DISPLAY_CONFIG.columns.positionSize;
    const timeOfDayCol = DISPLAY_CONFIG.columns.entryTime;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    
    // Create trade objects for filtering
    const tradeObjects = allData.slice(1)
      .filter(row => row[0]) // Skip empty rows
      .map(row => {
        const hour = timeOfDayCol !== -1 ? extractHour(row[timeOfDayCol]) : null;
        
        // Get date from the sheet
        let tradeDate = row[dateCol];
        
        // Ensure we're dealing with a proper Date object
        if (!(tradeDate instanceof Date) || isNaN(tradeDate.getTime())) {
          tradeDate = new Date(tradeDate);
        }
        
        // Create a normalized date at noon in local time to avoid timezone issues
        const normalizedDate = new Date(
          tradeDate.getFullYear(),
          tradeDate.getMonth(), 
          tradeDate.getDate(),
          12, 0, 0, 0 // noon local time to avoid any timezone edge cases
        );
        
        return {
          date: normalizedDate,
          pl: parseFloat(row[plCol] || 0),
          isWin: isWin(row, resultCol, plCol),
          result: (row[resultCol] || '').toString().toLowerCase(),
          positionSize: positionSizeCol !== -1 ? parseFloat(row[positionSizeCol] || 1) : 1,
          hour: hour,
          setupType: (row[setupTypeCol] || '').toString()
        };
      })
      .filter(trade => !isNaN(trade.date.getTime())); // Filter invalid dates
    
    // Apply date range filter
    let filteredTrades = tradeObjects;
    if (filterSettings.dateRange !== 'All Time') {
      filteredTrades = filterTradesByDateRange(filteredTrades, filterSettings.dateRange);
      logMessage(`Applied date filter: ${filterSettings.dateRange}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply setup type filter if not "All"
    if (filterSettings.setupType !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.setupType.includes(filterSettings.setupType)
      );
      logMessage(`Applied setup type filter: ${filterSettings.setupType}, trades remaining: ${filteredTrades.length}`);
    }
    
    // Apply result filter if not "All"
    if (filterSettings.result !== 'All') {
      filteredTrades = filteredTrades.filter(trade => 
        trade.result === filterSettings.result.toLowerCase()
      );
      logMessage(`Applied result filter: ${filterSettings.result}, trades remaining: ${filteredTrades.length}`);
    }
    
    if (filteredTrades.length === 0) {
      logMessage("No valid trade data found after filtering");
      dashboardSheet.getRange('H1').setValue("PSYCHOLOGICAL_METRICS_DATA");
      dashboardSheet.getRange('H2').setValue(JSON.stringify({
        error: "No valid trade data found with current filters",
        appliedFilters: filterSettings
      }));
      return;
    }
    
    // Sort trades by date (oldest to newest)
    filteredTrades.sort((a, b) => a.date - b.date);
    
    // 1. Consecutive Win/Loss Analysis
    const streakAnalysis = {
      afterWin: { trades: 0, wins: 0, totalPL: 0 },
      afterLoss: { trades: 0, wins: 0, totalPL: 0 },
      afterTwoWins: { trades: 0, wins: 0, totalPL: 0 },
      afterTwoLosses: { trades: 0, wins: 0, totalPL: 0 }
    };
    
    // Calculate win/loss streak performance
    for (let i = 1; i < filteredTrades.length; i++) {
      // After single win/loss
      if (filteredTrades[i-1].isWin) {
        streakAnalysis.afterWin.trades++;
        if (filteredTrades[i].isWin) streakAnalysis.afterWin.wins++;
        streakAnalysis.afterWin.totalPL += filteredTrades[i].pl;
      } else {
        streakAnalysis.afterLoss.trades++;
        if (filteredTrades[i].isWin) streakAnalysis.afterLoss.wins++;
        streakAnalysis.afterLoss.totalPL += filteredTrades[i].pl;
      }
      
      // Need at least 3 trades to check after two consecutive wins/losses
      if (i >= 2) {
        // After two consecutive wins
        if (filteredTrades[i-2].isWin && filteredTrades[i-1].isWin) {
          streakAnalysis.afterTwoWins.trades++;
          if (filteredTrades[i].isWin) streakAnalysis.afterTwoWins.wins++;
          streakAnalysis.afterTwoWins.totalPL += filteredTrades[i].pl;
        }
        
        // After two consecutive losses
        if (!filteredTrades[i-2].isWin && !filteredTrades[i-1].isWin) {
          streakAnalysis.afterTwoLosses.trades++;
          if (filteredTrades[i].isWin) streakAnalysis.afterTwoLosses.wins++;
          streakAnalysis.afterTwoLosses.totalPL += filteredTrades[i].pl;
        }
      }
    }
    
    // Calculate win rates and average P/L
    const calculateRates = (data) => {
      return {
        winRate: data.trades > 0 ? data.wins / data.trades : 0,
        avgPL: data.trades > 0 ? data.totalPL / data.trades : 0,
        trades: data.trades
      };
    };
    
    const streakPerformance = {
      afterWin: calculateRates(streakAnalysis.afterWin),
      afterLoss: calculateRates(streakAnalysis.afterLoss),
      afterTwoWins: calculateRates(streakAnalysis.afterTwoWins),
      afterTwoLosses: calculateRates(streakAnalysis.afterTwoLosses)
    };
    
    // 2. Position Size Effect Analysis
    const sizeGroups = {};
    
    for (const trade of filteredTrades) {
      const size = Math.floor(trade.positionSize); // Group by integer size
      
      if (!sizeGroups[size]) {
        sizeGroups[size] = { trades: 0, wins: 0, totalPL: 0 };
      }
      
      sizeGroups[size].trades++;
      if (trade.isWin) sizeGroups[size].wins++;
      sizeGroups[size].totalPL += trade.pl;
    }
    
    const sizePerformance = [];
    
    for (const size in sizeGroups) {
      if (sizeGroups.hasOwnProperty(size) && sizeGroups[size].trades > 0) {
        sizePerformance.push({
          size: parseInt(size, 10),
          winRate: sizeGroups[size].wins / sizeGroups[size].trades,
          avgPL: sizeGroups[size].totalPL / sizeGroups[size].trades,
          trades: sizeGroups[size].trades
        });
      }
    }
    
    // Sort by position size
    sizePerformance.sort((a, b) => a.size - b.size);
    
    // 3. Time of Day Performance Analysis
    const hourGroups = {};
    
    for (const trade of filteredTrades) {
      if (trade.hour === null) continue;
      
      const hour = trade.hour;
      
      if (!hourGroups[hour]) {
        hourGroups[hour] = { trades: 0, wins: 0, totalPL: 0 };
      }
      
      hourGroups[hour].trades++;
      if (trade.isWin) hourGroups[hour].wins++;
      hourGroups[hour].totalPL += trade.pl;
    }
    
    const timeOfDayPerformance = [];
    
    for (const hour in hourGroups) {
      if (hourGroups.hasOwnProperty(hour) && hourGroups[hour].trades > 0) {
        timeOfDayPerformance.push({
          hour: parseInt(hour, 10),
          winRate: hourGroups[hour].wins / hourGroups[hour].trades,
          avgPL: hourGroups[hour].totalPL / hourGroups[hour].trades,
          trades: hourGroups[hour].trades
        });
      }
    }
    
    // Sort by hour of day
    timeOfDayPerformance.sort((a, b) => a.hour - b.hour);
    
    // 4. Overtrading Analysis (trades per day performance)
    // Group trades by date
    const tradesByDate = {};
    
    for (const trade of filteredTrades) {
      // Use a consistent date format that respects local time
      const dateStr = `${trade.date.getFullYear()}-${String(trade.date.getMonth() + 1).padStart(2, '0')}-${String(trade.date.getDate()).padStart(2, '0')}`;
      
      if (!tradesByDate[dateStr]) {
        tradesByDate[dateStr] = { count: 0, totalPL: 0, wins: 0 };
      }
      
      tradesByDate[dateStr].count++;
      tradesByDate[dateStr].totalPL += trade.pl;
      if (trade.isWin) tradesByDate[dateStr].wins++;
    }
    
    // Group performance by number of trades per day
    const tradingDayGroups = {};
    
    for (const dateStr in tradesByDate) {
      const count = tradesByDate[dateStr].count;
      
      if (!tradingDayGroups[count]) {
        tradingDayGroups[count] = { days: 0, totalPL: 0, wins: 0, trades: 0 };
      }
      
      tradingDayGroups[count].days++;
      tradingDayGroups[count].totalPL += tradesByDate[dateStr].totalPL;
      tradingDayGroups[count].wins += tradesByDate[dateStr].wins;
      tradingDayGroups[count].trades += tradesByDate[dateStr].count;
    }
    
    const overtradingAnalysis = [];
    
    for (const count in tradingDayGroups) {
      if (tradingDayGroups.hasOwnProperty(count) && tradingDayGroups[count].days > 0) {
        overtradingAnalysis.push({
          tradesPerDay: parseInt(count, 10),
          avgPLPerDay: tradingDayGroups[count].totalPL / tradingDayGroups[count].days,
          winRate: tradingDayGroups[count].wins / tradingDayGroups[count].trades,
          days: tradingDayGroups[count].days
        });
      }
    }
    
    // Sort by trades per day
    overtradingAnalysis.sort((a, b) => a.tradesPerDay - b.tradesPerDay);
    
    // Prepare final object with all psychological metrics
    const psychMetrics = {
      streakPerformance: streakPerformance,
      sizePerformance: sizePerformance,
      timeOfDayPerformance: timeOfDayPerformance,
      overtradingAnalysis: overtradingAnalysis,
      appliedFilters: filterSettings // Include filter info
    };
    
    // Store in Dashboard sheet
    dashboardSheet.getRange('H1').setValue("PSYCHOLOGICAL_METRICS_DATA");
    dashboardSheet.getRange('H2').setValue(JSON.stringify(psychMetrics));
    
    logMessage(`Psychological metrics processed with filters: ${filteredTrades.length} trades analyzed`);
  } catch (e) {
    logMessage("Error processing psychological metrics: " + e.toString());
  }
}


function processAllDashboardData(filterSettings = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dashboard);
    
    if (!dashboardSheet) {
      createDashboardSheet();
      return;
    }
    
    // Get filter settings
    if (!filterSettings) {
      try {
        filterSettings = getFilterSettings(); // Get current filter settings
      } catch (e) {
        filterSettings = { dateRange: 'All Time', setupType: 'All', result: 'All' };
        logMessage("Using default filter settings: " + e.toString());
      }
    }
    
    // Clear existing data
    dashboardSheet.clear();
    
    // Store filter settings in dashboard for reference
    dashboardSheet.getRange('Z1').setValue("FILTER_SETTINGS");
    dashboardSheet.getRange('Z2').setValue(JSON.stringify(filterSettings));
    
    // Process recent trades first to ensure date grouping is available
    logMessage("Processing recent trades data first to establish date groups");
    processRecentTrades(filterSettings);
    
    // Process each other data section with the improved date handling
    processPerformanceSummary(filterSettings);
    processModelComparison(filterSettings);
    processTopPerformers(filterSettings);
    processPatternQuality(filterSettings);
    processBestTradingDays(filterSettings);
    processTradeDistributions(filterSettings);
    processRiskAdjustedMetrics(filterSettings);
    processPsychologicalMetrics(filterSettings);
    
    // Use safeUiAlert if available, otherwise fallback to traditional alert
    if (typeof safeUiAlert === 'function') {
      safeUiAlert('Success', 'All dashboard data processed successfully!');
    } else {
      // Only show UI alert if called from UI context
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert('All dashboard data processed successfully!');
      } catch (uiError) {
        // This is expected when run as a background process
        logMessage("Script completed successfully but UI alert couldn't be displayed");
      }
    }
  } catch (e) {
    logMessage("Error processing dashboard data: " + e.toString());
    
    if (typeof safeUiAlert === 'function') {
      safeUiAlert('Error', "Error: " + e.toString());
    } else {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert("Error: " + e.toString());
      } catch (uiError) {
        // This is expected when run as a background process
        logMessage("Failed to show error alert");
      }
    }
  }
}
function createDashboardSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet(DISPLAY_CONFIG.sheets.dashboard);
  processAllDashboardData();
}

function prepareTradingDataForCorrelation() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    if (!dataSheet) return [];
    
    // Log to verify column indices
    logMessage("Preparing correlation data with direct quality ratings from Data Entry Form");
    logMessage(`Quality Rating column index: ${DISPLAY_CONFIG.columns.qualityRating}`);
    
    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    const headers = allData[0];
    const data = allData.slice(1).filter(row => row[0] !== ""); // Skip header, filter empty rows
    
    // Define needed column indices
    const dateCol = DISPLAY_CONFIG.columns.date;
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    const resultCol = DISPLAY_CONFIG.columns.result;
    const plCol = DISPLAY_CONFIG.columns.pl;
    const rMultipleCol = DISPLAY_CONFIG.columns.rMultiple;
    const riskCol = DISPLAY_CONFIG.columns.risk;
    const entryTimeCol = DISPLAY_CONFIG.columns.entryTime;
    const exitTimeCol = DISPLAY_CONFIG.columns.exitTime;
    const qualityRatingCol = DISPLAY_CONFIG.columns.qualityRating;
    
    // Log the actual column name for quality rating
    if (headers && qualityRatingCol !== undefined) {
      logMessage(`Quality Rating column name: ${headers[qualityRatingCol]}`);
      // Log a sample of quality rating values for debugging
      const sampleValues = data.slice(0, 5).map(row => row[qualityRatingCol]);
      logMessage(`Sample quality rating values: ${JSON.stringify(sampleValues)}`);
    }
    
    // Convert to normalized trade objects for correlation
    const tradeObjects = data.map((row, index) => {
      // Basic calculations
      const duration = calculateDuration(row[entryTimeCol], row[exitTimeCol]);
      const timeOfDay = extractHour(row[entryTimeCol]);
      const isWin = (row[resultCol] || '').toString().toLowerCase() === 'win' ? 1 : 0;
      
      // Get pattern quality rating directly from data entry form - ensure it's a number
      let qualityRating = 0;
      if (qualityRatingCol !== undefined && row[qualityRatingCol] !== undefined) {
        // Explicitly convert to number and handle empty/non-numeric values
        const rawValue = row[qualityRatingCol];
        if (typeof rawValue === 'number') {
          qualityRating = rawValue;
        } else if (rawValue && typeof rawValue === 'string') {
          // Try to parse string to number
          const parsed = parseFloat(rawValue);
          if (!isNaN(parsed)) {
            qualityRating = parsed;
          }
        }
      }
      
      // Update streak data based on previous trades
      let afterWin = 0;
      
      // Only calculate these values if we have previous trade data
      if (index > 0) {
        // Get previous trade result
        const prevTradeWin = (data[index-1][resultCol] || '').toString().toLowerCase() === 'win' ? 1 : 0;
        afterWin = prevTradeWin; // 1 if previous trade was a win, 0 otherwise
      }
      
      // Build the trade object
      const tradeObj = {
        plValue: parseFloat(row[plCol] || 0),
        riskValue: parseFloat(row[riskCol] || 0),
        rMultiple: parseFloat(row[rMultipleCol] || 0),
        duration: duration || 0,
        timeOfDay: timeOfDay || 0,
        isWin: isWin,
        qualityRating: qualityRating,
        afterWin: afterWin,
        date: row[dateCol] instanceof Date ? row[dateCol] : new Date(row[dateCol])
      };
      
      // For debugging, log more detailed information about the first few trades
      if (index < 3) {
        logMessage(`Trade ${index}: PL=${tradeObj.plValue}, Win=${tradeObj.isWin}, ` +
                  `Quality=${tradeObj.qualityRating} (raw: ${row[qualityRatingCol]}), ` +
                  `AfterWin=${tradeObj.afterWin}`);
      }
      
      return tradeObj;
    }).filter(trade => !isNaN(trade.date.getTime())); // Filter invalid dates
    
    // Additional logging to check quality ratings
    const qualityRatingsCount = tradeObjects.filter(t => t.qualityRating > 0).length;
    logMessage(`Found ${qualityRatingsCount} trades with quality ratings > 0 out of ${tradeObjects.length} total trades`);
    
    return tradeObjects;
  } catch (e) {
    logMessage(`Error preparing data for correlation: ${e.toString()}`);
    return [];
  }
}


function calculateCorrelation(x, y) {
  try {
    // Ensure arrays are the same length
    if (!x || !y || x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    // Convert all values to numbers and filter out any NaN values
    const validPairs = [];
    for (let i = 0; i < x.length; i++) {
      const xVal = Number(x[i]);
      const yVal = Number(y[i]);
      if (!isNaN(xVal) && !isNaN(yVal)) {
        validPairs.push([xVal, yVal]);
      }
    }
    
    // If no valid pairs, return 0
    if (validPairs.length === 0) {
      return 0;
    }
    
    // Extract x and y values from valid pairs
    const validX = validPairs.map(pair => pair[0]);
    const validY = validPairs.map(pair => pair[1]);
    
    // Calculate means
    const xMean = validX.reduce((sum, val) => sum + val, 0) / validX.length;
    const yMean = validY.reduce((sum, val) => sum + val, 0) / validY.length;
    
    // Calculate correlation coefficient
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < validX.length; i++) {
      const xDiff = validX[i] - xMean;
      const yDiff = validY[i] - yMean;
      
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    // Guard against division by zero
    if (xDenominator === 0 || yDenominator === 0) {
      return 0;
    }
    
    // Calculate and return correlation
    return numerator / (Math.sqrt(xDenominator) * Math.sqrt(yDenominator));
  } catch (e) {
    Logger.log("Error calculating correlation: " + e.toString());
    return 0;
  }
}