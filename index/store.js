import fs from "fs/promises"
import { PDFParse } from "pdf-parse"
import { ContentRenderer, ProgressRenderer, RendererLayout } from "../render/index.js";

export default class IndexStore {
  constructor(set) {
    this.indexPath = `../index/INDEX${set}.json`;
    this.directoryPath = `../VOL${set.toString().padStart(5, "0")}/`;
  }

  async load() {
    const index = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
    this.deserializeIndex(index)
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
    

    const setFiles = [];
    const fileNames = await fs.readdir(this.directoryPath);
    for (const fileName of fileNames) {
      const fileNumber = this.getFileNumber(fileName);

      if (this.localCorruptedFiles.has(fileNumber)) continue;

      const setFile = async () => {
        try {
          const data = await fs.readFile(this.getFilePath(fileNumber));
          const parser = new PDFParse({ data });
          const info = await parser.getInfo({ parsePageInfo: false });
          parser.destroy();
          this.localFiles[fileNumber] = info.total;
        } catch(error) {
          this.localCorruptedFiles.add(fileNumber);
        }
      }
      setFiles.push(setFile())
    }

    if (setFiles.length > 0) {
      console.log("Indexing local files ...");
      let processed = 0;

      const progressRenderer = new ProgressRenderer(setFiles.length);
      new RendererLayout([progressRenderer]);
      
      await Promise.allSettled(setFiles.map((setFile) => {
        const task = async () => {
          await setFile

          processed++;
          progressRenderer.render(processed);
        }

        return task()
      }));
    }
  }

  getFileNumber(fileName) {
    try {
      const match = fileName.match(/EFTA(\d+)\.pdf$/);
      return parseInt(match[1]);
    } catch(error) {
      throw new Error(`Unexpected file ${fileName}`)
    }
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

  getServerFilesCount() {
    return this.serverFiles.size
  }

  async getDownloadableFileNumbers() {
    const downloadableFileNumbers = []

    for (const fileNumber of this.serverFiles) {
      if (fileNumber in this.localFiles || this.localCorruptedFiles.has(fileNumber)) continue
      downloadableFileNumbers.push(fileNumber)
    }

    return downloadableFileNumbers
  }

  addServerCorruptedFileNumber(fileNumber) {
    this.serverCorruptedFiles.add(fileNumber)
  }

  addLocalCorruptedFileNumber(fileNumber) {
    this.localCorruptedFiles.add(fileNumber)
  }
}