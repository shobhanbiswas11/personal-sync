const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const chalk = require("chalk");
const FileManager = require("./file-manager");
const S3Manager = require("./s3");
const config = require("./config");
const ProjectManager = require("./project-manager");

// Default ignore patterns
const DEFAULT_IGNORE_PATTERNS = [
  "node_modules/**",
  ".git/**",
  "**/__pycache__/**",
  "**/*.pyc",
  "**/.DS_Store",
  "**/.env",
  "**/.venv/**",
  "**/venv/**",
  "**/.idea/**",
  "**/.vscode/**",
  "**/dist/**",
  "**/build/**",
  ".psync/**",
];

function readIgnorePatterns(basePath) {
  const ignorePath = path.join(basePath, ".psyncignore");
  if (fs.existsSync(ignorePath)) {
    return fs
      .readFileSync(ignorePath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

async function push(dir, options = {}) {
  const fileManager = new FileManager(dir);
  const s3Manager = new S3Manager();
  const projectManager = new ProjectManager(dir);

  const projectInfo = projectManager.getProjectInfo();
  if (!projectInfo) {
    throw new Error("No project found. Please run 'psync init' first.");
  }

  const ignorePatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...(options.ignorePsyncignore ? [] : readIgnorePatterns(dir)),
  ];
  const includeGlobs = options.include || ["**/*"];

  const files = await fg(includeGlobs, {
    cwd: dir,
    dot: true,
    ignore: ignorePatterns,
  });

  console.log(chalk.blue(`📦 Found ${files.length} files to sync...`));
  console.log(chalk.blue(`🔑 Project ID: ${projectInfo.projectId}`));

  const zipPath = await fileManager.createZip(files);
  console.log(chalk.blue(`📦 Created zip archive...`));

  await s3Manager.uploadFile(zipPath, `${projectInfo.projectId}/latest.zip`);
  console.log(chalk.green(`✅ Successfully uploaded to S3`));

  // Update last sync time
  const projectConfig = config.getProjectConfig();
  projectConfig.lastSync = new Date().toISOString();
  config.setProjectConfig(projectConfig);

  fileManager.cleanup(zipPath);
  console.log(chalk.yellow("🚀 Push complete."));
}

module.exports = { push };
