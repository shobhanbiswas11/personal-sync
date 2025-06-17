const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const chalk = require("chalk");
const FileManager = require("./file-manager");
const S3Manager = require("./s3");
const config = require("./config");

// Default ignore patterns
const DEFAULT_IGNORE_PATTERNS = [
  "node_modules/**",
  ".git/**",
  "**/__pycache__/**",
  "**/*.pyc",
  "**/.DS_Store",
  "**/.venv/**",
  "**/venv/**",
  "**/.idea/**",
  "**/.vscode/**",
  "**/dist/**",
  "**/build/**",
  ".psync/**",
  ".next/**",
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

async function push(dir, projectName, options = {}) {
  // Resolve the directory to absolute path
  const baseDir = path.resolve(dir);
  console.log(chalk.blue(`📂 Using directory: ${baseDir}`));

  const fileManager = new FileManager(baseDir);
  const s3Manager = new S3Manager();

  // Check if project exists in S3
  const exists = await s3Manager.checkProjectExists(projectName);
  if (!exists) {
    throw new Error(
      `Project "${projectName}" does not exist. Please run 'psync init' first.`
    );
  }

  const ignorePatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...(options.ignorePsyncignore ? [] : readIgnorePatterns(baseDir)),
  ];
  const includeGlobs = options.include || ["**/*"];

  const files = await fg(includeGlobs, {
    cwd: baseDir,
    dot: true,
    ignore: ignorePatterns,
  });

  console.log(chalk.blue(`📦 Found ${files.length} files to sync...`));
  console.log(chalk.blue(`🔑 Project: ${projectName}`));

  const zipPath = await fileManager.createZip(files);
  console.log(chalk.blue(`📦 Created zip archive...`));

  await s3Manager.uploadFile(zipPath, `${projectName}/latest.zip`);
  console.log(chalk.green(`✅ Successfully uploaded to S3`));

  fileManager.cleanup(zipPath);
  console.log(chalk.yellow("🚀 Push complete."));
}

module.exports = { push };
