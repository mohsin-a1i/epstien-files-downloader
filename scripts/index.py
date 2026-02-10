import argparse
from scripts.utils.index.index_manager import IndexManager

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
  index.index_local_files()
  index.save()

if __name__ == "__main__":
  main()

