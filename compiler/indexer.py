import argparse
import json
import os
import re
from rich.live import Live
from rich.progress import Progress, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.table import Table
from rich import box
from collections import deque
from bisect import bisect_left, insort_left
from pathlib import Path
from pypdf import PdfReader
from pypdf.errors import PdfReadError, PdfStreamError
from typing import List, TypedDict, Union, Optional

def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-s", "--set",
        type=int,
        required=True,
        help="Specify a data set",
    )

    parser.add_argument(
        "-b", "--batch",
        type=int,
        default=5,
        help="Save index every batch",
    )

    args = parser.parse_args()

    index_path = f"index/SET{args.set}.json"
    directory = f"../VOL{args.set:05d}"

    index(index_path, directory, args.batch)

def index(index_path, directory, batch):
    filenames = os.listdir(directory)
    file_count = len(filenames)

    render, progress, messages = create_rich_layout()
    
    with Live(render(), refresh_per_second=5) as live:
        task = progress.add_task("Processing", total=file_count)

        index = IndexStore(index_path)

        pattern = re.compile(r"EFTA(\d+)", re.IGNORECASE)

        for file_index, filename in enumerate(filenames):
            file_number = int(pattern.search(filename).group(1))

            indexed_file_numbers = []
            if (indexed_file_numbers.index())

            try:
                reader = PdfReader(f"{directory}/{filename}")
                for page_index, page in enumerate(reader.pages):
                    page_number = file_number + page_index

                    # def visitor_footer(text, cm, tm, font_dict, font_size):
                    #     if (tm[5] < 0): 
                    #         match = pattern.search(text)
                    #         if (match):
                    #             detected_page_number = int(match.group(1))
                    #             if (detected_page_number != page_number):
                    #                 messages.info.append(f"PDF {filename} page {detected_page_number} not {page_number}")
                    #                 live.update(render())

                    # page.extract_text(visitor_text=visitor_footer)

                    indexed_pages[page_number] = { "f": file_number, "p": page_index }
                
                indexed_file_numbers.append(filename)
            except (PdfReadError, PdfStreamError) as e:
                indexed_corrupted_file_numbers.append(filename)

                messages.error.append(f"Error in {filename}: {str(e)}")
                live.update(render())

            if (file_index + 1 % batch == 0):
                json.dump(index, index_path.open("w", encoding="utf-8"), indent=2, ensure_ascii=False)

            progress.update(task, advance=1)
            live.update(render())

        json.dump(index, index_path.open("w", encoding="utf-8"), indent=2, ensure_ascii=False)
            
        progress.stop()

def create_rich_layout():
    progress = Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None),
        TaskProgressColumn(),
        TimeRemainingColumn(),
        expand=True
    )

    class Messages:
        def __init__(self, maxlen=30):
            self.info = deque(maxlen=maxlen)
            self.error = deque(maxlen=maxlen)

    messages = Messages()

    def render():
        root_table = Table.grid(expand=True)
        root_table.add_row(progress)

        message_table = Table.grid(expand=True)
        message_table.add_column(ratio=2)
        message_table.add_column(ratio=1)

        info_table = Table("Messages", box=box.ROUNDED, expand=True)
        for info in messages.info:
            info_table.add_row(info)

        error_table = Table("Errors", box=box.ROUNDED, expand=True)
        for error in messages.error:
            error_table.add_row(error)

        message_table.add_row(info_table, error_table)

        root_table.add_row(message_table)
        return root_table

    return render, progress, messages

class IndexPage(TypedDict):
    f: int
    p: int

class IndexStore:
    def __init__(
        self,
        index_path: Union[str, Path],
        auto_load: bool = True
    ):
        self.index_path = Path(index_path)
        self._pages: dict[str, IndexPage] = {}
        self._files: List[int] = []
        self._corrupted_files: List[int] = []
        
        if auto_load:
            self.load()
    
    def load(self) -> None:
        if not self.index_path.is_file():
            return
        
        try:
            with self.index_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                self._pages = data.get("pages", {})
                self._files = data.get("files", {})
                self._corrupted_files = data.get("corrupted_files", [])

                self._files.sort()
                self._corrupted_files.sort()
            
        except (json.JSONDecodeError, OSError, ValueError) as e:
            print(f"Warning: Could not load {self.filepath}: {e}")
            self._numbers = []
    
    def save(self) -> None:
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        
        with self.index_path.open("w", encoding="utf-8") as f:
            data = { 
                "pages": self._pages,
                "files": self._files, 
                "corrupted_files": self._corrupted_files
            }
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def add(self, value: int) -> bool:
        value = float(value)  # normalize to float
        
        if not self.allow_duplicates:
            idx = bisect_left(self._numbers, value)
            if idx < len(self._numbers) and self._numbers[idx] == value:
                return False
        
        insort_left(self._numbers, value)
        return True
    
    def contains(self, value: int) -> bool:
        value = float(value)
        idx = bisect_left(self._numbers, value)
        return idx < len(self._numbers) and self._numbers[idx] == value
    
    def remove(self, value: int) -> bool:
        value = float(value)
        idx = bisect_left(self._numbers, value)
        if idx < len(self._numbers) and self._numbers[idx] == value:
            del self._numbers[idx]
            return True
        return False

if __name__ == "__main__":
    main()

