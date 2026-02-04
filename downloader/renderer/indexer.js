export default class IndexerRenderer {
  constructor(batch) {
    this.page
    this.message

    this.batch = batch
    this.state = []

    process.stdout.write("\n\n"); // Reserve space
    process.stdout.write(`\x1b[${process.stdout.columns}G`); // moves cursor to far right
  }

  renderDebug(message) {
    const line = message.padEnd(80, " ")

    process.stdout.write("\x1b[2A"); // Move cursor up two lines
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
    process.stdout.write("\x1b[2B"); // Move cursor down two lines
    process.stdout.write(`\x1b[${process.stdout.columns}G`); // moves cursor to far right
  }

  renderGraph() {
    let line = ""
    let sum = 0;
    for (let i = 0; i < this.state.length; i++) {
        sum += this.state[i];
        if (i % this.batch === 0) {
            line += this.getGraphic(sum / this.batch);
            sum = 0;
        }
    }
    line.padEnd(80, " ");

    process.stdout.write("\x1b[1A"); // Move cursor up one line
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
    process.stdout.write("\x1b[1B"); // Move cursor down one line
    process.stdout.write(`\x1b[${process.stdout.columns}G`); // moves cursor to far right
  }

  renderDescription() {
    let line = ""
    if (this.page) line += `Index updated to page ${this.page}`
    if (this.message) line += ` | ${this.message}`
    line.padEnd(80, " ");

    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
    process.stdout.write(`\x1b[${process.stdout.columns}G`); // moves cursor to far right
  }

  getGraphic(percentage) {
    if (percentage >= 0 && percentage <= 0.25) {
        return "░";
    } else if (percentage > 0.25 && percentage <= 0.5) {
        return "▒";
    } else if (percentage > 0.5 && percentage <= 0.75) {
        return "▓";
    } else if (percentage > 0.75 && percentage <= 1) {
        return "█";
    }
  }

  updateGraph(state) {
    this.state.push(state);
    if (this.state.length % this.batch === 0) this.renderGraph();
  }

  updatePage(page) {
    this.page = page
    this.renderDescription()
  }

  updateMessage(message) {
    this.message = message
    this.renderDescription()
  }
}