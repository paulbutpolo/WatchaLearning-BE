// const Minio = require("minio");
// require("dotenv").config();


// // **MinIO Setup**
// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT,
//   port: process.env.MINIO_PORT,
//   useSSL: false,
//   accessKey: process.env.MINIO_ACCESS_KEY,
//   secretKey: process.env.MINIO_SECRET_KEY,
// });

// const bucketName = process.env.MINIO_BUCKET_NAME;

// const initializeBucket = async () => {
//   const exists = await minioClient.bucketExists(bucketName);
//   if (!exists) {
//     await minioClient.makeBucket(bucketName, "us-east-1");
//     console.log(`Bucket "${bucketName}" created.`);
//   }
// };

// module.exports = { minioClient, bucketName, initializeBucket };


const Minio = require("minio");
require("dotenv").config();

// **MinIO Setup**
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT, 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET_NAME;

const publicBucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${bucketName}/*`],
    },
  ],
};

const initializeBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log(`Bucket "${bucketName}" created.`);
    }

    // Set public policy
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(publicBucketPolicy));
    console.log(`Bucket "${bucketName}" is now public.`);
  } catch (error) {
    console.error("Error initializing bucket:", error);
  }
};

module.exports = { minioClient, bucketName, initializeBucket };
