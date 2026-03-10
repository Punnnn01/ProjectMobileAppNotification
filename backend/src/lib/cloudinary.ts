import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * อัปโหลด Buffer ไป Cloudinary
 * คืนค่า { url, public_id, original_filename, bytes, format }
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<{
  url: string;
  public_id: string;
  original_filename: string;
  bytes: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    // กำหนด resource_type ตามชนิดไฟล์
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (mimetype.startsWith('image/')) resourceType = 'image';
    else if (mimetype.startsWith('video/')) resourceType = 'video';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'news_files',
        use_filename: true,
        unique_filename: true,
        // สำหรับ raw file (PDF, Word, Excel ฯลฯ) ให้ access ได้โดยตรง
        access_mode: 'public',
      },
      (error: any, result: any) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          original_filename: originalName,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * ลบไฟล์ออกจาก Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, mimetype?: string): Promise<void> {
  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (mimetype?.startsWith('image/')) resourceType = 'image';
  else if (mimetype?.startsWith('video/')) resourceType = 'video';

  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export default cloudinary;
