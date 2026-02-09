import argparse
import bisect
import os
import re
import sys
from utils.index_manager import IndexManager

def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-s", "--set",
        type=int,
        required=True,
        help="Specify a data set"
    )

    args = parser.parse_args()

    index = IndexManager(args.set)
    index.save()

    # directory = f"VOL{args.set:05d}"
    # output_directory = f"CVOL{args.set:05d}"

    # if not os.path.exists(output_directory):
    #     os.mkdir(output_directory)

    # combine_pdf(directory, output_directory)

def combine_pdf(directory, output_directory):
    pdf_numbers = get_pdf_numbers(directory)
    first_pdf_index = 0

    output_pdf_numbers = get_pdf_numbers(output_directory)
    if (len(output_pdf_numbers) > 0):
        last_combined_pdf_number = output_pdf_numbers[-1]
        reader = PdfReader(f"{output_directory}/{f"EFTA{last_combined_pdf_number:08d}.pdf"}")
        last_page_number = last_combined_pdf_number + len(reader.pages) - 1

        index = bisect.bisect_right(pdf_numbers, last_page_number)
        if index < len(pdf_numbers):
            first_pdf_index = index
        else:
            print("All PDFs already combined")
            sys.exit(0)

    print(f"Starting from {f"EFTA{pdf_numbers[first_pdf_index]}.pdf"}")

    combiner = PdfCombiner(directory, output_directory)
    for pdf_number in pdf_numbers[first_pdf_index:]:
        combiner.combine_pages(pdf_number)
    combiner.save_pdf()

def get_pdf_numbers(directory):
    pdf_numbers = []
    pattern = re.compile(r"^EFTA(\d+)\.pdf$", re.IGNORECASE)
    for filename in os.listdir(directory):
        match = pattern.search(filename)
        if match:
            pdf_numbers.append(int(match.group(1)))
    pdf_numbers.sort()
    return pdf_numbers
    
class PdfCombiner:
    def __init__(self, directory, output_directory):
        self.directory = directory
        self.output_directory = output_directory

        self.writer = PdfWriter()
        self.pdf_number = None

    def combine_pages(self, pdf_number):
        pdf_path = self.get_pdf_path(self.directory, pdf_number)

        try:
            reader = PdfReader(pdf_path)
            if (self.pdf_number == None):
                self.add_pages(reader)
                self.pdf_number = pdf_number
            else:
                expected_pdf_number = self.pdf_number + len(self.writer.pages)
                if (expected_pdf_number == pdf_number):
                    self.add_pages(reader)
                elif (expected_pdf_number < pdf_number):
                    self.save_pdf()
                    self.writer = PdfWriter()
                    self.add_pages(reader)
                    self.pdf_number = pdf_number
                else:
                    print("Found duplicate pages")
                    sys.exit(1)
        except (PdfReadError, PdfStreamError) as e:
            print(f"Error reading {pdf_path}")

    def add_pages(self, reader):
        for page in reader.pages:
            self.writer.add_page(page)
            
    def save_pdf(self):
        with open(self.get_pdf_path(self.output_directory, self.pdf_number), "wb") as f:
            self.writer.write(f)

    def get_pdf_path(self, directory, pdf_number):
        return f"{directory}/{self.get_pdf_name(pdf_number)}"

    def get_pdf_name(self, pdf_number):
        return f"EFTA{pdf_number:08d}.pdf"

if __name__ == "__main__":
    main()

