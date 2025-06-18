/**
 * Unified date utilities for consistent date handling throughout the application
 */

/**
 * Normalizes a date value to noon in the specified timezone to avoid timezone issues
 * @param {Date|string|number} dateValue - The date value to normalize
 * @param {string} [timezone="America/New_York"] - The timezone to use
 * @param {string} [debugContext=""] - Optional context for debugging
 * @return {Date|null} Normalized date or null if invalid
 */
function normalizeDate(dateValue, timezone = "America/New_York", debugContext = "") {
    if (!dateValue) {
      logMessage(`${debugContext}normalizeDate: Received empty or null value`);
      return null;
    }
    
    try {
      // Log the input value and type for debugging
      const inputType = Array.isArray(dateValue) ? 'array' : typeof dateValue;
      logMessage(`${debugContext}normalizeDate: Processing value (${inputType}): ${dateValue}`);
      
      // Convert to Date object if necessary
      let dateObj;
      if (dateValue instanceof Date) {
        dateObj = new Date(dateValue.getTime());
        logMessage(`${debugContext}normalizeDate: Input is a Date object: ${dateObj}`);
      } else if (typeof dateValue === 'string') {
        // Try different string formats
        if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          // ISO format (YYYY-MM-DD)
          dateObj = new Date(dateValue + 'T12:00:00');
          logMessage(`${debugContext}normalizeDate: Parsed ISO format string: ${dateObj}`);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateValue)) {
          // MM/DD/YYYY format
          const parts = dateValue.split('/');
          dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
          logMessage(`${debugContext}normalizeDate: Parsed MM/DD/YYYY format: ${dateObj}`);
        } else {
          // Try standard parsing
          dateObj = new Date(dateValue);
          logMessage(`${debugContext}normalizeDate: Used standard date parsing: ${dateObj}`);
        }
      } else if (typeof dateValue === 'number') {
        // Excel serial date number
        dateObj = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        logMessage(`${debugContext}normalizeDate: Converted from Excel serial number: ${dateObj}`);
      } else {
        logMessage(`${debugContext}normalizeDate: Unsupported data type: ${inputType}`);
        return null;
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        logMessage(`${debugContext}normalizeDate: Invalid date: ${dateObj}`);
        return null;
      }
      
      // Create normalized date at noon in the local timezone
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      
      const normalizedDate = new Date(year, month, day, 12, 0, 0);
      logMessage(`${debugContext}normalizeDate: Normalized to noon: ${normalizedDate}`);
      
      return normalizedDate;
    } catch (e) {
      logMessage(`${debugContext}normalizeDate: Error: ${e.toString()}`);
      return null;
    }
  }
  
  /**
   * Compares two dates for equality (ignoring time component)
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @return {boolean} True if dates are equal
   */
  function datesAreEqual(date1, date2) {
    if (!(date1 instanceof Date) || !(date2 instanceof Date)) return false;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
  
  /**
   * Formats a date to string using the specified format and timezone
   * @param {Date} date - The date to format
   * @param {string} [format="yyyy-MM-dd"] - The format string
   * @param {string} [timezone="America/New_York"] - The timezone to use
   * @return {string} Formatted date string
   */
  function formatDate(date, format = "yyyy-MM-dd", timezone = "America/New_York") {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return Utilities.formatDate(date, timezone, format);
  }
  
  /**
   * Parses a date string to Date object with robust error handling
   * @param {string|Date} dateValue - The date string or object to parse
   * @param {number} [rowIndex=null] - Optional row index for error logging
   * @param {string} [timezone="America/New_York"] - The timezone to use
   * @return {Date|null} Parsed date or null if invalid
   */
  function parseDate(dateValue, rowIndex = null, timezone = "America/New_York") {
    const rowInfo = rowIndex ? `Row ${rowIndex}: ` : '';
    
    // Skip empty values
    if (!dateValue) {
      logMessage(`${rowInfo}parseDate: Empty date value`);
      return null;
    }
    
    // If already a Date object, just normalize it
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        logMessage(`${rowInfo}parseDate: Invalid Date object`);
        return null;
      }
      return normalizeDate(dateValue, timezone, rowInfo);
    }
    
    // Skip header-like values
    if (typeof dateValue === 'string' && 
        (dateValue.toLowerCase() === 'date' || 
         dateValue.toLowerCase().includes('date'))) {
      logMessage(`${rowInfo}parseDate: Skipping header text "${dateValue}"`);
      return null;
    }
    
    try {
      // Log the original value for debugging
      logMessage(`${rowInfo}parseDate: Processing value: ${dateValue}`);
      
      let parsedDate = null;
      
      if (typeof dateValue === 'string') {
        // Try different string formats
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          // ISO format (YYYY-MM-DD)
          parsedDate = new Date(dateValue + 'T12:00:00');
          logMessage(`${rowInfo}parseDate: Parsed ISO format string: ${parsedDate}`);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
          // MM/DD/YYYY format
          const parts = dateValue.split('/');
          parsedDate = new Date(parts[2], parts[0] - 1, parts[1], 12, 0, 0);
          logMessage(`${rowInfo}parseDate: Parsed MM/DD/YYYY format: ${parsedDate}`);
        } else if (/[a-zA-Z]+\s+\d{1,2},\s+\d{4}/.test(dateValue)) {
          // Month name format (e.g., "January 15, 2023")
          parsedDate = new Date(dateValue);
          logMessage(`${rowInfo}parseDate: Parsed month name format: ${parsedDate}`);
        } else {
          // Try standard date parsing
          parsedDate = new Date(dateValue);
          logMessage(`${rowInfo}parseDate: Used standard parsing: ${parsedDate}`);
        }
      } else if (typeof dateValue === 'number') {
        // Excel serial date number
        parsedDate = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        logMessage(`${rowInfo}parseDate: Converted from Excel serial number: ${parsedDate}`);
      }
      
      // Verify date is valid
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        logMessage(`${rowInfo}parseDate: Invalid date result: ${parsedDate}`);
        return null;
      }
      
      // Create normalized date at noon in the specified timezone 
      const dateStr = formatDate(parsedDate, "yyyy-MM-dd", timezone);
      const normalizedDate = new Date(`${dateStr}T12:00:00`);
      
      logMessage(`${rowInfo}parseDate: Normalized date: ${normalizedDate}`);
      return normalizedDate;
    } catch (e) {
      logMessage(`${rowInfo}parseDate: Error: ${e.toString()}`);
      return null;
    }
  }
  
  /**
   * Calculates duration between two time values in minutes
   * @param {Date|string|number} entryTime - Start time
   * @param {Date|string|number} exitTime - End time
   * @return {number|null} Duration in minutes or null if invalid input
   */
  function calculateDuration(entryTime, exitTime) {
    try {
      // Handle Date objects
      if (entryTime instanceof Date && exitTime instanceof Date) {
        if (isNaN(entryTime.getTime()) || isNaN(exitTime.getTime())) return null;
        return (exitTime - entryTime) / (1000 * 60); // Convert ms to minutes
      }
      
      // Handle time strings (e.g., "9:30" or "09:30:00")
      if (typeof entryTime === 'string' && typeof exitTime === 'string') {
        entryTime = entryTime.trim();
        exitTime = exitTime.trim();
        
        if (entryTime.includes(':') && exitTime.includes(':')) {
          const entryParts = entryTime.split(':');
          const exitParts = exitTime.split(':');
          
          const entryHours = parseInt(entryParts[0], 10);
          const entryMinutes = parseInt(entryParts[1], 10);
          const exitHours = parseInt(exitParts[0], 10);
          const exitMinutes = parseInt(exitParts[1], 10);
          
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
      logMessage(`calculateDuration: Error: ${e.toString()}`);
      return null;
    }
  }
  
  /**
   * Extracts the hour component from various time formats
   * @param {Date|string|number} timeValue - The time value
   * @return {number|null} Hour (0-23) or null if invalid
   */
  function extractHour(timeValue) {
    try {
      if (timeValue instanceof Date) {
        if (isNaN(timeValue.getTime())) return null;
        return timeValue.getHours();
      } else if (typeof timeValue === 'string' && timeValue.includes(':')) {
        // Format like "9:30" or "14:45"
        const hour = parseInt(timeValue.split(':')[0], 10);
        return isNaN(hour) ? null : hour;
      } else if (typeof timeValue === 'number') {
        // Decimal hour format like 9.5 for 9:30
        const hour = Math.floor(timeValue);
        return isNaN(hour) ? null : hour;
      }
      return null;
    } catch (e) {
      logMessage(`extractHour: Error: ${e.toString()}`);
      return null;
    }
  }
  
  /**
   * Gets the most recent occurrence of a specified weekday
   * @param {Date} fromDate - Reference date
   * @param {number} weekday - Day of week (0=Sunday, 1=Monday, etc.)
   * @return {Date} Date of most recent specified weekday
   */
  function getRecentDateByWeekday(fromDate, weekday) {
    if (!(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
      fromDate = new Date(); // Default to today
    }
    
    const result = new Date(fromDate);
    const currentDay = fromDate.getDay();
    
    // Calculate difference between current day and target weekday
    let diff = currentDay - weekday;
    if (diff < 0) diff += 7; // Handle wrap around
    
    // Subtract difference to get most recent occurrence
    result.setDate(fromDate.getDate() - diff);
    
    return result;
  }

/**
 * Date formatting and manipulation utilities
 */

function parseDate(str, tz) {
  // Robust date parsing logic here
}

function formatDate(date, format, tz) {
  // Formatting logic here
}

module.exports = { parseDate, formatDate };