import { Request, Response, Router } from 'express';
import admin from 'firebase-admin';

const router = Router();

/**
 * GET /api/notifications/test
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Notifications API is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/notifications/send
 * ส่ง Push Notification ผ่าน FCM
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { title, body, targetGroup = 'all', newsId } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ title และ body'
      });
    }

    console.log('=====================================');
    console.log('📤 SENDING NOTIFICATION');
    console.log('=====================================');
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Target:', targetGroup);
    console.log('-------------------------------------');

    const db = admin.firestore();
    const allTokens: string[] = [];

    // ดึง Students
    if (targetGroup === 'all' || targetGroup === 'students') {
      const studentsSnapshot = await db
        .collection('Student')
        .where('notificationEnabled', '==', true)
        .get();

      studentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pushToken) {
          allTokens.push(data.pushToken);
        }
      });
    }

    // ดึง Teachers
    if (targetGroup === 'all' || targetGroup === 'teachers') {
      const teachersSnapshot = await db
        .collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();

      teachersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pushToken) {
          allTokens.push(data.pushToken);
        }
      });
    }

    // ลบ Token ซ้ำออก
    const tokens = [...new Set(allTokens)];

    console.log(`📊 Found ${allTokens.length} total tokens, ${tokens.length} unique tokens`);
    
    if (allTokens.length !== tokens.length) {
      console.log(`⚠️ WARNING: Found ${allTokens.length - tokens.length} duplicate tokens!`);
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // ส่งผ่าน FCM
    if (tokens.length > 0) {
      console.log('🚀 Sending via FCM...');
      
      for (const token of tokens) {
        try {
          await admin.messaging().send({
            token: token,
            notification: {
              title: title,
              body: body,
            },
            data: {
              type: newsId ? 'news' : 'general',
              news_id: newsId || '',
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'default',
              },
            },
          });
          
          sentCount++;
          console.log(`   ✅ Sent to ${token.substring(0, 20)}...`);
        } catch (error: any) {
          failedCount++;
          errors.push(error.message);
          console.error(`   ❌ Failed for ${token.substring(0, 20)}:`, error.message);
        }
      }
    }

    console.log(`\n=====================================`);
    console.log(`✅ NOTIFICATION RESULTS:`);
    console.log(`   Sent: ${sentCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Total tokens: ${tokens.length}`);
    if (errors.length > 0) {
      console.log(`\n❌ Errors (first 5):`);
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }
    console.log(`=====================================\n`);

    res.json({
      success: true,
      sentCount: sentCount,
      failedCount: failedCount,
      totalTokens: tokens.length,
      message: `Sent to ${sentCount} devices`,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
