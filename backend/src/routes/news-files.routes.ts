import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';

const router = Router();

/**
 * GET /api/news-files/:news_id
 * ดึงรายการไฟล์ทั้งหมดของข่าวนั้น จาก News_Files collection
 * ไฟล์ใหม่ → Supabase public URL เปิดได้โดยตรง
 * ไฟล์เก่า → ยังใช้ Cloudinary URL เดิม (ผ่าน proxy)
 */
router.get('/:news_id', async (req: Request, res: Response) => {
  try {
    const { news_id } = req.params;

    if (!news_id) {
      res.status(400).json({ success: false, error: 'news_id is required' });
      return;
    }

    const snap = await db
      .collection('News_Files')
      .where('news_id', '==', news_id)
      .get();

    if (snap.empty) {
      res.json({ success: true, files: [] });
      return;
    }

    const BACKEND_URL = process.env.BACKEND_URL
      || 'https://projectmobileappnotification-production.up.railway.app';

    const files = snap.docs.map(doc => {
      const data = doc.data();
      const isSupabase = !!data.storage_path; // ไฟล์ใหม่มี storage_path

      return {
        file_id:   doc.id,
        news_id:   data.news_id,
        file_name: data.file_name,
        // ไฟล์ใหม่ (Supabase) → ส่ง public URL ตรงๆ เปิดได้โดยตรง
        // ไฟล์เก่า (Cloudinary) → ส่งผ่าน proxy เหมือนเดิม
        fileURL: isSupabase
          ? data.fileURL
          : `${BACKEND_URL}/api/news-files/download/${doc.id}`,
        mime_type: data.mime_type || '',
        file_size: data.file_size || 0,
      };
    });

    console.log(`📁 GET news-files/${news_id} → ${files.length} files`);
    res.json({ success: true, files });

  } catch (error: any) {
    console.error('❌ GET news-files error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/news-files/download/:file_id
 * Proxy สำหรับไฟล์เก่าที่อยู่บน Cloudinary เท่านั้น
 * ไฟล์ใหม่ (Supabase) ไม่ต้องผ่านตรงนี้แล้ว
 */
router.get('/download/:file_id', async (req: Request, res: Response) => {
  try {
    const { file_id } = req.params;

    const fileDoc = await db.collection('News_Files').doc(file_id).get();
    if (!fileDoc.exists) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const fileData     = fileDoc.data()!;
    const fileURL      = fileData.fileURL || '';
    const fileName     = fileData.file_name || 'file';
    const mimeType     = fileData.mime_type || 'application/octet-stream';
    const isSupabase   = !!fileData.storage_path;

    // ไฟล์ใหม่ (Supabase) — redirect ไป public URL ตรงๆ ได้เลย
    if (isSupabase) {
      res.redirect(fileURL);
      return;
    }

    // ไฟล์เก่า (Cloudinary) — proxy stream
    if (!fileURL) {
      res.status(404).json({ success: false, error: 'File URL not found' });
      return;
    }

    console.log(`⬇️ Proxying old Cloudinary file: ${fileName}`);

    const cloudRes = await fetch(fileURL);
    if (!cloudRes.ok) {
      throw new Error(`Fetch failed: HTTP ${cloudRes.status}`);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (cloudRes.body) {
      const { Readable } = await import('stream');
      // @ts-ignore
      const nodeStream = Readable.fromWeb(cloudRes.body as any);
      nodeStream.pipe(res);
      nodeStream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
    } else {
      const buffer = Buffer.from(await cloudRes.arrayBuffer());
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }

  } catch (error: any) {
    console.error('❌ Download proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

export default router;
