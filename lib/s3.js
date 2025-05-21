const AWS = require("aws-sdk");
const config = require("./config");
const fs = require("fs");

class S3Manager {
  constructor() {
    const credentials = config.getAwsCredentials();
    if (!credentials) {
      throw new Error(
        "AWS credentials not found. Please configure them using 'psync config'"
      );
    }

    this.s3 = new AWS.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region,
    });
    this.bucket = config.getBucketName();
  }

  async uploadFile(filePath, key) {
    const fileContent = fs.readFileSync(filePath);
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: "application/zip",
      })
      .promise();
  }

  async downloadFile(key, filePath) {
    try {
      const response = await this.s3
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      fs.writeFileSync(filePath, response.Body);
      return true;
    } catch (error) {
      if (error.code === "NoSuchKey") {
        throw new Error(`No file found at ${key}`);
      }
      throw error;
    }
  }

  async listFiles(prefix) {
    const response = await this.s3
      .listObjectsV2({
        Bucket: this.bucket,
        Prefix: prefix,
      })
      .promise();

    return response.Contents || [];
  }
}

module.exports = S3Manager;
