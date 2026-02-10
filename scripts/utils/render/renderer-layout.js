export default class RendererLayout {
  constructor(renderers) {
    process.stdout.write("\n".repeat(renderers.length)); // Reserve space
    process.stdout.write("\x1b[0G"); // Move cursor to start of line

    for (let i = 0; i < renderers.length; i++) {
      renderers[i].setRowCount(renderers.length)
      renderers[i].setRowNumber(i)
    }
  }
}