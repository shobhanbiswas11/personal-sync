const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const extract = require("extract-zip");
const { default: chalk } = require("chalk");

class FileManager {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
    this.tempDir = path.join(this.basePath, ".psync");
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createZip(files) {
    const zipPath = path.join(this.tempDir, "temp.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(zipPath));
      archive.on("error", reject);

      archive.pipe(output);

      for (const file of files) {
        const fullPath = path.join(this.basePath, file);
        archive.file(fullPath, { name: file });
      }

      archive.finalize();
    });
  }

  async extractZip(zipPath) {
    await extract(zipPath, { dir: this.basePath });
  }

  cleanup(zipPath) {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

module.exports = FileManager;
