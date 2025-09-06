function clearOldRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = data.length - 1; i >= 1; i--) {
    let date = new Date(data[i][0]);
    if ((now - date) / (1000 * 3600 * 24) > 30) {
      sheet.deleteRow(i + 1);
    }
  }
}