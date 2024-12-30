import { makeS3Client, isS3ExpectedError } from "./generated/s3.js";

const s3 = makeS3Client();

const bucket = await s3("create_bucket", { Bucket: "asdsd" });

if (bucket._tag == "Success") {
  bucket.success.Location
}

if (isS3ExpectedError(bucket, "NotFound")) {
  
}

