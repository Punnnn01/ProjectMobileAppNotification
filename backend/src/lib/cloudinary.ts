import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ตัด fl_attachment ออกจาก Cloudinary URL
 * เพื่อให้ URL เปิดดูได้โดยตรง ไม่บังคับดาวน์โหลด
 */
export function cleanCloudinaryUrl(url: string): string {
  if (!url) return url;
  return url
    .replace('/upload/fl_attachment/', '/upload/')
    .replace('/upload/fl_attachment,', '/upload/');
}

/**
 * อัปโหลด Buffer ไป Cloudinary
 * - image → resource_type: image
 * - เอกสาร → resource_type: raw, flags: attachment:false (ไม่บังคับดาวน์โหลด)
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
    // สร้าง public_id จากชื่อไฟล์จริง (safe)
    const safeFilename = originalName
      .replace(/[^a-zA-Z0-9ก-๛._-]/g, '_')
      .replace(/_{2,}/g, '_');
    const uniqueId = `${Date.now()}_${safeFilename}`;

    const uploadOptions: any = {
      // ใช้ 'auto' ให้ Cloudinary เลือก resource_type ที่เหมาะสมเอง
      // image → /image/upload/, video → /video/upload/, เอกสาร → /raw/upload/
      // แต่ Cloudinary จะจัดการ Content-Type และ serve ให้ถูกต้องกว่าการกำหนดเอง
      resource_type: 'auto',
      folder: 'news_files',
      public_id: uniqueId,
      use_filename: false,
      unique_filename: false,
      access_mode: 'public',
      type: 'upload',
      // ไม่บังคับดาวน์โหลด — ให้ browser/mobile เปิดดูได้โดยตรง
      flags: 'attachment:false',
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: any, result: any) => {
        if (error || !result) return reject(error || new Error('Upload failed'));

        // clean URL ก่อนเก็บลง Firestore เผื่อ Cloudinary inject fl_attachment มา
        const cleanUrl = cleanCloudinaryUrl(result.secure_url);

        resolve({
          url: cleanUrl,
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
 * ใช้ mime_type เพื่อรู้ว่าไฟล์ถูกเก็บเป็น resource_type อะไรใน Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, mimetype?: string): Promise<void> {
  // ตอน upload ใช้ 'auto' ดังนั้น Cloudinary จะเก็บเป็น image/video/raw ตามนี้
  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (mimetype?.startsWith('image/')) resourceType = 'image';
  else if (mimetype?.startsWith('video/')) resourceType = 'video';

  // ลองลบตาม resource_type ที่เดามาก่อน
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    // ถ้าลบไม่สำเร็จ ลอง resource_type อื่น (fallback)
    const fallbacks: ('image' | 'video' | 'raw')[] = ['image', 'video', 'raw']
      .filter(t => t !== resourceType) as ('image' | 'video' | 'raw')[];
    for (const t of fallbacks) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: t });
        break;
      } catch { continue; }
    }
  }
}

export default cloudinary;
