const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { default: chalk } = require("chalk");
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
    if (this.fileManager.getProjectId()) {
      throw new Error("Project already initialized in this directory");
    }

    // Generate new project ID
    const projectId = crypto.randomBytes(16).toString("hex");

    // Initialize project
    this.fileManager.setProjectId(projectId);

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
    // Check if directory is empty
    const files = fs.readdirSync(this.basePath);
    if (files.length > 0) {
      throw new Error("Cannot clone into non-empty directory");
    }

    // Initialize project with existing ID
    this.fileManager.setProjectId(projectId);

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
    const projectId = this.fileManager.getProjectId();
    if (!projectId) {
      return null;
    }

    const projectConfig = config.getProjectConfig();
    return {
      projectId,
      ...projectConfig,
    };
  }
}

module.exports = ProjectManager;
