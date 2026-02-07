import fs from "fs/promises"

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
    const localFiles = new Set()
    const fileNames = await fs.readdir(this.directoryPath);
    for (const fileName of fileNames) {
      const fileNumber = this.getFileNumber(fileName);
      if (!fileNumber) continue;
      localFiles.add(fileNumber);
    }

    for (const fileNumber in this.localFiles) {
      if (!localFiles.has(parseInt(fileNumber))) delete this.localFiles[fileNumber]
    }

    for (const fileNumber of this.localCorruptedFiles) {
      if (!localFiles.has(fileNumber)) this.localCorruptedFiles.delete(fileNumber)
    }

    for (const fileNumber of localFiles) {
      if (fileNumber in this.localFiles || this.localCorruptedFiles.has(fileNumber)) continue;
      this.localFiles[fileNumber] = -1;
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