#!/usr/bin/env node

const yargs = require("yargs");
const { push } = require("../lib/push");
const { pull } = require("../lib/pull");
const config = require("../lib/config");
const ProjectManager = require("../lib/project-manager");
const { default: chalk } = require("chalk");

yargs
  .command(
    "init [dir]",
    "Initialize a new project",
    (yargs) => {
      yargs.positional("dir", {
        describe: "Directory to initialize",
        default: ".",
      });
    },
    async (argv) => {
      try {
        const projectManager = new ProjectManager(argv.dir);
        await projectManager.init();
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    }
  )
  .command(
    "clone <project-id> [dir]",
    "Clone an existing project",
    (yargs) => {
      yargs
        .positional("project-id", {
          describe: "Project ID to clone",
          type: "string",
        })
        .positional("dir", {
          describe: "Directory to clone into",
          default: ".",
        });
    },
    async (argv) => {
      try {
        const projectManager = new ProjectManager(argv.dir);
        await projectManager.clone(argv.projectId);
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    }
  )
  .command(
    "push [dir]",
    "Push files to S3",
    (yargs) => {
      yargs
        .positional("dir", {
          describe: "Directory to push",
          default: ".",
        })
        .option("ignore-psyncignore", {
          describe: "Ignore .psyncignore file",
          type: "boolean",
          default: false,
        })
        .option("include", {
          describe: "Glob patterns to include",
          type: "array",
          default: ["**/*"],
        });
    },
    async (argv) => {
      try {
        await push(argv.dir, {
          ignorePsyncignore: argv.ignorePsyncignore,
          include: argv.include,
        });
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    }
  )
  .command(
    "pull [dir]",
    "Pull files from S3",
    (yargs) => {
      yargs.positional("dir", {
        describe: "Directory to pull into",
        default: ".",
      });
    },
    async (argv) => {
      try {
        await pull(argv.dir);
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    }
  )
  .command(
    "config",
    "Configure psync settings",
    (yargs) => {
      yargs
        .option("global", {
          describe: "Configure global settings",
          type: "boolean",
          default: false,
        })
        .option("aws-access-key", {
          describe: "AWS Access Key ID",
          type: "string",
        })
        .option("aws-secret-key", {
          describe: "AWS Secret Access Key",
          type: "string",
        })
        .option("aws-region", {
          describe: "AWS Region",
          type: "string",
          default: "ap-south-1",
        })
        .option("bucket", {
          describe: "S3 Bucket name",
          type: "string",
        })
        .option("project-name", {
          describe: "Project name (for local config only)",
          type: "string",
        });
    },
    (argv) => {
      try {
        const configData = {};

        if (argv.awsAccessKey || argv.awsSecretKey || argv.awsRegion) {
          configData.aws = {
            accessKeyId: argv.awsAccessKey,
            secretAccessKey: argv.awsSecretKey,
            region: argv.awsRegion,
          };
        }

        if (argv.bucket) {
          configData.bucket = argv.bucket;
        }

        if (argv.projectName) {
          configData.projectName = argv.projectName;
        }

        if (Object.keys(configData).length === 0) {
          console.log(chalk.yellow("No configuration options provided."));
          return;
        }

        if (argv.global) {
          config.setGlobalConfig(configData);
          console.log(chalk.green("✅ Global configuration updated."));
        } else {
          config.setProjectConfig(configData);
          console.log(chalk.green("✅ Project configuration updated."));
        }
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    }
  )
  .demandCommand()
  .help().argv;
