import argparse
import json
import os
from pypdf import PdfReader
from pypdf.errors import PdfReadError, PdfStreamError

def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-s", "--set",
        type=int,
        required=True,
        help="Specify a data set"
    )

    args = parser.parse_args()
    build_corrupted_index(args.set, f"VOL{args.set:05d}")
   

def build_corrupted_index(set, directory):
    corrupted = []
    for pdf_name in os.listdir(directory):
        path = f"{directory}/{pdf_name}"
        try:
            PdfReader(path)
        except (PdfReadError, PdfStreamError) as e:
            os.remove(path)
            corrupted.append(f"/epstein/files/DataSet%2{set:02d}/{pdf_name}")

    with open(f"corrupted-index-{set}.json", "w") as f:
        json.dump(corrupted, f)

if __name__ == "__main__":
    main()