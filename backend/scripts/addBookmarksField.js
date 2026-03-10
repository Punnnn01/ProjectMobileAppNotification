/**
 * Migration Script: Add Bookmarks Field
 * 
 * เพิ่ม bookmarks[] field ให้ทุก documents ใน Student และ Teacher collections
 * 
 * วิธีรัน:
 * node backend/scripts/addBookmarksField.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addBookmarksField() {
  console.log('=====================================');
  console.log('🚀 MIGRATION: Add Bookmarks Field');
  console.log('=====================================\n');

  try {
    // 1. อัปเดต Student Collection
    console.log('📚 Processing Student Collection...');
    const studentsSnapshot = await db.collection('Student').get();
    console.log(`   Found ${studentsSnapshot.size} students`);

    const studentBatch = db.batch();
    let studentCount = 0;

    studentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (!data.hasOwnProperty('bookmarks')) {
        studentBatch.update(doc.ref, {
          bookmarks: []
        });
        studentCount++;
      }
    });

    if (studentCount > 0) {
      await studentBatch.commit();
      console.log(`✅ Updated ${studentCount} students`);
    } else {
      console.log('ℹ️  All students already have bookmarks field');
    }

    // 2. อัปเดต Teacher Collection
    console.log('\n👨‍🏫 Processing Teacher Collection...');
    const teachersSnapshot = await db.collection('Teacher').get();
    console.log(`   Found ${teachersSnapshot.size} teachers`);

    const teacherBatch = db.batch();
    let teacherCount = 0;

    teachersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (!data.hasOwnProperty('bookmarks')) {
        teacherBatch.update(doc.ref, {
          bookmarks: []
        });
        teacherCount++;
      }
    });

    if (teacherCount > 0) {
      await teacherBatch.commit();
      console.log(`✅ Updated ${teacherCount} teachers`);
    } else {
      console.log('ℹ️  All teachers already have bookmarks field');
    }

    // 3. สรุปผล
    console.log('\n=====================================');
    console.log('✅ MIGRATION COMPLETED');
    console.log('=====================================');
    console.log(`Students updated: ${studentCount}`);
    console.log(`Teachers updated: ${teacherCount}`);
    console.log(`Total updated: ${studentCount + teacherCount}`);
    console.log('=====================================\n');

    // แสดงตัวอย่าง Document
    if (studentsSnapshot.size > 0) {
      const sampleDoc = await db.collection('Student').limit(1).get();
      const sampleData = sampleDoc.docs[0].data();
      
      console.log('📋 Sample Student Document:');
      console.log(JSON.stringify({
        student_id: sampleData.student_id || 'N/A',
        bookmarks: sampleData.bookmarks || []
      }, null, 2));
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// รัน migration
addBookmarksField();
