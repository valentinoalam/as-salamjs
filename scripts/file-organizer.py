import os, shutil
from datetime import datetime

folder = r"E:\Target\Files"

for file in os.listdir(folder):
    path = os.path.join(folder, file)
    if os.path.isfile(path):
        dt = datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d')
        dest_folder = os.path.join(folder, dt)
        os.makedirs(dest_folder, exist_ok=True)
        shutil.move(path, os.path.join(dest_folder, file))