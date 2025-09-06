import os
import win32com.client

folder = r"E:\ExcelFiles"

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False

for file in os.listdir(folder):
    if file.endswith(".xlsx"):
        wb = excel.Workbooks.Open(os.path.join(folder, file))
        wb.ExportAsFixedFormat(0, os.path.join(folder, file.replace(".xlsx", ".pdf")))
        wb.Close()

excel.Quit()