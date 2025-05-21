#!/usr/bin/env node

const yargs = require("yargs");
const { push } = require("../lib/push");
const { pull } = require("../lib/pull");
const config = require("../lib/config");
const ProjectManager = require("../lib/project-manager");
const { default: chalk } = require("chalk");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Helper function to safely close readline
const safeClose = () => {
  if (rl && rl.close) {
    rl.close();
  }
};

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
        safeClose();
      } catch (error) {
        console.error("Error:", error.message);
        safeClose();
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
        safeClose();
      } catch (error) {
        console.error("Error:", error.message);
        safeClose();
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
        safeClose();
      } catch (error) {
        console.error("Error:", error.message);
        safeClose();
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
        safeClose();
      } catch (error) {
        console.error("Error:", error.message);
        safeClose();
        process.exit(1);
      }
    }
  )
  .command(
    "config",
    "Configure psync settings (one-time setup)",
    () => {},
    async () => {
      try {
        // Check if already configured
        const existingConfig = config.getGlobalConfig();
        if (existingConfig.aws?.accessKeyId) {
          const answer = await question(
            chalk.yellow(
              "AWS credentials already configured. Do you want to reconfigure? (y/N) "
            )
          );
          if (answer.toLowerCase() !== "y") {
            console.log(chalk.blue("Configuration unchanged."));
            safeClose();
            return;
          }
        }

        console.log(chalk.blue("\n🔧 PSync Configuration Setup\n"));
        console.log(chalk.yellow("Please enter your AWS credentials:\n"));

        const accessKeyId = await question(chalk.blue("AWS Access Key ID: "));
        const secretAccessKey = await question(
          chalk.blue("AWS Secret Access Key: ")
        );
        const region =
          (await question(chalk.blue("AWS Region (default: ap-south-1): "))) ||
          "ap-south-1";
        const bucket = await question(chalk.blue("S3 Bucket Name: "));

        if (!accessKeyId || !secretAccessKey || !bucket) {
          console.error(chalk.red("Error: All fields are required."));
          safeClose();
          process.exit(1);
        }

        const configData = {
          aws: {
            accessKeyId,
            secretAccessKey,
            region,
          },
          bucket,
        };

        config.setGlobalConfig(configData);
        console.log(chalk.green("\n✅ Configuration saved successfully!"));
        safeClose();
      } catch (error) {
        console.error("Error:", error.message);
        safeClose();
        process.exit(1);
      }
    }
  )
  .demandCommand()
  .help().argv;
