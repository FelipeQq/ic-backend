import * as admin from 'firebase-admin';

type UploadImageResponse = {
  url: string;
  path: string;
};

export async function uploadImageFirebase(
  file: Express.Multer.File,
  path: string,
): Promise<UploadImageResponse> {
  const bucket = admin.storage().bucket();
  const bucketName = bucket.name;

  const fileRef = bucket.file(path);

  await fileRef.save(file.buffer, {
    contentType: file.mimetype,
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path,
  )}?alt=media`;

  return {
    url: publicUrl,
    path,
  };
}
