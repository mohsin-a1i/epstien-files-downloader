from rich.progress import Progress
from pathlib import Path
import json
import re
import fitz

class IndexManager:
  def __init__(self, set: int):
    self.index_path = Path(f"../index/INDEX{set}.json")
    self.directory_path = Path(f"../VOL{set:05d}")

    try:
      index = json.loads(self.index_path.read_text(encoding="utf-8"))
      self.deserialize_index(index)
    except FileNotFoundError:
      print(f"{self.index_path} not found. Creating new index")
      self.create_index()

    self.sync_local_files()

  def save(self):
    self.index_path.parent.mkdir(parents=True, exist_ok=True)
    j = json.dumps(self.serialize_index(), separators=(",", ":"))
    self.index_path.write_text(j, encoding="utf-8")

      
  def create_index(self):
    self.local_files = {}
    self.local_corrupted_files = set()

    self.server_files = set()
    self.server_corrupted_files = set()

  def deserialize_index(self, index):
    self.local_files = { int(k): v for k, v in index["local"]["files"].items() }
    self.local_corrupted_files = set(index["local"]["corruptedFiles"])

    self.server_files = set(index["server"]["files"])
    self.server_corrupted_files = set(index["server"]["corruptedFiles"])

  def serialize_index(self):
    return {
        "local": {
            "files": self.local_files,
            "corruptedFiles": list(self.local_corrupted_files),
        },
        "server": {
            "files": list(self.server_files),
            "corruptedFiles": list(self.server_corrupted_files),
        },
    }
      
  def sync_local_files(self):
    local_files = set()
    for file_name in self.directory_path.iterdir():
      file_number = self.get_file_number(file_name.name)
      if (file_number): local_files.add(file_number)

    for file_number in self.local_files:
      if file_number not in local_files: del self.local_files[file_number]

    for file_number in self.local_corrupted_files:
      if file_number not in local_files: self.local_corrupted_files.remove(file_number)

    discovered_local_files = []
    for file_number in local_files:
      if (file_number not in self.local_files or self.local_files[file_number] < 0) and file_number not in self.local_corrupted_files:
        discovered_local_files.append(file_number)

    if len(discovered_local_files) > 0:
      with Progress() as progress:
        task = progress.add_task(f"[cyan]Indexing {self.directory_path.name}", total=len(discovered_local_files))

        for file_number in discovered_local_files:
          try:
            with fitz.open(self.get_file_path(file_number)) as pdf:
              self.local_files[file_number] = pdf.page_count
          except:
            self.local_corrupted_files.add(file_number)

          progress.update(task, advance=1)

  def get_file_number(self, file_name): 
    pattern = re.compile(r"^EFTA(\d+)\.pdf$", re.IGNORECASE)
    match = pattern.search(file_name)
    return int(match.group(1)) if match else None
  
  def get_file_name(self, file_number):
    return f"EFTA{file_number:08d}.pdf"
  
  def get_file_path(self, file_number):
    return f"{self.directory_path}/{self.get_file_name(file_number)}"