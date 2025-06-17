const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const extract = require("extract-zip");
const { default: chalk } = require("chalk");

class FileManager {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
    this.tempDir = path.join(os.tmpdir(), "psync-temp");

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createZip(excludePatterns = []) {
    const zipPath = path.join(this.tempDir, "temp.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(zipPath));
      archive.on("error", (err) => reject(err));

      archive.pipe(output);

      // Add all files from the base directory
      archive.directory(this.basePath, false, (data) => {
        // Skip files that match exclude patterns
        if (excludePatterns.some((pattern) => data.name.match(pattern))) {
          return false;
        }
        return data;
      });

      archive.finalize();
    });
  }

  async extractZip(zipPath) {
    try {
      await extract(zipPath, { dir: this.basePath });
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
