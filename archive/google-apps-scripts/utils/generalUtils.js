// Utility functions
function logMessage(message) {
  const now = new Date();
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  Logger.log(`[${timestamp}] ${message}`);
}
function safeUiAlert(title, message, logOnly = false) {
  // Always log the message
  logMessage(`ALERT: ${title} - ${message}`);
  
  // Don't attempt UI if log-only mode is enabled
  if (logOnly) return;
  
  // Try to show a UI alert, but catch the error if in background context
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    // Just ignore the error - we've already logged the message
    logMessage("UI Alert failed: " + e.toString());
  }
}
function normalizeDate(dateValue) {
  // Early exit for empty or falsy values
  if (!dateValue) {
    Logger.log('normalizeDate: Received empty or null value -> returning null');
    return null;
  }

  try {
    const originalValue = dateValue;
    const typeTag = Object.prototype.toString.call(dateValue);
    Logger.log(`normalizeDate: Received value = ${originalValue} | type = ${typeTag}`);

    // Parse into a Date object if necessary
    let inputDate;
    if (dateValue instanceof Date) {
      inputDate = dateValue;
      Logger.log('normalizeDate: Input is a Date object');
    } else if (typeof dateValue === 'string') {
      inputDate = new Date(dateValue);
      Logger.log(`normalizeDate: Parsed string to Date: ${inputDate.toString()}`);
    } else {
      Logger.log(`normalizeDate: Unsupported data type -> ${typeTag} -> returning null`);
      return null;
    }

    // Check for invalid dates
    if (!(inputDate instanceof Date) || isNaN(inputDate.getTime())) {
      Logger.log(`normalizeDate: Invalid date detected (${inputDate}) -> returning null`);
      return null;
    }

    // Extract displayed components
    const year = inputDate.getFullYear();
    const month = inputDate.getMonth();    // zero-based month
    const day = inputDate.getDate();
    Logger.log(`normalizeDate: Extracted Y/M/D = ${year}/${month + 1}/${day}`);

    // Create normalized noon date
    const normalizedDate = new Date(year, month, day, 12, 0, 0);
    Logger.log(`normalizeDate: Normalized to noon -> ${normalizedDate.toString()}`);

    // Capture and log call stack for context
    const stack = (new Error()).stack;
    Logger.log(`normalizeDate: Call stack:\n${stack}`);

    return normalizedDate;
  } catch (err) {
    Logger.log(`normalizeDate: Exception thrown -> ${err.toString()}`);
    return null;
  }
}
function parseAndNormalizeDate(dateValue, rowIndex = null, timezone = "America/New_York") {
  const rowInfo = rowIndex ? `Row ${rowIndex}: ` : '';
  let parsedDate = null;
  
  // Skip empty values
  if (!dateValue) {
    logMessage(`${rowInfo}Empty date value`);
    return null;
  }
  
  // Skip header-like values
  if (typeof dateValue === 'string' && 
      (dateValue.toLowerCase() === 'date' || 
       dateValue.toLowerCase().includes('date'))) {
    logMessage(`${rowInfo}Skipping header text "${dateValue}"`);
    return null;
  }
  
  try {
    // Log the original value for debugging
    logMessage(`${rowInfo}Original displayed date: "${dateValue}"`);
    
    // Handle different date formats
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      // Valid Date object
      parsedDate = dateValue;
      logMessage(`${rowInfo}Using valid Date object: ${parsedDate}`);
    } else if (typeof dateValue === 'string') {
      // Try to parse string date
      // First check for YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        parsedDate = new Date(dateValue + 'T12:00:00'); // Noon to avoid timezone issues
        logMessage(`${rowInfo}Parsed from YYYY-MM-DD: ${parsedDate}`);
      } 
      // Check for MM/DD/YYYY format
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
        const parts = dateValue.split('/');
        parsedDate = new Date(parts[2], parts[0] - 1, parts[1], 12, 0, 0);
        logMessage(`${rowInfo}Parsed from MM/DD/YYYY: ${parsedDate}`);
      }
      // Try to parse date strings like "March 15, 2025"
      else if (/[a-zA-Z]+\s+\d{1,2},\s+\d{4}/.test(dateValue)) {
        parsedDate = new Date(dateValue);
        logMessage(`${rowInfo}Parsed from Month Day, Year format: ${parsedDate}`);
      }
      // Fall back to standard date parsing
      else {
        parsedDate = new Date(dateValue);
        logMessage(`${rowInfo}Failed to parse displayed date, using original: ${dateValue}`);
      }
    } else if (typeof dateValue === 'number') {
      // Excel serial date number
      parsedDate = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
      logMessage(`${rowInfo}Converted from Excel serial date: ${parsedDate}`);
    }
    
    // Verify we have a valid date
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      logMessage(`${rowInfo}Skipping: Could not parse date from ${dateValue}`);
      return null;
    }
    
    // Create normalized date at noon in the specified timezone to avoid timezone issues
    const dateStr = Utilities.formatDate(parsedDate, timezone, 'yyyy-MM-dd');
    const normalizedDate = new Date(dateStr + 'T12:00:00');
    
    // Get weekday name for debugging
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[normalizedDate.getDay()];
    logMessage(`${rowInfo}Using weekday ${weekdayName} for date ${normalizedDate}`);
    
    return normalizedDate;
  } catch (e) {
    logMessage(`${rowInfo}Error parsing date: ${e.toString()}`);
    return null;
  }
}
function calculateDuration(entryTime, exitTime) {
  try {
    // If both times are dates
    if (entryTime instanceof Date && exitTime instanceof Date) {
      if (isNaN(entryTime.getTime()) || isNaN(exitTime.getTime())) return null;
      return (exitTime - entryTime) / (1000 * 60); // Convert ms to minutes
    }
    
    // Handle time string format (e.g., "9:30" or "09:30:00")
    if (typeof entryTime === 'string' && typeof exitTime === 'string') {
      entryTime = entryTime.trim();
      exitTime = exitTime.trim();
      
      if (entryTime.includes(':') && exitTime.includes(':')) {
        const entryParts = entryTime.split(':');
        const exitParts = exitTime.split(':');
        
        const entryHours = Number(entryParts[0]);
        const entryMinutes = Number(entryParts[1]);
        const exitHours = Number(exitParts[0]);
        const exitMinutes = Number(exitParts[1]);
        
        if (isNaN(entryHours) || isNaN(entryMinutes) || isNaN(exitHours) || isNaN(exitMinutes)) {
          return null;
        }
        
        // Calculate minutes between times
        const entryTotalMinutes = entryHours * 60 + entryMinutes;
        const exitTotalMinutes = exitHours * 60 + exitMinutes;
        
        return exitTotalMinutes - entryTotalMinutes;
      }
    }
    
    // Handle decimal hours (e.g., 9.5 for 9:30)
    if (typeof entryTime === 'number' && typeof exitTime === 'number') {
      return (exitTime - entryTime) * 60; // Convert hours to minutes
    }
    
    return null;
  } catch (e) {
    return null;
  }
}
function extractHour(timeValue) {
  if (timeValue instanceof Date) {
    return timeValue.getHours();
  } else if (typeof timeValue === 'string' && timeValue.includes(':')) {
    // Format like "9:30" or "14:45"
    return parseInt(timeValue.split(':')[0], 10);
  } else if (typeof timeValue === 'number') {
    // Decimal hour format like 9.5 for 9:30
    return Math.floor(timeValue);
  }
  return null;
}
function isWin(row, resultCol, plCol) {
  if (resultCol !== -1 && row[resultCol] !== undefined) {
    const resultStr = String(row[resultCol]).toLowerCase().trim();
    if (resultStr.includes('win')) return true;
    if (resultStr.includes('loss')) return false;
  }
  
  // If no explicit result, use P/L value
  return parseFloat(row[plCol] || 0) > 0;
}
function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
function getRecentDateByWeekday(fromDate, weekday) {
  const result = new Date(fromDate);
  const currentDay = fromDate.getDay();
  
  // Calculate difference between current day and target weekday
  let diff = currentDay - weekday;
  if (diff < 0) diff += 7; // Handle wrap around
  
  // Subtract difference to get most recent occurrence
  result.setDate(fromDate.getDate() - diff);
  
  return result;
}
function getUniqueSetupTypes() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(DISPLAY_CONFIG.sheets.dataEntry);
    
    if (!dataSheet) return [];
    
    // Use column index from config
    const setupTypeCol = DISPLAY_CONFIG.columns.setupType;
    
    // Get all data from the column
    const dataRange = dataSheet.getRange(2, setupTypeCol + 1, dataSheet.getLastRow() - 1, 1);
    const setupTypeData = dataRange.getValues();
    
    // Flatten, split, and get unique values
    const setupTypes = new Set();
    
    setupTypeData.forEach(row => {
      if (!row[0]) return;
      
      // Split by space and comma
      const types = row[0].toString().replace(/,/g, ' ').split(' ');
      
      types.forEach(type => {
        if (type && type.trim() !== '') {
          setupTypes.add(type.trim());
        }
      });
    });
    
    // Convert Set to Array and sort
    return Array.from(setupTypes).sort();
  } catch (e) {
    Logger.log("Error getting unique setup types: " + e.toString());
    return [];
  }
}

// New utility function to replace redundant code
function extractTradeObjects(dataSheet, columnOverrides = {}) {
  try {
    // Get all data including headers
    const allData = dataSheet.getDataRange().getValues();
    const headers = allData[0];
    
    // Improved filtering of data rows to remove headers
    const data = allData.slice(1).filter(row => {
      // Skip completely empty rows
      if (row[0] === "") return false;
      
      // Skip rows that look like headers (containing column names)
      if (row[0] === "Date" || 
          (row[1] === "Model Type") ||
          (row[2] === "Session (Time Block)")) {
        logMessage(`Skipping header row: ${row[0]}, ${row[1]}, ${row[2]}`);
        return false;
      }
      
      return true;
    });
    
    // Merge default columns with overrides for flexibility
    const cols = {...DISPLAY_CONFIG.columns, ...columnOverrides};
    
    // Log column indices for debugging
    logMessage(`Extracting trades with columns: ${JSON.stringify(cols)}`);
    
    // If session column is provided, log the header name
    if (cols.session !== undefined) {
      const sessionColLetter = columnToLetter(cols.session + 1); // Convert to 1-based column letter
      logMessage(`Using session data from column ${sessionColLetter} (${headers[cols.session] || 'unnamed column'})`);
    }
    
    // Convert each row to a trade object
    const trades = data.map((row, index) => {
      try {
        // Date handling with fallbacks
        let tradeDate = normalizeDate(row[cols.date]);
        if (!tradeDate) {
          logMessage(`Warning: Invalid date at row ${index+2}, defaulting to today`);
          tradeDate = new Date(); // Fallback to today's date
        }
        
        // Build basic trade object with properties that exist in all trades
        const trade = {
          date: tradeDate,
          setupType: String(row[cols.setupType] || ''),
          result: String(row[cols.result] || '').toLowerCase(),
          pl: parseFloat(row[cols.pl] || 0),
          rMultiple: parseFloat(row[cols.rMultiple] || 0),
          risk: parseFloat(row[cols.risk] || 0)
        };
        
        // Add conditional properties from overrides
        if (cols.modelType !== undefined) {
          trade.modelType = String(row[cols.modelType] || '');
        }
        
        // Special handling for session with detailed debugging
        if (cols.session !== undefined) {
          const rawSessionValue = row[cols.session];
          // Convert to string, handle null/undefined, and trim whitespace
          trade.session = rawSessionValue !== null && rawSessionValue !== undefined 
                         ? String(rawSessionValue).trim() 
                         : '';
          
          // Log first few rows to diagnose session values
          if (index < 5) {
            logMessage(`Row ${index+2} session value: "${rawSessionValue}" → "${trade.session}"`);
          }
        }
        
        if (cols.qualityRating !== undefined) {
          // Convert quality rating to number with proper handling of empty values
          const rawValue = row[cols.qualityRating];
          trade.qualityRating = typeof rawValue === 'number' 
                              ? rawValue 
                              : parseFloat(rawValue || 0);
        }
        
        if (cols.positionSize !== undefined) {
          trade.positionSize = parseFloat(row[cols.positionSize] || 1);
        }
        
        if (cols.entryTime !== undefined && cols.exitTime !== undefined) {
          // Calculate duration if both times exist
          trade.duration = calculateDuration(row[cols.entryTime], row[cols.exitTime]) || 0;
          
          // Also store the hour for time-of-day analysis
          if (cols.entryTime !== undefined) {
            trade.timeOfDay = extractHour(row[cols.entryTime]) || 0;
          }
        }
        
        return trade;
      } catch (rowError) {
        // If a specific row fails, log it but continue processing others
        logMessage(`Error processing row ${index+2}: ${rowError.toString()}`);
        return null;
      }
    })
    .filter(trade => trade !== null && !isNaN(trade.date?.getTime()));
    
    // Log trade extraction results
    logMessage(`Extracted ${trades.length} valid trades from ${data.length} data rows`);
    
    // Debug session data specifically
    if (cols.session !== undefined) {
      const sessionValues = trades.map(t => t.session).filter(s => s);
      const uniqueSessions = [...new Set(sessionValues)];
      logMessage(`Found ${sessionValues.length} trades with sessions, unique values: ${uniqueSessions.join(', ')}`);
    }
    
    // Debug other properties if present
    if (cols.qualityRating !== undefined) {
      const qualityRatings = trades.map(t => t.qualityRating).filter(r => r > 0);
      logMessage(`Found ${qualityRatings.length} trades with quality ratings > 0`);
    }
    
    if (cols.modelType !== undefined) {
      const modelTypes = [...new Set(trades.map(t => t.modelType).filter(m => m))];
      logMessage(`Found model types: ${modelTypes.join(', ')}`);
    }
    
    return trades;
  } catch (e) {
    logMessage(`Error in extractTradeObjects: ${e.toString()}`);
    return [];
  }
}
function applyFilters(trades, filterSettings) {
  let filteredTrades = [...trades];
  
  // Apply date range filter
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
  
  return filteredTrades;
}
function withErrorHandling(fn, fallbackValue = null) {
  return function(...args) {
    try {
      return fn(...args);
    } catch (e) {
      const fnName = fn.name || "anonymous function";
      logMessage(`Error in ${fnName}: ${e.toString()}`);
      return fallbackValue;
    }
  };
}

// Usage:
const safeProcessPerformanceSummary = withErrorHandling(processPerformanceSummary);