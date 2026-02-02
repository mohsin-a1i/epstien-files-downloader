export default class DownloadRenderer {
  constructor(total) {
    this.total = total;
    this.progress = 0;
    this.description = "";

    process.stdout.write("\n\n\n"); // Reserve space
    process.stdout.write("\x1b[2A"); // Move cursor up two lines
  }

  renderProgress() {
    const width = 30;
    const percent = this.progress / this.total;

    const filled = Math.round(width * percent);
    const bar = "█".repeat(filled) + "-".repeat(width - filled);

    const line = `[${bar}] ${(percent * 100).toFixed(1)}%`.padEnd(80, " ");

    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
  }

  renderDescription() {
    const line = this.description.padEnd(80, " ");

    process.stdout.write("\x1b[1B"); // Move cursor down one line
    process.stdout.write("\x1b[0G"); // Move cursor to start of line
    process.stdout.write(line);
    process.stdout.write("\x1b[1A"); // Move cursor up one line
  }

  updateProgress(progress) {
    this.progress = progress;
    this.renderProgress();
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