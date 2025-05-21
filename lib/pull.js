const fs = require("fs");
const path = require("path");
const { default: chalk } = require("chalk");
const AWS = require("aws-sdk");
const extract = require("extract-zip");
const FileManager = require("./file-manager");
const S3Manager = require("./s3");
const config = require("./config");

async function pull(dir) {
  const fileManager = new FileManager(dir);
  const s3Manager = new S3Manager();

  const projectId = fileManager.getProjectId();
  if (!projectId) {
    throw new Error(
      "No project found. Please run 'psync init' or 'psync clone' first."
    );
  }

  console.log(chalk.blue(`🔑 Project ID: ${projectId}`));

  console.log(chalk.blue("📥 Downloading from S3..."));
  const zipPath = path.join(fileManager.tempDir, "temp.zip");
  await s3Manager.downloadFile(`${projectId}/latest.zip`, zipPath);

  console.log(chalk.blue("📦 Extracting files..."));
  await fileManager.extractZip(zipPath);

  // Update last sync time
  const projectConfig = config.getProjectConfig();
  projectConfig.lastSync = new Date().toISOString();
  config.setProjectConfig(projectConfig);

  fileManager.cleanup(zipPath);
  console.log(chalk.green("✅ Pull complete."));
}

module.exports = { pull };
