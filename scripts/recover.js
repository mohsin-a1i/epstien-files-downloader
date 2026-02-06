import fs from "fs/promises"
import IndexManager from "./index-manager.js";
import ProgressRenderer from "./renderer/progress-renderer.js";
import RendererLayout from "./renderer/renderer-layout.js";
import ContentRenderer from "./renderer/content-renderer.js";

async function main() {
    const args = process.argv.slice(2);

    let set = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--set' || args[i] === '-s') {
            set = parseInt(args[i + 1]);
        }
    }

    if (set === null || isNaN(set)) {
        console.error("Specify a data set");
        process.exit(1);
    }

    const index = new IndexManager(set);
    await index.load();

    recover(index);

    await index.save();
}
main()

async function recover(index) {
  let processed = 0;
  const progressRenderer = new ProgressRenderer(index.localCorruptedFiles.size);
  const contentRenderer = new ContentRenderer()
  new RendererLayout([progressRenderer, contentRenderer]);

  for (const fileNumber of index.localCorruptedFiles) {
    const filePath = index.getFilePath(fileNumber);
    const stats = await fs.stat(filePath);

    progressRenderer.render(++processed);
  }
}