import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';
import { cleanCloudinaryUrl } from '../lib/cloudinary';

const router = Router();

/**
 * GET /api/news-files/:news_id
 * ดึงรายการไฟล์ทั้งหมดของข่าวนั้น จาก News_Files collection
 * พร้อม clean URL (ตัด fl_attachment ออก) ก่อนส่งให้ mobile
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

    const files = snap.docs.map(doc => {
      const data = doc.data();
      return {
        file_id:   doc.id,
        news_id:   data.news_id,
        file_name: data.file_name,
        fileURL:   cleanCloudinaryUrl(data.fileURL || ''),
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

export default router;
