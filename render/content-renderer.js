export default class ContentRenderer {
  setRowCount(rowCount) {
    this.rowCount = rowCount
  }

  setRowNumber(rowNumber) {
    this.rowNumber = rowNumber
  }

  render(content) {
    const displacement = this.rowCount - this.rowNumber;

    process.stdout.write(`\x1b[${displacement}A`); // Move cursor up
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(content.padEnd(80, " "));
    process.stdout.write(`\x1b[${displacement}B`); // Move cursor down
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
  }
}