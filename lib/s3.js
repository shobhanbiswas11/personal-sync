const AWS = require("aws-sdk");
const config = require("./config");

class S3Manager {
  constructor() {
    const globalConfig = config.getGlobalConfig();
    this.s3 = new AWS.S3({
      accessKeyId: globalConfig.aws.accessKeyId,
      secretAccessKey: globalConfig.aws.secretAccessKey,
      region: globalConfig.aws.region,
    });
    this.bucket = globalConfig.bucket;
  }

  async checkProjectExists(projectName) {
    try {
      await this.s3
        .headObject({
          Bucket: this.bucket,
          Key: `${projectName}/latest.zip`,
        })
        .promise();
      return true;
    } catch (error) {
      if (error.code === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async listProjects() {
    try {
      const response = await this.s3
        .listObjectsV2({
          Bucket: this.bucket,
          Delimiter: "/",
        })
        .promise();

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
      await this.s3
        .upload({
          Bucket: this.bucket,
          Key: key,
          Body: require("fs").createReadStream(filePath),
        })
        .promise();
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(key, destinationPath) {
    try {
      const response = await this.s3
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      require("fs").writeFileSync(destinationPath, response.Body);
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
}

module.exports = S3Manager;
