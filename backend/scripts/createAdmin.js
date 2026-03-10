// Script สำหรับสร้าง Admin User แรก
// รันไฟล์นี้ 1 ครั้งเพื่อสร้าง Admin

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createFirstAdmin() {
  try {
    console.log('=== สร้าง Admin User แรก ===');
    
    // 1. สร้าง Auth User
    const email = 'admin@test.com';
    const password = 'admin123456';  // เปลี่ยนเป็นรหัสที่ปลอดภัย
    
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true
      });
      console.log('✓ สร้าง Auth User:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️ Email นี้มีอยู่แล้ว กำลังดึงข้อมูล...');
        userRecord = await auth.getUserByEmail(email);
        console.log('✓ ดึงข้อมูล User:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // 2. สร้าง Admin Document ใน Firestore
    const adminId = 'admin_001';
    const adminRef = db.collection('Admin').doc(adminId);
    
    await adminRef.set({
      admin_id: adminId,
      auth_uid: userRecord.uid,
      personal_info: {
        firstName: 'Admin',
        lastName: 'User',
        email: email,
        phone: '0812345678'
      },
      role: {
        role_id: 'admin',
        roleName: 'Admin'
      }
    });
    
    console.log('✓ สร้าง Admin Document สำเร็จ');
    console.log('');
    console.log('=== ข้อมูล Admin ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Auth UID:', userRecord.uid);
    console.log('Admin ID:', adminId);
    console.log('');
    console.log('✅ สามารถ login ด้วย email และ password นี้ได้แล้ว!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

createFirstAdmin();
