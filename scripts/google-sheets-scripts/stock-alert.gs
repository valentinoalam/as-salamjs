function checkStockAndEmail() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock");
  const data = sheet.getRange("A2:B").getValues();
  let message = "";

  data.forEach(row => {
    const [item, qty] = row;
    if (qty !== "" && qty < 5) {
      message += `${item} is low (${qty} units)\n`;
    }
  });

  if (message) {
    MailApp.sendEmail("client@example.com", "Stock Alert", message);
  }
}