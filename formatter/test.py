import os
import re
from collections import deque
from rich.live import Live
from rich.progress import Progress, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.table import Table
from rich import box
from pypdf import PdfReader
from pypdf.errors import PdfReadError, PdfStreamError

def main():
    pattern = re.compile(r"EFTA(\d+)", re.IGNORECASE)

    filenames = os.listdir("VOL00011")
    file_count = len(filenames)

    render, progress, messages = create_rich_layout()
    task = progress.add_task("Processing", total=file_count)

    with Live(render(), refresh_per_second=5) as live:
        for filename in filenames:
            try:
                reader = PdfReader(f"VOL00011/{filename}")
                for page_number, page in enumerate(reader.pages):
                    page_name = None

                    def visitor_footer(text, cm, tm, font_dict, font_size):
                        nonlocal page_name

                        if (tm[5] < 0): 
                            match = pattern.search(text)
                            if (match):
                                page_name = int(match.group(1))

                    page.extract_text(visitor_text=visitor_footer)

                    if (page_name == None):
                        messages.info.append(f"PDF {filename} page {page_number} missing name")
                        live.update(render())
            except (PdfReadError, PdfStreamError) as e:
                messages.error.append(f"Error in {filename}: {str(e)}")
                live.update(render())

            progress.update(task, advance=1)
            live.update(render())

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
        def __init__(self, maxlen=6):
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

if __name__ == "__main__":
    main()
    

