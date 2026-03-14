import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl     = process.env.SUPABASE_URL        || '';
const supabaseKey     = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET_NAME     = 'news-files';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * อัปโหลดไฟล์ขึ้น Supabase Storage
 * คืน public URL ที่เปิดได้โดยตรง ไม่มีปัญหา /raw/upload/
 */
export async function uploadToSupabase(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<{
  url: string;
  path: string;
  bytes: number;
}> {
  // สร้างชื่อไฟล์ที่ปลอดภัย
  const safeFilename = originalName
    .replace(/[^a-zA-Z0-9ก-๛._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const filePath = `${Date.now()}_${safeFilename}`;

  console.log(`📤 Uploading to Supabase: ${filePath}`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    console.error('❌ Supabase upload error:', error);
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // ดึง public URL — เปิดได้โดยตรงเลย ไม่ต้องทำ proxy
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  console.log(`✅ Uploaded: ${urlData.publicUrl}`);

  return {
    url:   urlData.publicUrl,
    path:  data.path,
    bytes: buffer.length,
  };
}

/**
 * ลบไฟล์จาก Supabase Storage
 */
export async function deleteFromSupabase(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.warn('⚠️ Supabase delete error:', error.message);
  } else {
    console.log('🗑️ Deleted from Supabase:', filePath);
  }
}
