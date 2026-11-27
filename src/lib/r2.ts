import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const bucketName = process.env.R2_BUCKET_NAME || "";
export const publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadToR2({
  fileBuffer,
  fileName,
  contentType,
  folder = "uploads",
}: {
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<string> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}_${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return public URL
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
}

export async function deleteFromR2(fileUrlOrKey: string): Promise<boolean> {
  if (!fileUrlOrKey) return false;
  let key = fileUrlOrKey;
  if (fileUrlOrKey.startsWith("http")) {
    try {
      const url = new URL(fileUrlOrKey);
      key = url.pathname.replace(/^\/+/, "");
      // If using path-style URL with bucketName prefix, strip bucketName/
      if (bucketName && key.startsWith(`${bucketName}/`)) {
        key = key.slice(bucketName.length + 1);
      }
    } catch {
      return false;
    }
  }
  if (!key) return false;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await r2Client.send(command);
  return true;
}
