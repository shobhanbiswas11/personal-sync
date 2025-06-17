const {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const config = require("./config");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

class S3Manager {
  constructor() {
    const globalConfig = config.getGlobalConfig();
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: globalConfig.aws.accessKeyId,
        secretAccessKey: globalConfig.aws.secretAccessKey,
      },
      region: globalConfig.aws.region,
    });
    this.bucket = globalConfig.bucket;
  }

  async checkProjectExists(projectName) {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: `${projectName}/latest.zip`,
        })
      );
      return true;
    } catch (error) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async listProjects() {
    try {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Delimiter: "/",
        })
      );

      return response.CommonPrefixes
        ? response.CommonPrefixes.map((prefix) =>
            prefix.Prefix.replace("/", "")
          )
        : [];
    } catch (error) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  async uploadFile(filePath, key) {
    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: require("fs").createReadStream(filePath),
        },
      });

      await upload.done();
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(key, destinationPath) {
    try {
      console.log(chalk.blue(`📥 Downloading ${key}...`));
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      const stream = response.Body;
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Ensure the directory exists
      const dir = path.dirname(destinationPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(destinationPath, buffer);
      console.log(chalk.green(`✅ Downloaded ${key} successfully`));
    } catch (error) {
      if (error.name === "NoSuchKey") {
        throw new Error(`File ${key} does not exist in S3`);
      }
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
}

module.exports = S3Manager;
