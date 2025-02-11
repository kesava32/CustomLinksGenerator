// Function to call getAccountApps, getLinkDomains, and setupAccountDetails sequentially
function generateLinks() {
  deleteAllTriggers();  // Ensure all existing triggers are deleted
  setupDynamicHeaders();
  addOnEditTrigger();  // Add the onEdit trigger
}

// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//

// Function to delete all triggers
function deleteAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
}

// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//

// Function to ensure the onEdit trigger is only added once
function addOnEditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var triggerExists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'onEdit' && trigger.getEventType() === ScriptApp.EventType.ON_EDIT;
  });

  if (!triggerExists) {
    ScriptApp.newTrigger('onEdit')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onEdit()
      .create();
  }
}

// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//


// Function to add headers dynamically based on checkbox selections and add static headers
function setupDynamicHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Links Generator");
  const headerRow = 14;
  const startColumn = 1; // Column A

  const headers = [
      { checkbox: "A4", header: "Campaign Name" },
      { checkbox: "A5", header: "Campaign ID" },
      { checkbox: "A6", header: "Sub Campaign Name" },
      { checkbox: "A7", header: "Sub Campaign ID" },
      { checkbox: "A8", header: "Creative Name" },
      { checkbox: "A9", header: "Creative ID" },
      { checkbox: "A10", header: "Publisher ID" },
      { checkbox: "A11", header: "Publisher Site Name" },
      { checkbox: "C4", header: "Deep Link (Android & iOS)" },
      { checkbox: "C5", header: "Deferred Deep Link (Android & iOS)" },
      { checkbox: "C6", header: "Global Redirect" },
      { checkbox: "C7", header: "Fallback Redirect Web" },
      { checkbox: "C8", header: "Deep Link (Android)" },
      { checkbox: "C9", header: "Deferred Deep Link (Android)" },
      { checkbox: "C10", header: "Deep Link (iOS)" },
      { checkbox: "C11", header: "Deferred Deep Link (iOS)" },
      { checkbox: "E4", header: "Publisher Site ID" },
      { checkbox: "E5", header: "Keyword" },
      { checkbox: "E6", header: "Affiliate Name" },
      { checkbox: "E7", header: "Affiliate ID" },
      { checkbox: "E8", header: "Android Redirect (App Not installed)" },
      { checkbox: "E9", header: "iOS Redirect (App Not installed)" },
      { checkbox: "E10", header: "Pass through" },
      { checkbox: "E11", header: "Force Redirect iOS" }
  ];

  const staticHeaders = ["Long Link", "QR Code URL"];

  // Initialize the column index for headers
  let columnIndex = startColumn;

  // Clear the entire header row and data columns below
  sheet.getRange(headerRow, startColumn, 1, sheet.getMaxColumns() - startColumn + 1).clearContent().clearFormat();
  sheet.getRange(headerRow + 1, startColumn, sheet.getMaxRows() - headerRow, sheet.getMaxColumns() - startColumn + 1).clearContent();

  // Iterate over the headers array and set headers based on checkbox selections
  headers.forEach(headerObj => {
    const checkboxValue = sheet.getRange(headerObj.checkbox).getValue();
    if (checkboxValue) {
      // Set the header in row 7
      const headerCell = sheet.getRange(headerRow, columnIndex);
      headerCell.setValue(headerObj.header);
      // Apply formatting for dynamic headers
      headerCell.setBackground("#cfe2f3").setFontColor("#000000").setFontWeight("bold");
      // Apply alignment and text wrap
      headerCell.setHorizontalAlignment("center").setVerticalAlignment("middle").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
      columnIndex++;
    }
  });

  // Add static headers after the dynamic headers
  staticHeaders.forEach(staticHeader => {
    const staticHeaderCell = sheet.getRange(headerRow, columnIndex);
    staticHeaderCell.setValue(staticHeader);
    // Apply formatting for static headers
    staticHeaderCell.setBackground("#d9d2e9").setFontColor("#000000").setFontWeight("bold");
    // Apply alignment and text wrap
    staticHeaderCell.setHorizontalAlignment("center").setVerticalAlignment("middle").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    columnIndex++;
  });
}

// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//

// Function to handle changes in checkboxes and adjust headers dynamically
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const headerRow = 14;
  const startColumn = 1; // Column A

  // Check if the edited range is within the checkboxes
  if (sheet.getName() === "Links Generator") {
    const headers = [
      "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11"
    ];
    if (headers.includes(range.getA1Notation())) {
      // Clear the column data if the checkbox is deselected
      if (!range.getValue()) {
        const headerIndex = headers.indexOf(range.getA1Notation());
        const columnToClear = startColumn + headerIndex;
        sheet.getRange(headerRow, columnToClear).clearContent().clearFormat(); // Clear the header and its formatting
        sheet.getRange(headerRow + 1, columnToClear, sheet.getMaxRows() - headerRow, 1).clearContent(); // Clear the column data
      }
      
      // Re-setup the dynamic headers based on the changed checkboxes
      setupDynamicHeaders();
    }
  }
}

// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//

function updateURLs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const urlCell = sheet.getRange('E1');
  let baseURL = urlCell.getValue().trim();

  if (!baseURL) {
    SpreadsheetApp.getUi().alert('Please provide a base URL in cell E1.');
    return;
  }

  // Separate base URL and parameters
  let [base, baseParamsString] = baseURL.split('?');
  let baseParams = parseQueryString(baseParamsString || '');
  baseURL = cleanURL(base);

  const headerRow = sheet.getRange(14, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRange = sheet.getRange(15, 1, sheet.getLastRow() - 14, sheet.getLastColumn());
  const data = dataRange.getValues();

  const headerToParam = {
    "Campaign Name": "pcn",
    "Campaign ID": "pcid",
    "Sub Campaign Name": "pscn",
    "Sub Campaign ID": "pscid",
    "Creative Name": "pcrn",
    "Creative ID": "pcrid",
    "Publisher ID": "pshid",
    "Publisher Site Name": "psn",
    "Deep Link (Android & iOS)": "_dl",
    "Deferred Deep Link (Android & iOS)": "_ddl",
    "Global Redirect": "_global_redirect",
    "Fallback Redirect Web": "_fallback_redirect",
    "Deep Link (Android)": "_android_dl",
    "Deferred Deep Link (Android)": "_android_ddl",
    "Deep Link (iOS)": "_ios_dl",
    "Deferred Deep Link (iOS)": "_ios_ddl",
    "Publisher Site ID": "psid",
    "Keyword": "kw",
    "Affiliate Name": "paffn",
    "Affiliate ID": "paffid",
    "Android Redirect (App Not installed)": "_android_redirect",
    "iOS Redirect (App Not installed)": "_ios_redirect",
    "Pass through": "_p",
    "Force Redirect iOS": "_force_redirect"
  };

  const longLinkColIndex = headerRow.indexOf("Long Link") + 1;

  if (longLinkColIndex === 0) {
    SpreadsheetApp.getUi().alert('No "Long Link" header found in row 14.');
    return;
  }

  data.forEach((row, rowIndex) => {
    let params = { ...baseParams };

    // Update parameters from the sheet
    headerRow.forEach((header, colIndex) => {
      if (headerToParam[header] && row[colIndex]) {
        const param = headerToParam[header];
        const value = row[colIndex].toString();

        // Only encode if not already encoded
        params[param] = isEncoded(value) ? value : encodeURIComponent(value);
      }
    });

    // Rebuild the URL with dynamic parameters taking precedence over base parameters
    const finalURL = buildURL(base, params);

    // Set the final modified URL back into the sheet
    sheet.getRange(15 + rowIndex, longLinkColIndex).setValue(finalURL);
  });
}

// Function to clean and validate the base URL
function cleanURL(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url.split('?')[0]; // Return only the base URL
}

// Function to parse a query string into an object
function parseQueryString(queryString) {
  const params = {};
  if (!queryString) return params;

  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

// Function to check if a value is already encoded
function isEncoded(value) {
  return decodeURIComponent(value) !== value;
}

// Function to build a query string from an object
function buildURL(base, params) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${params[key]}`) // Assume values are already encoded
    .join('&');
  
  return base + (queryString ? '?' + queryString : '');
}










// ---------------------------------------------------------------------------------------//
// ---------------------------------------------------------------------------------------//



function generateQRCodeURLs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Links Generator");
  var lastRow = sheet.getLastRow();
  var headerRow = 14;

  // Get the size from a specific cell, e.g., cell A1
  var sizeInput = sheet.getRange("H13").getValue();
  
  // Validate the size input
  var size = (sizeInput >= 100 && sizeInput <= 1000) ? sizeInput : 250;

  // Find the column index of "Long Link" in row 7
  var headerRowValues = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var longLinkColumnIndex = headerRowValues.indexOf("Long Link") + 1; // Add 1 because indexOf is 0-based

  if (longLinkColumnIndex === 0) {
    Logger.log('Column "Long Link" not found.');
    return;
  }

  // Determine the output column index (third column after "Long Link")
  var outputColumnIndex = longLinkColumnIndex + 1;

  // Loop through each row, starting from the row below the header
  for (var i = headerRow + 1; i <= lastRow; i++) {
    var link = sheet.getRange(i, longLinkColumnIndex).getValue();
    
    if (link) {
      // Generate QR code URL using goqr.me API with the specified size
      var qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(link);
      
      // Place the QR code URL into the output column
      sheet.getRange(i, outputColumnIndex).setValue(qrCodeUrl);
    }
  }
}




