const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const FileManager = require("./file-manager");
const S3Manager = require("./s3");
const config = require("./config");

class ProjectManager {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
    this.fileManager = new FileManager(basePath);
  }

  async init(projectName) {
    // Validate project name
    if (!projectName || typeof projectName !== "string") {
      throw new Error("Project name is required");
    }

    // Check if project name contains only valid characters
    if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
      throw new Error(
        "Project name can only contain letters, numbers, hyphens and underscores"
      );
    }

    // Check if project already exists in S3
    const s3Manager = new S3Manager();
    const exists = await s3Manager.checkProjectExists(projectName);
    if (exists) {
      throw new Error(`Project "${projectName}" already exists`);
    }

    // Create initial project config
    const projectConfig = {
      projectName,
      createdAt: new Date().toISOString(),
      lastSync: null,
    };

    config.setProjectConfig(projectConfig);

    console.log(
      chalk.green(`✅ Project "${projectName}" initialized successfully`)
    );
    return projectName;
  }

  async clone(projectName) {
    // Check if directory is empty, ignoring .psync directory
    const files = fs.readdirSync(this.basePath).filter((file) => {
      // Ignore .psync directory and hidden files
      return file !== ".psync" && !file.startsWith(".");
    });

    if (files.length > 0) {
      throw new Error("Cannot clone into non-empty directory");
    }

    // Check if project exists in S3
    const s3Manager = new S3Manager();
    const exists = await s3Manager.checkProjectExists(projectName);
    if (!exists) {
      throw new Error(`Project "${projectName}" does not exist`);
    }

    // Create project config
    const projectConfig = {
      projectName,
      clonedAt: new Date().toISOString(),
      lastSync: null,
    };

    config.setProjectConfig(projectConfig);

    // Try to pull the project
    const zipPath = path.join(this.fileManager.tempDir, "temp.zip");

    try {
      await s3Manager.downloadFile(`${projectName}/latest.zip`, zipPath);
      await this.fileManager.extractZip(zipPath);
      this.fileManager.cleanup(zipPath);

      console.log(
        chalk.green(`✅ Project "${projectName}" cloned successfully`)
      );
    } catch (error) {
      // Cleanup on failure
      this.fileManager.cleanup(zipPath);
      fs.rmSync(this.fileManager.tempDir, { recursive: true, force: true });
      throw new Error(`Failed to clone project: ${error.message}`);
    }
  }

  async list() {
    const s3Manager = new S3Manager();
    const projects = await s3Manager.listProjects();
    return projects;
  }

  getProjectInfo() {
    const projectConfig = config.getProjectConfig();
    if (!projectConfig.projectName) {
      return null;
    }

    return {
      projectName: projectConfig.projectName,
      ...projectConfig,
    };
  }
}

module.exports = ProjectManager;
