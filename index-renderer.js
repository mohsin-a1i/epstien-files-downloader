export default class IndexRenderer {
  constructor(scale) {
    this.scale = scale
    this.state = []
    this.description = "";

    process.stdout.write("\n\n\n"); // Reserve space
    process.stdout.write("\x1b[2A"); // Move cursor up two lines
  }

    getGraphic(percentage) {
        if (percentage > 0 && percentage <= 0.25) {
            return "░";
        } else if (percentage > 0.25 && percentage <= 0.5) {
            return "▒";
        } else if (percentage > 0.5 && percentage <= 0.75) {
            return "▓";
        } else if (percentage > 0.75 && percentage <= 1) {
            return "█";
        }
    }


  renderGraph() {
    let line = ""
    for (let i = 0; i < this.state.length; i++) {
        let sum = 0;
        sum += this.state[i];

        if (i % this.scale === 0) {
            line += this.getGraphic(sum / this.scale);
            sum = 0;
        }
    }
    line.padEnd(80, " ");

    process.stdout.write("\x1b[1B"); // Move cursor down one line
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line)
    process.stdout.write("\x1b[1A"); // Move cursor up one line
  }

  renderDescription() {
    const line = this.description.padEnd(80, " ");

    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
  }

  updateGraph(state) {
    this.state.push(state)
    if (this.state.length % this.scale === 0) this.renderGraph()
  }

  updateDescription(description) {
    this.description = description;
    this.renderDescription();
  }

  finish() {
    process.stdout.write("\x1b[2B"); // Move cursor down two lines
    process.stdout.write("\n");
  }
}