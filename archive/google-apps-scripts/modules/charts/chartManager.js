// This script is designed to manage the finalized dashboard in Google Sheets.
  // Function to display the sidebar
  function showChartSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('ChartSidebar')
        .setTitle('Trading Charts Gallery')
        .setWidth(300);
    
    SpreadsheetApp.getUi().showSidebar(html);
  }
  
  // Function to get information about the currently selected row
  function getSelectedRowInfo() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const activeRange = sheet.getActiveRange();
    
    // Only proceed if a single row is selected and it's not the header row
    if (!activeRange || activeRange.getRow() < 2) {
      return null;
    }
    
    const row = activeRange.getRow();
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Get relevant trade information
    // Using DISPLAY_CONFIG from your existing config
    const tradeDate = rowData[DISPLAY_CONFIG.columns.date]; // Date
    const entryPrice = rowData[1] || "N/A"; // Entry Price (assuming column B)
    const exitPrice = rowData[2] || "N/A"; // Exit Price (assuming column C)
    const setupType = rowData[DISPLAY_CONFIG.columns.setupType] || "N/A"; // Setup Type
    const result = rowData[DISPLAY_CONFIG.columns.result] || "N/A"; // Result
    
    // Format the date for display
    let formattedDate = "N/A";
    if (tradeDate instanceof Date) {
      formattedDate = Utilities.formatDate(tradeDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    
    return {
      row: row,
      date: formattedDate,
      entry: entryPrice,
      exit: exitPrice,
      setupType: setupType,
      result: result
    };
  }
  
  // In TradingChartsSidebar.gs, add this new function
  function getChartImage(fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      // Get the image content as base64
      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      const contentType = blob.getContentType();
      
      // Return as data URL for direct embedding
      return `data:${contentType};base64,${base64}`;
    } catch (e) {
      Logger.log("Error getting chart image: " + e.toString());
      return null;
    }
  }

  // Update the getChartsForTrade function
  function getChartsForTrade(rowNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const tradeDate = sheet.getRange(rowNumber, 1).getValue();
    
    if (!(tradeDate instanceof Date)) {
      return [];
    }
    
    const formattedDate = Utilities.formatDate(tradeDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // Search for charts in the dedicated folder
    const folder = getOrCreateChartFolder();
    
    // Look for files that match the trade date in the name
    const searchPattern = `Trade-${formattedDate}`;
    const files = folder.searchFiles(`title contains '${searchPattern}'`);
    
    const charts = [];
    while (files.hasNext()) {
      const file = files.next();
      
      charts.push({
        id: file.getId(),
        name: file.getName(),
        date: formattedDate,
        // We'll load the actual image data separately to avoid timeout issues
        needsImageData: true
      });
    }
    
    return charts;
  }
  
  // Function to create or get the folder for storing chart images
  function getOrCreateChartFolder() {
    const folderName = "Trading Charts";
    
    // Check if the folder already exists
    const folderIterator = DriveApp.getFoldersByName(folderName);
    if (folderIterator.hasNext()) {
      return folderIterator.next();
    }
    
    // Create a new folder if it doesn't exist
    return DriveApp.createFolder(folderName);
  }
  
  // Function to upload a chart for the selected row
  function uploadSelectedRowChart(base64Data, fileName) {
    const rowInfo = getSelectedRowInfo();
    if (!rowInfo) {
      throw new Error("No row selected");
    }
    
    // Get the date of the trade
    const tradeDate = rowInfo.date;
    
    // Create a unique name for the chart including trade date
    const chartName = `Trade-${tradeDate}-${fileName}`;
    
    // Convert base64 to blob
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', chartName);
    
    // Save to Drive
    const folder = getOrCreateChartFolder();
    const file = folder.createFile(blob);
    
    return {
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl()
    };
  }
  
 // Function to open a chart in the browser with proper permissions
  function openChartInBrowser(fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      // Use the web view URL which opens the file in a new tab
      const webViewUrl = file.getUrl();
      
      // Return a URL that the client side can open
      return webViewUrl;
    } catch (e) {
      Logger.log("Error opening chart: " + e.toString());
      return null;
    }
  }
  
  // Function to delete a chart
  function deleteChart(fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      return true;
    } catch (e) {
      Logger.log("Error deleting chart: " + e.toString());
      return false;
    }
  }
  
  // Function to upload a new chart from the UI button
  function uploadChartForSelectedRow() {
    const rowInfo = getSelectedRowInfo();
    if (!rowInfo) {
      SpreadsheetApp.getUi().alert("Please select a row first");
      return;
    }
    
    const html = HtmlService.createHtmlOutput(
      `<style>
        body {
          font-family: Arial, sans-serif;
          padding: 15px;
        }
        .header {
          margin-bottom: 15px;
        }
        .buttons {
          margin-top: 15px;
        }
        button {
          background-color: #4285f4;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
      <div class="header">
        <h3>Upload Chart for Trade on ${rowInfo.date}</h3>
        <p>Select an image file to upload as a chart for this trade.</p>
      </div>
      <form id="uploadForm">
        <input type="file" id="chartFile" accept="image/*" required>
        <div class="buttons">
          <button type="submit">Upload</button>
        </div>
      </form>
      <script>
        document.getElementById('uploadForm').addEventListener('submit', function(e) {
          e.preventDefault();
          const fileInput = document.getElementById('chartFile');
          const file = fileInput.files[0];
          if (!file) {
            alert('Please select a file');
            return;
          }
          
          const reader = new FileReader();
          reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1];
            google.script.run
              .withSuccessHandler(function(result) {
                alert('Chart uploaded successfully!');
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                alert('Error uploading chart: ' + error);
              })
              .uploadSelectedRowChart(base64Data, file.name);
          };
          reader.readAsDataURL(file);
        });
      </script>`
    )
    .setWidth(400)
    .setHeight(250);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Upload Chart');
  }