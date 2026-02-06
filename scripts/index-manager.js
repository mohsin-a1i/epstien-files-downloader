import fs from "fs/promises"
import { PDFParse } from "pdf-parse"
import { ProgressRenderer, RendererLayout } from "./renderer/index.js";

export default class IndexManager {
  constructor(set) {
    this.indexPath = `../index/INDEX${set}.json`;
    this.directoryPath = `../VOL${set.toString().padStart(5, "0")}`;
  }

  async load() {
    try {
      const index = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
      this.deserializeIndex(index)
    } catch (error) {
      console.log(`${this.indexPath} not found. Creating new index`)
      this.createIndex()
    }

    await this.syncLocalFiles()
  }

  async save() {
    await fs.writeFile(this.indexPath, JSON.stringify(this.serializeIndex()));
  }

  createIndex() {
    this.localFiles = {}
    this.localCorruptedFiles = new Set()

    this.serverFiles = new Set()
    this.serverCorruptedFiles = new Set()
  }

  deserializeIndex(index) {
    this.localFiles = index.local.files
    this.localCorruptedFiles = new Set(index.local.corruptedFiles)

    this.serverFiles = new Set(index.server.files)
    this.serverCorruptedFiles = new Set(index.server.corruptedFiles)
  }

  serializeIndex() {
    return {
      local: {
        files: this.localFiles,
        corruptedFiles: [...this.localCorruptedFiles]
      },
      server: {
        files: [...this.serverFiles],
        corruptedFiles: [...this.serverCorruptedFiles]
      }
    }
  }

  async syncLocalFiles() {
    const fileNumbers = new Set()
    const fileNames = await fs.readdir(this.directoryPath);
    for (const fileName of fileNames) {
      const fileNumber = this.getFileNumber(fileName);
      if (!fileNumber) continue;
      fileNumbers.add(fileNumber);
    }

    for (const fileNumber in this.localFiles) {
      if (!fileNumbers.has(parseInt(fileNumber))) delete this.localFiles[fileNumber]
    }

    for (const fileNumber of this.localCorruptedFiles) {
      if (!fileNumbers.has(fileNumber)) this.localCorruptedFiles.delete(fileNumber)
    }

    const indexFiles = [];
    for (const fileNumber of fileNumbers) {
      if (this.localFiles[fileNumber] >= 0 || this.localCorruptedFiles.has(fileNumber)) continue;

      const setFile = async () => {
        try {
          const data = await fs.readFile(this.getFilePath(fileNumber));
          const parser = new PDFParse({ data });
          const info = await parser.getInfo({ parsePageInfo: false });
          parser.destroy();
          this.localFiles[fileNumber] = info.total;
        } catch (error) {
          this.localCorruptedFiles.add(fileNumber);
        }
      }
      indexFiles.push(setFile())
    }

    if (indexFiles.length > 0) {
      console.log("Indexing local files ...");

      let processed = 0;
      const progressRenderer = new ProgressRenderer(indexFiles.length);
      new RendererLayout([progressRenderer]);

      await Promise.allSettled(indexFiles.map((setFile) => {
        const task = async () => {
          await setFile;
          progressRenderer.render(++processed);
        }

        return task();
      }));
    }
  }

  getFileNumber(fileName) {
    const match = fileName.match(/EFTA(\d+)\.pdf$/);
    return match ? parseInt(match[1]) : NaN;
  }

  getFileName(fileNumber) {
    return `EFTA${fileNumber.toString().padStart(8, "0")}.pdf`
  }

  getFilePath(fileNumber) {
    return `${this.directoryPath}/${this.getFileName(fileNumber)}`
  }

  getFileURL(fileNumber) {
    return `https://www.justice.gov/epstein/files/DataSet%20${this.set}/${this.getFileName(fileNumber)}`
  }
}