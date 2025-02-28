const Minio = require("minio");
require("dotenv").config();


// **MinIO Setup**
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: process.env.MINIO_PORT,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET_NAME;
console.log(bucketName)

const initializeBucket = async () => {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, "us-east-1");
    console.log(`Bucket "${bucketName}" created.`);
  }
};

module.exports = { minioClient, bucketName, initializeBucket };