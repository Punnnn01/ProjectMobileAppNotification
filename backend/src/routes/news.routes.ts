import { Router, Request, Response } from 'express';
import { db, admin } from '../lib/firebase';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary';
import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * POST /api/news
 * สร้างข่าว + อัปโหลดไฟล์ไป Cloudinary + เก็บใน News_Files collection
 */
router.post('/', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const { title, content, category, author_id, author_name, author_role, group_id, student_id_target, links: linksRaw } = req.body;

    // parse links จาก JSON string ที่ส่งมาใน FormData
    let links: { label: string; url: string }[] = [];
    if (linksRaw) {
      try { links = JSON.parse(linksRaw); } catch { links = []; }
    }
    const uploadedFiles = req.files as Express.Multer.File[];

    console.log('📰 CREATING NEWS | author:', author_id, '| group:', group_id || 'all');
    console.log('📎 Files:', uploadedFiles?.length || 0);

    // 1. อัปโหลดไฟล์ไป Cloudinary
    const filesData: any[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('📤 Uploading files to Cloudinary...');
      for (const file of uploadedFiles) {
        try {
          // แปลง originalname จาก Latin-1 → UTF-8 เพื่อรองรับชื่อไฟล์ภาษาไทย
          const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          const result = await uploadToCloudinary(file.buffer, decodedName, file.mimetype);
          filesData.push({
            file_name: decodedName,
            fileURL: result.url,
            public_id: result.public_id,
            file_size: result.bytes,
            mime_type: file.mimetype,
            format: result.format,
          });
          console.log(`   ✅ Uploaded: ${file.originalname} → ${result.url}`);
        } catch (err: any) {
          console.error(`   ❌ Failed: ${file.originalname} — ${err.message}`);
        }
      }
    }

    // 2. สร้าง News document พร้อม files array embedded
    const newsRef = db.collection('News').doc();
    const newsData: any = {
      news_id: newsRef.id,
      title: title || 'ไม่มีหัวข้อ',
      content: content || '',
      category: category || 'general',
      time: admin.firestore.FieldValue.serverTimestamp(),
      author: {
        admin_id: author_id || 'admin_001',
        admin_name: author_name || 'Admin',
        role: author_role || 'admin'
      },
      group_id: student_id_target ? `personal_${student_id_target}` : (group_id || 'all'),
      student_id_target: student_id_target || null,
      files: filesData.map(f => ({
        file_name: f.file_name,
        fileURL: f.fileURL,
        public_id: f.public_id,
        file_size: f.file_size,
        mime_type: f.mime_type,
      })),
      links: links,
    };

    await newsRef.set(newsData);
    console.log('✅ News created:', newsRef.id);

    // 3. สร้าง News_Files documents แยก collection
    if (filesData.length > 0) {
      const batch = db.batch();
      for (const f of filesData) {
        const fileDocRef = db.collection('News_Files').doc();
        batch.set(fileDocRef, {
          file_id: fileDocRef.id,
          news_id: newsRef.id,
          file_name: f.file_name,
          fileURL: f.fileURL,
          public_id: f.public_id,
          file_size: f.file_size,
          mime_type: f.mime_type,
          upload_time: admin.firestore.FieldValue.serverTimestamp(),
          upload_by: author_id || 'admin_001',
        });
      }
      await batch.commit();
      console.log(`✅ Created ${filesData.length} News_Files documents`);
    }

    // 4. ดึง Push Tokens ตาม mode: all / group / personal
    let allTokens: string[] = [];
    if (student_id_target) {
      // โหมด personal — ส่งให้คนเดียว
      const studentDoc = await db.collection('Student').doc(student_id_target).get();
      const token = studentDoc.data()?.pushToken;
      if (token) allTokens.push(token);
      console.log(`👤 Personal mode → student: ${student_id_target}, token: ${token ? 'found' : 'not found'}`);
    } else if (!group_id || group_id === 'all') {
      // โหมด all — ส่งทุกคน
      const [studentsSnap, teachersSnap] = await Promise.all([
        db.collection('Student').where('notificationEnabled', '==', true).get(),
        db.collection('Teacher').where('notificationEnabled', '==', true).get()
      ]);
      allTokens = [...studentsSnap.docs, ...teachersSnap.docs]
        .map(doc => doc.data().pushToken)
        .filter((t): t is string => !!t);
      console.log(`📢 All mode → ${allTokens.length} tokens`);
    } else {
      // โหมด group — ส่งเฉพาะกลุ่ม
      const groupDoc = await db.collection('Group_Notification').doc(group_id).get();
      const studentIds: string[] = groupDoc.exists ? (groupDoc.data()?.student_id || []) : [];
      console.log(`👥 Group mode → group: ${group_id}, members: ${studentIds.length}`);
      for (let i = 0; i < studentIds.length; i += 10) {
        const chunk = studentIds.slice(i, i + 10);
        const snap = await db.collection('Student')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snap.docs.forEach(doc => {
          const token = doc.data().pushToken;
          if (token) allTokens.push(token);
        });
      }
    }

    // 5. ส่ง Push Notifications
    const tokens = [...new Set(allTokens)];
    let successCount = 0, errorCount = 0;
    for (const token of tokens) {
      try {
        await admin.messaging().send({
          notification: {
            title: title || 'ข่าวใหม่',
            body: content && content.length > 80 ? content.substring(0, 80) + '...' : content || 'มีข่าวสารใหม่',
          },
          data: { type: 'news', news_id: newsRef.id },
          token,
          android: { priority: 'high' as const, notification: { sound: 'default', channelId: 'default' } },
        });
        successCount++;
      } catch { errorCount++; }
    }

    console.log(`✅ Notifications: ${successCount} sent, ${errorCount} errors`);

    res.status(201).json({
      success: true,
      message: 'News created and notifications sent',
      news: { id: newsRef.id, title: newsData.title, filesUploaded: filesData.length },
      notification: { sent: tokens.length > 0, successCount, errorCount, totalTokens: tokens.length }
    });

  } catch (error: any) {
    console.error('❌ ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/news?author_id=xxx
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { author_id } = req.query;
    const snap = await db.collection('News').orderBy('time', 'desc').limit(200).get();
    let news = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    if (author_id && typeof author_id === 'string') {
      news = news.filter(n => n.author?.admin_id === author_id);
    }
    res.json({ success: true, count: news.length, news });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/news/test
 */
router.get('/test', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'News API is working!', timestamp: new Date().toISOString() });
});

/**
 * DELETE /api/news/:id
 * ลบข่าว + ลบไฟล์ใน Cloudinary + ลบ News_Files documents
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const newsDoc = await db.collection('News').doc(id).get();
    if (newsDoc.exists) {
      const files: any[] = newsDoc.data()?.files || [];

      // ลบไฟล์ออกจาก Cloudinary
      for (const f of files) {
        if (f.public_id) {
          try {
            await deleteFromCloudinary(f.public_id, f.mime_type);
            console.log('🗑️ Deleted from Cloudinary:', f.public_id);
          } catch (e) {
            console.warn('⚠️ Could not delete from Cloudinary:', f.public_id);
          }
        }
      }

      // ลบ News_Files documents
      const filesSnap = await db.collection('News_Files').where('news_id', '==', id).get();
      if (!filesSnap.empty) {
        const batch = db.batch();
        filesSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑️ Deleted ${filesSnap.size} News_Files documents`);
      }
    }

    await db.collection('News').doc(id).delete();
    console.log('✅ News deleted:', id);

    res.json({ success: true, message: 'News deleted successfully', newsId: id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
