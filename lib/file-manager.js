const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const extract = require("extract-zip");
const chalk = require("chalk");

class FileManager {
  constructor(basePath) {
    // Use the provided basePath directly, which should be the current working directory
    this.basePath = path.resolve(basePath);
    this.tempDir = path.join(os.tmpdir(), "psync-temp");

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createZip(files) {
    const zipPath = path.join(this.tempDir, "temp.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(zipPath));
      archive.on("error", (err) => reject(err));

      archive.pipe(output);

      // Add each file to the archive, using relative paths
      files.forEach((file) => {
        const filePath = path.join(this.basePath, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            // Use relative path for the file name in the archive
            archive.file(filePath, { name: file });
          } else if (stats.isDirectory()) {
            // Use relative path for the directory in the archive
            archive.directory(filePath, file);
          }
        }
      });

      archive.finalize();
    });
  }

  async extractZip(zipPath) {
    try {
      // Ensure the base directory exists
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }

      // Extract the zip file
      await extract(zipPath, {
        dir: this.basePath,
        onEntry: (entry) => {
          console.log(chalk.blue(`📦 Extracting: ${entry.fileName}`));
        },
      });
    } catch (error) {
      throw new Error(`Failed to extract zip: ${error.message}`);
    }
  }

  cleanup(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = FileManager;
