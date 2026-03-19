import { Router, Request, Response } from 'express';
import { db, admin } from '../lib/firebase';
import { uploadToSupabase, deleteFromSupabase } from '../lib/supabase';
import { deleteFromCloudinary } from '../lib/cloudinary'; // ยังใช้ลบไฟล์เก่าบน Cloudinary
import multer from 'multer';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

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

    // 1. อัปโหลดไฟล์ไป Supabase Storage
    const filesData: any[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('📤 Uploading files to Supabase Storage...');
      for (const file of uploadedFiles) {
        try {
          // แปลง originalname จาก Latin-1 → UTF-8 เพื่อรองรับชื่อไฟล์ภาษาไทย
          const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          const result = await uploadToSupabase(file.buffer, decodedName, file.mimetype);
          filesData.push({
            file_name: decodedName,
            fileURL: result.url,   // public URL เปิดได้โดยตรง
            storage_path: result.path, // เก็บ path ไว้ลบทีหลัง
            file_size: result.bytes,
            mime_type: file.mimetype,
          });
          console.log(`   ✅ Uploaded: ${decodedName} → ${result.url}`);
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
        file_name:    f.file_name,
        fileURL:      f.fileURL,
        storage_path: f.storage_path, // Supabase path สำหรับลบ
        file_size:    f.file_size,
        mime_type:    f.mime_type,
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
          file_id:      fileDocRef.id,
          news_id:      newsRef.id,
          file_name:    f.file_name,
          fileURL:      f.fileURL,      // Supabase public URL
          storage_path: f.storage_path, // Supabase path สำหรับลบ
          file_size:    f.file_size,
          mime_type:    f.mime_type,
          upload_time:  admin.firestore.FieldValue.serverTimestamp(),
          upload_by:    author_id || 'admin_001',
        });
      }
      await batch.commit();
      console.log(`✅ Created ${filesData.length} News_Files documents`);
    }

    // 4. ดึง Push Tokens ตาม mode: all / group / personal
    let allTokens: string[] = [];
    if (student_id_target) {
      // โหมด personal — ส่งให้คนเดียว
      // ลอง document ID ก่อน
      const studentDocById = await db.collection('Student').doc(student_id_target).get();
      if (studentDocById.exists) {
        const token = studentDocById.data()?.pushToken;
        if (token) allTokens.push(token);
        console.log(`👤 Personal (by docId) → token: ${token ? 'found' : 'not found'}`);
      } else {
        // fallback: ค้นหาจาก student_id field
        const snapByField = await db.collection('Student')
          .where('student_id', '==', student_id_target).get();
        if (!snapByField.empty) {
          const token = snapByField.docs[0].data()?.pushToken;
          if (token) allTokens.push(token);
          console.log(`👤 Personal (by field) → token: ${token ? 'found' : 'not found'}`);
        } else {
          console.log(`⚠️ Personal → student not found: ${student_id_target}`);
        }
      }
    } else if (!group_id || group_id === 'all') {
      // โหมด all — ส่งทุกคนที่มี pushToken (ไม่ filter notificationEnabled)
      const [studentsSnap, teachersSnap] = await Promise.all([
        db.collection('Student').get(),
        db.collection('Teacher').get()
      ]);
      allTokens = [...studentsSnap.docs, ...teachersSnap.docs]
        .map(doc => doc.data().pushToken)
        .filter((t): t is string => !!t && t.length > 0);
      console.log(`📢 All mode → ${allTokens.length} tokens`);
    } else {
      // โหมด group — ส่งเฉพาะกลุ่ม
      const groupDoc = await db.collection('Group_Notification').doc(group_id).get();
      const studentIds: string[] = groupDoc.exists ? (groupDoc.data()?.student_id || []) : [];
      console.log(`👥 Group mode → group: ${group_id}, members: ${studentIds.length}`);

      // student_id array ใน Group_Notification อาจเป็น document ID หรือ student_id field
      // ลอง query ทั้งสองแบบ
      for (let i = 0; i < studentIds.length; i += 10) {
        const chunk = studentIds.slice(i, i + 10);
        // แบบที่ 1: student_id เป็น Firestore document ID
        const snapById = await db.collection('Student')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapById.docs.forEach(doc => {
          const token = doc.data().pushToken;
          if (token) allTokens.push(token);
        });
        // แบบที่ 2: student_id เป็น field (fallback)
        if (snapById.empty) {
          const snapByField = await db.collection('Student')
            .where('student_id', 'in', chunk).get();
          snapByField.docs.forEach(doc => {
            const token = doc.data().pushToken;
            if (token) allTokens.push(token);
          });
        }
      }

      // ถ้าไม่เจอเลย ลอง query จาก group_ids field ใน Student document
      if (allTokens.length === 0) {
        console.log(`⚠️ Fallback: query Student.group_ids contains ${group_id}`);
        const snapByGroupIds = await db.collection('Student')
          .where('group_ids', 'array-contains', group_id).get();
        snapByGroupIds.docs.forEach(doc => {
          const token = doc.data().pushToken;
          if (token) allTokens.push(token);
        });
      }
    }

    // 5. ส่ง Push Notifications (รองรับทั้ง Expo และ FCM token)
    const expo = new Expo();
    const tokens = [...new Set(allTokens)];
    const notifTitle  = title || 'ข่าวใหม่';
    const notifBody   = content && content.length > 80 ? content.substring(0, 80) + '...' : content || 'มีข่าวสารใหม่';
    const notifData   = { type: 'news', news_id: newsRef.id };

    const expoTokens = tokens.filter(t => Expo.isExpoPushToken(t));
    const fcmTokens  = tokens.filter(t => !Expo.isExpoPushToken(t));
    let successCount = 0, errorCount = 0;

    // ส่งผ่าน Expo Push API
    if (expoTokens.length > 0) {
      const messages: ExpoPushMessage[] = expoTokens.map(token => ({
        to: token, sound: 'default' as const, title: notifTitle, body: notifBody,
        data: notifData, priority: 'high' as const, channelId: 'default',
      }));
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          tickets.forEach(t => { if (t.status === 'ok') successCount++; else errorCount++; });
        } catch { errorCount += chunk.length; }
      }
    }

    // ส่งผ่าน FCM (legacy tokens)
    for (const token of fcmTokens) {
      try {
        const result = await admin.messaging().send({
          notification: { title: notifTitle, body: notifBody },
          data: notifData, token,
          android: { priority: 'high' as const, notification: { sound: 'default', channelId: 'default' } },
        });
        console.log(`✅ FCM sent: ${result}`);
        successCount++;
      } catch (e: any) {
        console.error(`❌ FCM error for token ${String(token).substring(0,20)}...: ${e.message}`);
        errorCount++;
      }
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

      // ลบไฟล์ — รองรับทั้ง Supabase (ใหม่) และ Cloudinary (เก่า)
      for (const f of files) {
        if (f.storage_path) {
          // ไฟล์ใหม่ — อยู่บน Supabase
          try {
            await deleteFromSupabase(f.storage_path);
          } catch (e) {
            console.warn('⚠️ Could not delete from Supabase:', f.storage_path);
          }
        } else if (f.public_id) {
          // ไฟล์เก่า — อยู่บน Cloudinary
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
