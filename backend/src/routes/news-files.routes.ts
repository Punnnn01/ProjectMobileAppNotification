import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';

const router = Router();

/**
 * GET /api/news-files/:news_id
 * ดึงรายการไฟล์ทั้งหมดของข่าวนั้น จาก News_Files collection
 * ส่ง metadata + download URL ผ่าน backend กลับให้ mobile
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
      return {
        file_id:   doc.id,
        news_id:   data.news_id,
        file_name: data.file_name,
        // ชี้ให้ mobile download ผ่าน backend proxy แทน Cloudinary โดยตรง
        fileURL:   `${BACKEND_URL}/api/news-files/download/${doc.id}`,
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
 * Proxy ดึงไฟล์จาก Cloudinary แล้ว stream ส่งให้ mobile
 * mobile จะได้รับไฟล์จริงพร้อม Content-Type ที่ถูกต้อง
 */
router.get('/download/:file_id', async (req: Request, res: Response) => {
  try {
    const { file_id } = req.params;

    // ดึง metadata ไฟล์จาก Firestore
    const fileDoc = await db.collection('News_Files').doc(file_id).get();
    if (!fileDoc.exists) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const fileData = fileDoc.data()!;
    const cloudinaryUrl: string = fileData.fileURL || '';
    const fileName: string      = fileData.file_name || 'file';
    const mimeType: string      = fileData.mime_type || 'application/octet-stream';

    if (!cloudinaryUrl) {
      res.status(404).json({ success: false, error: 'File URL not found' });
      return;
    }

    console.log(`⬇️ Proxying file: ${fileName} from ${cloudinaryUrl}`);

    // ดึงไฟล์จาก Cloudinary
    const cloudRes = await fetch(cloudinaryUrl);
    if (!cloudRes.ok) {
      throw new Error(`Cloudinary fetch failed: HTTP ${cloudRes.status}`);
    }

    // ตั้งค่า header ให้ browser/mobile รู้ว่านี่คือไฟล์อะไร
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 วัน
    res.setHeader('Access-Control-Allow-Origin', '*');

    // stream ไฟล์ตรงๆ ไม่ต้องโหลดทั้งหมดเข้า memory
    if (cloudRes.body) {
      const { Readable } = await import('stream');
      // @ts-ignore — Node.js ReadableStream → Readable
      const nodeStream = Readable.fromWeb(cloudRes.body as any);
      nodeStream.pipe(res);
      nodeStream.on('error', (err) => {
        console.error('❌ Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Stream error' });
        }
      });
    } else {
      // fallback สำหรับ Node version เก่า
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
