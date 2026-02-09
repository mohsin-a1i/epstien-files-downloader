import fs from "fs/promises";
import { spawn } from "child_process";
import { SearchableMap } from "./searchable-map.js";

export default class IndexManager {
  constructor(set) {
    this.set = set;
    this.indexPath = `../index/INDEX${set}.json`;
    this.directoryPath = `../VOL${set.toString().padStart(5, "0")}`;
  }

  async load() {
    const index = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
    this.deserializeIndex(index)
  }

  async save() {
    await fs.writeFile(this.indexPath, JSON.stringify(this.serializeIndex()));
  }

  deserializeIndex(index) {
    this.localFiles = new SearchableMap(index.local.files)
    this.localCorruptedFiles = new Set(index.local.corruptedFiles)

    this.serverFiles = new Set(index.server.files)
    this.serverCorruptedFiles = new Set(index.server.corruptedFiles)
  }

  serializeIndex() {
    return {
      local: {
        files: this.localFiles.serialize(),
        corruptedFiles: [...this.localCorruptedFiles]
      },
      server: {
        files: [...this.serverFiles],
        corruptedFiles: [...this.serverCorruptedFiles]
      }
    }
  }

  indexLocalFiles() {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['index_local_files.py', '-s', this.set]);
      pythonProcess.stdout.on('data', (data) => process.stdout.write(data));
      pythonProcess.stderr.on('data', (data) => process.stderr.write(data));
      pythonProcess.on('close', (code) => code === 0 ? resolve() : reject());
    })
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