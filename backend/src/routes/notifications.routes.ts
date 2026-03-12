import { Request, Response, Router } from 'express';
import admin from 'firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const router = Router();
const expo = new Expo();

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
 * ส่ง Push Notification ผ่าน Expo Push API
 * รองรับทั้ง ExponentPushToken และ FCM token
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

    const db = admin.firestore();
    const allTokens: string[] = [];

    // ดึง tokens จาก Student
    if (targetGroup === 'all' || targetGroup === 'students') {
      const snap = await db.collection('Student')
        .where('notificationEnabled', '==', true)
        .get();
      snap.forEach(doc => {
        const t = doc.data().pushToken;
        if (t) allTokens.push(t);
      });
    }

    // ดึง tokens จาก Teacher
    if (targetGroup === 'all' || targetGroup === 'teachers') {
      const snap = await db.collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();
      snap.forEach(doc => {
        const t = doc.data().pushToken;
        if (t) allTokens.push(t);
      });
    }

    const tokens = [...new Set(allTokens)];
    console.log(`📊 Unique tokens: ${tokens.length}`);

    if (tokens.length === 0) {
      return res.json({
        success: true,
        sentCount: 0,
        failedCount: 0,
        totalTokens: 0,
        message: 'ไม่มีอุปกรณ์ที่เปิดรับการแจ้งเตือน'
      });
    }

    // แยก Expo tokens และ FCM tokens
    const expoTokens = tokens.filter(t => Expo.isExpoPushToken(t));
    const fcmTokens  = tokens.filter(t => !Expo.isExpoPushToken(t));

    console.log(`   Expo tokens: ${expoTokens.length}`);
    console.log(`   FCM tokens:  ${fcmTokens.length}`);

    let sentCount   = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // ─── ส่งผ่าน Expo Push API ─────────────────────────────────────────────
    if (expoTokens.length > 0) {
      const messages: ExpoPushMessage[] = expoTokens.map(token => ({
        to: token,
        sound: 'default' as const,
        title,
        body,
        data: {
          type: newsId ? 'news' : 'general',
          news_id: newsId || '',
        },
        priority: 'high' as const,
        channelId: 'default',
      }));

      // Expo batches ไม่เกิน 100 ต่อ request
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
          tickets.forEach((ticket, i) => {
            if (ticket.status === 'ok') {
              sentCount++;
            } else {
              failedCount++;
              errors.push(`Expo: ${(ticket as any).message || 'unknown error'} (${expoTokens[i]?.substring(0, 30)})`);
            }
          });
        } catch (err: any) {
          failedCount += chunk.length;
          errors.push(`Expo chunk error: ${err.message}`);
        }
      }
    }

    // ─── ส่งผ่าน FCM (legacy tokens ที่ยังเหลืออยู่) ─────────────────────
    if (fcmTokens.length > 0) {
      for (const token of fcmTokens) {
        try {
          await admin.messaging().send({
            token,
            notification: { title, body },
            data: {
              type: newsId ? 'news' : 'general',
              news_id: newsId || '',
            },
            android: {
              priority: 'high',
              notification: { sound: 'default', channelId: 'default' },
            },
          });
          sentCount++;
        } catch (err: any) {
          failedCount++;
          errors.push(`FCM: ${err.message}`);
        }
      }
    }

    console.log(`✅ Sent: ${sentCount} | Failed: ${failedCount}`);
    if (errors.length) console.log('Errors (first 5):', errors.slice(0, 5));
    console.log('=====================================\n');

    res.json({
      success: true,
      sentCount,
      failedCount,
      totalTokens: tokens.length,
      message: `Sent to ${sentCount} devices`,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
