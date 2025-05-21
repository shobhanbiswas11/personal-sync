const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const chalk = require("chalk");
const FileManager = require("./file-manager");
const S3Manager = require("./s3");
const config = require("./config");

class ProjectManager {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
    this.fileManager = new FileManager(basePath);
  }

  async init() {
    // Check if project already exists
    const existingConfig = config.getProjectConfig();
    if (existingConfig.projectId) {
      throw new Error("Project already initialized in this directory");
    }

    // Generate new project ID
    const projectId = crypto.randomBytes(16).toString("hex");

    // Create initial project config
    const projectConfig = {
      projectId,
      createdAt: new Date().toISOString(),
      lastSync: null,
    };

    config.setProjectConfig(projectConfig);

    console.log(chalk.green(`✅ Project initialized with ID: ${projectId}`));
    return projectId;
  }

  async clone(projectId) {
    // Check if directory is empty, ignoring .psync directory
    const files = fs.readdirSync(this.basePath).filter((file) => {
      // Ignore .psync directory and hidden files
      return file !== ".psync" && !file.startsWith(".");
    });

    if (files.length > 0) {
      throw new Error("Cannot clone into non-empty directory");
    }

    // Create project config
    const projectConfig = {
      projectId,
      clonedAt: new Date().toISOString(),
      lastSync: null,
    };

    config.setProjectConfig(projectConfig);

    // Try to pull the project
    const s3Manager = new S3Manager();
    const zipPath = path.join(this.fileManager.tempDir, "temp.zip");

    try {
      await s3Manager.downloadFile(`${projectId}/latest.zip`, zipPath);
      await this.fileManager.extractZip(zipPath);
      this.fileManager.cleanup(zipPath);

      console.log(chalk.green(`✅ Project ${projectId} cloned successfully`));
    } catch (error) {
      // Cleanup on failure
      this.fileManager.cleanup(zipPath);
      fs.rmSync(this.fileManager.tempDir, { recursive: true, force: true });
      throw new Error(`Failed to clone project: ${error.message}`);
    }
  }

  getProjectInfo() {
    const projectConfig = config.getProjectConfig();
    if (!projectConfig.projectId) {
      return null;
    }

    return {
      projectId: projectConfig.projectId,
      ...projectConfig,
    };
  }
}

module.exports = ProjectManager;
