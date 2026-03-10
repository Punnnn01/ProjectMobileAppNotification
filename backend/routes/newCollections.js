// API Routes สำหรับ Collections ใหม่
// เพิ่ม routes เหล่านี้ใน server.js: app.use(require('./routes/newCollections'));

const express = require('express');
const router = express.Router();
const {
  createNotification,
  createSubject,
  createNews,
  createMessage,
  createAdviser,
  createAppointment,
  createAdmin,
  assignAdviserToStudent
} = require('../utils/databaseHelper');

const admin = require('firebase-admin');
const db = admin.firestore();

// ============================================
// NEWS API
// ============================================

// สร้างข่าวใหม่
router.post('/api/news', async (req, res) => {
  try {
    const { title, content, category, adminId, adminName } = req.body;
    
    const newsId = await createNews({
      title,
      content,
      category,
      adminId,
      adminName
    });
    
    res.json({ success: true, newsId });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ดึงข่าวทั้งหมด
router.get('/api/news', async (req, res) => {
  try {
    const newsSnapshot = await db.collection('News')
      .orderBy('time', 'desc')
      .limit(50)
      .get();
    
    const news = newsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, news });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// NOTIFICATION API
// ============================================

// สร้างการแจ้งเตือนใหม่
router.post('/api/notifications', async (req, res) => {
  try {
    const { title, body, type, targetUsers } = req.body;
    
    const notifId = await createNotification({
      title,
      body,
      type,
      read: false
    });
    
    // เพิ่ม notification_id ให้กับ users
    if (targetUsers && targetUsers.length > 0) {
      const batch = db.batch();
      
      for (const userId of targetUsers) {
        const userType = userId.startsWith('65') ? 'Student' : 'Teacher';
        const userRef = db.collection(userType).doc(userId);
        batch.update(userRef, {
          notification: admin.firestore.FieldValue.arrayUnion(notifId)
        });
      }
      
      await batch.commit();
    }
    
    res.json({ success: true, notifId });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
