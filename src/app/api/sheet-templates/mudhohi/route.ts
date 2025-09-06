/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { google } from "googleapis"

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
})

export async function POST(request: Request) {
  try {
    const { templateType } = await request.json()

    if (templateType !== "googlesheets") {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 })
    }

    // Initialize Google Sheets and Drive APIs
    const sheets = google.sheets({ version: "v4", auth: auth })
    const drive = google.drive({ version: "v3", auth: auth })

    // Create a new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Template Data Mudhohi - ${new Date().toLocaleDateString("id-ID")}`,
        },
        sheets: [
          {
            properties: {
              title: "Data Mudhohi",
              gridProperties: {
                rowCount: 100,
                columnCount: 15,
              },
            },
          },
        ],
      },
    })

    const spreadsheetId = createResponse.data.spreadsheetId

    if (!spreadsheetId) {
      throw new Error("Failed to create spreadsheet")
    }

    // Define headers and sample data
    const headers = [
      "Nama Pengqurban",
      "Nama Peruntukan",
      "Alamat",
      "Jenis Hewan",
      "Jumlah Hewan",
      "Cara Bayar",
      "Status Pembayaran",
      "Kode Dash",
      "Tanggal",
      "Potong Sendiri",
      "Ambil Daging",
      "Sudah Ambil Daging",
      "Pesan Khusus",
      "Keterangan",
      "Barcode Image",
    ]

    const sampleData = [
      [
        "Ahmad Fauzi",
        "Keluarga Ahmad",
        "Jl. Merdeka No. 123",
        "sapi",
        "1",
        "transfer",
        "lunas",
        "DASH001",
        "2024-01-15",
        "tidak",
        "ya",
        "tidak",
        "Untuk keluarga",
        "Qurban tahun ini",
        "",
      ],
      [
        "Siti Aminah",
        "Almarhum Bapak",
        "Jl. Sudirman No. 456",
        "kambing",
        "2",
        "tunai",
        "lunas",
        "DASH002",
        "2024-01-15",
        "ya",
        "tidak",
        "tidak",
        "Untuk arwah bapak",
        "",
        "",
      ],
      [
        "Budi Santoso",
        "Keluarga Besar",
        "Jl. Gatot Subroto No. 789",
        "sapi",
        "1",
        "transfer",
        "menunggu",
        "DASH003",
        "2024-01-16",
        "tidak",
        "ya",
        "tidak",
        "",
        "Qurban bersama",
        "",
      ],
    ]

    // Add headers and sample data to the spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Data Mudhohi!A1:O1",
      valueInputOption: "RAW",
      requestBody: {
        values: [headers],
      },
    })

    // Add sample data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Data Mudhohi!A2:O4",
      valueInputOption: "RAW",
      requestBody: {
        values: sampleData,
      },
    })

    // Format the spreadsheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 15,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.6,
                    blue: 0.9,
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0,
                    },
                    bold: true,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 15,
              },
            },
          },
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    })

    // Add instructions sheet
    const instructionsSheet = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Petunjuk Penggunaan",
                gridProperties: {
                  rowCount: 50,
                  columnCount: 10,
                },
              },
            },
          },
        ],
      },
    })

    // Add instructions content
    const instructions = [
      ["PETUNJUK PENGGUNAAN TEMPLATE DATA MUDHOHI"],
      [""],
      ["1. CARA MENGISI DATA:"],
      ["   - Isi data pada sheet 'Data Mudhohi'"],
      ["   - Jangan mengubah header (baris pertama)"],
      ["   - Hapus data contoh dan isi dengan data sebenarnya"],
      [""],
      ["2. FORMAT DATA:"],
      ["   - Nama Pengqurban: Nama lengkap pengqurban (WAJIB)"],
      ["   - Nama Peruntukan: Nama yang akan digunakan untuk qurban (opsional)"],
      ["   - Alamat: Alamat lengkap (opsional)"],
      ["   - Jenis Hewan: 'sapi' atau 'kambing' (WAJIB)"],
      ["   - Jumlah Hewan: Angka (minimal 1) (WAJIB)"],
      ["   - Cara Bayar: 'tunai' atau 'transfer' (WAJIB)"],
      ["   - Status Pembayaran: 'belum', 'menunggu', 'lunas', atau 'batal' (WAJIB)"],
      ["   - Kode Dash: Kode unik untuk identifikasi (WAJIB)"],
      ["   - Tanggal: Format YYYY-MM-DD (contoh: 2024-01-15)"],
      ["   - Potong Sendiri: 'ya' atau 'tidak'"],
      ["   - Ambil Daging: 'ya' atau 'tidak'"],
      ["   - Sudah Ambil Daging: 'ya' atau 'tidak'"],
      ["   - Pesan Khusus: Pesan tambahan (opsional)"],
      ["   - Keterangan: Keterangan tambahan (opsional)"],
      ["   - Barcode Image: URL gambar barcode (opsional)"],
      [""],
      ["3. CARA IMPORT:"],
      ["   - Setelah mengisi data, copy semua data (Ctrl+A, Ctrl+C)"],
      ["   - Buka aplikasi web mudhohi"],
      ["   - Klik tombol 'Paste dari Spreadsheet'"],
      ["   - Atau paste langsung ke tabel (Ctrl+V)"],
      [""],
      ["4. TIPS:"],
      ["   - Pastikan tidak ada baris kosong di tengah data"],
      ["   - Gunakan format yang konsisten"],
      ["   - Periksa kembali data sebelum import"],
      [""],
      ["Jika ada pertanyaan, hubungi administrator sistem."],
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Petunjuk Penggunaan!A1:A35",
      valueInputOption: "RAW",
      requestBody: {
        values: instructions,
      },
    })

    // Format instructions sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Format title
          {
            repeatCell: {
              range: {
                sheetId: instructionsSheet.data.replies?.[0]?.addSheet?.properties?.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    fontSize: 14,
                  },
                },
              },
              fields: "userEnteredFormat.textFormat",
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: instructionsSheet.data.replies?.[0]?.addSheet?.properties?.sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 10,
              },
            },
          },
        ],
      },
    })

    // Make the spreadsheet publicly viewable
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "anyone",
      },
    })

    const templateUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

    return NextResponse.json({
      success: true,
      templateUrl,
      spreadsheetId,
      message: "Template Google Sheets berhasil dibuat",
    })
  } catch (error: any) {
    console.error("Error creating Google Sheets template:", error)
    return NextResponse.json({ error: error.message || "Failed to create Google Sheets template" }, { status: 500 })
  }
}
