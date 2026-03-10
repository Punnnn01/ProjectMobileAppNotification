import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db, admin } from '../lib/firebase';

const router = Router();

// ตั้งค่า multer สำหรับรับไฟล์
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * POST /api/schedule
 * รับข้อมูลตารางสอบและอัพโหลดไฟล์
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { title, description, examDate } = req.body;
    const file = req.file;

    console.log('=====================================');
    console.log('📅 CREATING EXAM SCHEDULE');
    console.log('=====================================');
    console.log('Title:', title);
    console.log('Exam Date:', examDate);
    console.log('File:', file ? file.originalname : 'No file');
    console.log('-------------------------------------');

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    // 1. อัพโหลดไฟล์ไป Firebase Storage (ถ้ามี)
    if (file) {
      console.log('📤 Uploading file to Firebase Storage...');
      const bucket = admin.storage().bucket();
      
      try {
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageFileName = `schedule/${timestamp}_${sanitizedName}`;
        const fileRef = bucket.file(storageFileName);

        // Upload file
        await fileRef.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname
            }
          },
        });

        // สร้าง Public URL
        await fileRef.makePublic();
        fileUrl = `https://storage.googleapis.com/${bucket.name}/${storageFileName}`;
        fileName = file.originalname;
        fileSize = file.size;

        console.log(`   ✅ Uploaded: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);
      } catch (error: any) {
        console.error(`   ❌ Failed to upload file:`, error.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload file: ' + error.message
        });
      }
    }

    // 2. สร้าง Schedule document
    const scheduleRef = db.collection('schedule').doc();
    const scheduleData = {
      schedule_id: scheduleRef.id,
      title: title || 'ตารางสอบ',
      description: description || '',
      examDate: examDate || null,
      file: fileUrl ? {
        name: fileName,
        url: fileUrl,
        size: fileSize
      } : null,
      time: admin.firestore.FieldValue.serverTimestamp(),
      author: {
        admin_id: 'admin_001',
        admin_name: 'Admin'
      }
    };

    await scheduleRef.set(scheduleData);
    console.log('✅ Schedule created:', scheduleRef.id);

    console.log('=====================================');
    console.log('✅ EXAM SCHEDULE CREATED');
    console.log('=====================================\n');

    res.status(201).json({
      success: true,
      message: 'Exam schedule created',
      schedule: {
        id: scheduleRef.id,
        title: scheduleData.title,
        file: fileUrl ? fileName : null
      }
    });

  } catch (error: any) {
    console.error('❌ ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/schedule/test
 * ทดสอบว่า API ทำงาน
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Schedule API is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/schedule
 * ดึงตารางสอบทั้งหมด
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const scheduleSnapshot = await db.collection('schedule')
      .orderBy('time', 'desc')
      .limit(50)
      .get();

    const schedules = scheduleSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: schedules.length,
      schedules
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
