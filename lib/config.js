const fs = require("fs");
const path = require("path");
const os = require("os");
const { default: chalk } = require("chalk");

class ConfigManager {
  constructor() {
    this.globalConfigPath = path.join(os.homedir(), ".psync", "config.json");
    this.projectConfigPath = path.join(process.cwd(), ".psync", "config.json");
  }

  ensureGlobalConfigDir() {
    const dir = path.dirname(this.globalConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  readConfig(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not read config from ${configPath}`)
      );
    }
    return {};
  }

  writeConfig(configPath, config) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error(
        chalk.red(`Error writing config to ${configPath}: ${error.message}`)
      );
      return false;
    }
  }

  getAwsCredentials() {
    // First check project config
    const projectConfig = this.readConfig(this.projectConfigPath);
    if (projectConfig.aws?.accessKeyId && projectConfig.aws?.secretAccessKey) {
      return {
        accessKeyId: projectConfig.aws.accessKeyId,
        secretAccessKey: projectConfig.aws.secretAccessKey,
        region: projectConfig.aws.region || "us-east-1",
      };
    }

    // Then check global config
    const globalConfig = this.readConfig(this.globalConfigPath);
    if (globalConfig.aws?.accessKeyId && globalConfig.aws?.secretAccessKey) {
      return {
        accessKeyId: globalConfig.aws.accessKeyId,
        secretAccessKey: globalConfig.aws.secretAccessKey,
        region: globalConfig.aws.region || "us-east-1",
      };
    }

    // Finally check environment variables
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "us-east-1",
      };
    }

    return null;
  }

  getProjectConfig() {
    return this.readConfig(this.projectConfigPath);
  }

  getGlobalConfig() {
    return this.readConfig(this.globalConfigPath);
  }

  setProjectConfig(config) {
    const dir = path.dirname(this.projectConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return this.writeConfig(this.projectConfigPath, config);
  }

  setGlobalConfig(config) {
    this.ensureGlobalConfigDir();
    return this.writeConfig(this.globalConfigPath, config);
  }

  getBucketName() {
    const projectConfig = this.readConfig(this.projectConfigPath);
    const globalConfig = this.readConfig(this.globalConfigPath);
    return (
      projectConfig.bucket ||
      globalConfig.bucket ||
      process.env.PSYNC_BUCKET ||
      "psync-bucket"
    );
  }
}

module.exports = new ConfigManager();
