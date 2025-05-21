const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
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

    this.client = new S3Client({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      region: credentials.region,
    });
    this.bucket = config.getBucketName();
  }

  async uploadFile(filePath, key) {
    const fileContent = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: "application/zip",
    });

    await this.client.send(command);
  }

  async downloadFile(key, filePath) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const fileStream = fs.createWriteStream(filePath);

      // Convert the readable stream to a buffer and write to file
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, buffer);

      return true;
    } catch (error) {
      if (error.name === "NoSuchKey") {
        throw new Error(`No file found at ${key}`);
      }
      throw error;
    }
  }

  async listFiles(prefix) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return response.Contents || [];
  }
}

module.exports = S3Manager;
