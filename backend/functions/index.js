const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ฟังก์ชันส่ง Notification เมื่อมีข่าวใหม่
exports.sendNewsNotification = functions.firestore
  .document('News/{newsId}')
  .onCreate(async (snap, context) => {
    const newsData = snap.data();
    const newsId = context.params.newsId;

    console.log('📰 New news created:', newsId);
    console.log('   Title:', newsData.title);

    try {
      // ดึง FCM Tokens จากทุกคน (Student + Teacher)
      const tokens = [];

      // ดึงจาก Student
      const studentsSnapshot = await admin.firestore()
        .collection('Student')
        .where('notificationEnabled', '==', true)
        .get();

      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      // ดึงจาก Teacher
      const teachersSnapshot = await admin.firestore()
        .collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();

      teachersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      console.log('📱 Found', tokens.length, 'devices to notify');

      if (tokens.length === 0) {
        console.log('⚠️ No tokens found, skipping notification');
        return null;
      }

      // สร้าง Notification Message
      const message = {
        notification: {
          title: '📰 ข่าวใหม่จาก KU',
          body: newsData.title || 'มีข่าวสารใหม่',
        },
        data: {
          type: 'news',
          news_id: newsId,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      // ส่งแบบ batch (500 tokens/batch)
      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        batches.push(
          admin.messaging().sendMulticast({
            tokens: batch,
            ...message,
          })
        );
      }

      // รอให้ส่งครบทุก batch
      const results = await Promise.all(batches);

      let successCount = 0;
      let failureCount = 0;

      results.forEach(result => {
        successCount += result.successCount;
        failureCount += result.failureCount;
      });

      console.log('✅ Notifications sent successfully:', successCount);
      console.log('❌ Failed:', failureCount);

      return { success: successCount, failed: failureCount };

    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      return null;
    }
  });

// ฟังก์ชันส่ง Notification เมื่อมีตารางสอบใหม่
exports.sendExamNotification = functions.firestore
  .document('News/{newsId}')
  .onCreate(async (snap, context) => {
    const newsData = snap.data();
    
    // เช็คว่าเป็นข่าวประเภท exam หรือไม่
    if (newsData.category !== 'exam' && newsData.category !== 'ตารางสอบ') {
      console.log('ℹ️ Not an exam notification, skipping');
      return null;
    }

    const newsId = context.params.newsId;

    console.log('📅 New exam schedule created:', newsId);

    try {
      // ดึง FCM Tokens
      const tokens = [];

      const studentsSnapshot = await admin.firestore()
        .collection('Student')
        .where('notificationEnabled', '==', true)
        .get();

      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      const teachersSnapshot = await admin.firestore()
        .collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();

      teachersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      if (tokens.length === 0) {
        return null;
      }

      // ส่ง Notification
      const message = {
        notification: {
          title: '📅 ตารางสอบใหม่',
          body: newsData.title || 'มีตารางสอบใหม่',
        },
        data: {
          type: 'exam',
          news_id: newsId,
        },
      };

      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        batches.push(
          admin.messaging().sendMulticast({
            tokens: batch,
            ...message,
          })
        );
      }

      const results = await Promise.all(batches);

      let successCount = 0;
      results.forEach(result => {
        successCount += result.successCount;
      });

      console.log('✅ Exam notifications sent:', successCount);

      return { success: successCount };

    } catch (error) {
      console.error('❌ Error sending exam notifications:', error);
      return null;
    }
  });

// ฟังก์ชัน HTTP สำหรับส่ง Notification แบบ Manual (จาก Admin Web App)
exports.sendManualNotification = functions.https.onCall(async (data, context) => {
  // เช็ค Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to send notifications'
    );
  }

  const { title, body, type, newsId, targetGroup } = data;

  try {
    console.log('📤 Sending manual notification...');
    console.log('   Title:', title);
    console.log('   Target:', targetGroup);

    // ดึง Tokens ตาม targetGroup
    const tokens = [];

    if (targetGroup === 'all' || targetGroup === 'students') {
      const studentsSnapshot = await admin.firestore()
        .collection('Student')
        .where('notificationEnabled', '==', true)
        .get();

      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) tokens.push(data.fcmToken);
      });
    }

    if (targetGroup === 'all' || targetGroup === 'teachers') {
      const teachersSnapshot = await admin.firestore()
        .collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();

      teachersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) tokens.push(data.fcmToken);
      });
    }

    if (tokens.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No tokens found');
    }

    // ส่ง Notification
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: type || 'general',
        news_id: newsId || '',
      },
    };

    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      batches.push(
        admin.messaging().sendMulticast({
          tokens: batch,
          ...message,
        })
      );
    }

    const results = await Promise.all(batches);

    let successCount = 0;
    let failureCount = 0;

    results.forEach(result => {
      successCount += result.successCount;
      failureCount += result.failureCount;
    });

    console.log('✅ Manual notifications sent:', successCount);

    return { 
      success: true, 
      sentCount: successCount,
      failedCount: failureCount 
    };

  } catch (error) {
    console.error('❌ Error sending manual notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
