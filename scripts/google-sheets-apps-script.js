/**
 * Google Apps Script for Tech OA Question Bank Sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. In top menu, click: Extensions > Apps Script.
 * 3. Delete any existing code and paste this entire script.
 * 4. Click 'Deploy' > 'New deployment'.
 * 5. Click the gear icon next to 'Select type' and choose 'Web app'.
 * 6. Set:
 *    - Description: "Tech OA Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Click 'Deploy', authorize permissions if asked, and copy the Web App URL.
 * 8. Paste the Web App URL into the "Google Sheets" settings modal in your web app.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Ensure header row exists
    ensureHeaders(sheet);

    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'No payload received' });
    }

    var payload = JSON.parse(e.postData.contents);

    // Ping check
    if (payload.action === 'ping') {
      return responseJSON({ status: 'success', message: 'Connection successful' });
    }

    // Batch sync
    if (payload.action === 'batch' && Array.isArray(payload.items)) {
      payload.items.forEach(function(item) {
        upsertProblem(sheet, item);
      });
      return responseJSON({ status: 'success', count: payload.items.length });
    }

    // Single item sync
    upsertProblem(sheet, payload);
    return responseJSON({ status: 'success', message: 'Problem updated' });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return responseJSON({ status: 'success', message: 'Google Apps Script Webhook is active.' });
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = ['Problem Title', 'Problem Link', 'Date', 'Status', 'Date Solved', 'Comments'];
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#1e293b');
    range.setFontColor('#f8fafc');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function upsertProblem(sheet, data) {
  var title = data.title || '';
  var link = data.link || '';
  var date = data.date || '';
  var status = data.status || 'Solved';
  var dateSolved = data.dateSolved || new Date().toISOString().split('T')[0];
  var comments = data.comments || '';

  var lastRow = sheet.getLastRow();
  var existingRow = -1;

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      var rowTitle = values[i][0];
      var rowLink = values[i][1];
      if ((link && rowLink === link) || (title && rowTitle === title)) {
        existingRow = i + 2; // offset for 1-based index and header row
        break;
      }
    }
  }

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, 6).setValues([[title, link, date, status, dateSolved, comments]]);
  } else {
    sheet.appendRow([title, link, date, status, dateSolved, comments]);
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
