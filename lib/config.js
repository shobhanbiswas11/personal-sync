const fs = require("fs");
const path = require("path");
const os = require("os");
const chalk = require("chalk");

class ConfigManager {
  constructor() {
    this.globalConfigPath = path.join(os.homedir(), ".psync", "config.json");
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

  getGlobalConfig() {
    return this.readConfig(this.globalConfigPath);
  }

  setGlobalConfig(config) {
    this.ensureGlobalConfigDir();
    return this.writeConfig(this.globalConfigPath, config);
  }

  getBucketName() {
    const globalConfig = this.readConfig(this.globalConfigPath);
    return globalConfig.bucket || process.env.PSYNC_BUCKET || "psync-bucket";
  }
}

module.exports = new ConfigManager();
