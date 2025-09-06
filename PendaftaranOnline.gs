function doPost(e) {
  // Buka sheet
  let sheetUrl = "YOUR_SHEET_URL";
  let file = SpreadsheetApp.openByUrl(sheetUrl);
  let sheet = file.getSheetByName("Sheet1");

  // Rapikan data
  let req = JSON.stringify(e).replace(/\\/g, "").replace("}\"", "}").replace("\"{", "{");
  let reqJson = JSON.parse(req);
  let senderMessage = JSON.stringify(reqJson["postData"]["contents"]["senderMessage"]);

  // Mengurai isi pesan
  let parsedMessage = senderMessage.split("#");
  // ['"daftar', 'afin', '17/08/1945', 'Indonesia']
  let nama = parsedMessage[1].trim();
  let tanggalLahir = parsedMessage[2].trim();
  let alamat = parsedMessage[3].trim().slice(0, -1);

  // Membuat ID
  let row = sheet.getLastRow() + 1;
  let prefixIdPendaftar = 220000;
  let idPendaftar = `A-${prefixIdPendaftar + row - 1}`;

  // Insert data
  sheet.getRange(`A${row}`).setValue(idPendaftar);
  sheet.getRange(`B${row}`).setValue(nama);
  sheet.getRange(`C${row}`).setValue(tanggalLahir);
  sheet.getRange(`D${row}`).setValue(alamat);

  // Respon
  let response = {
    data: [
      {
        message: `Terima kasih, ananda ${nama} berhasil terdaftar dengan ID ${idPendaftar}.`
      }
    ]
  };

  return ContentService.createTextOutput(JSON.stringify(response));
}