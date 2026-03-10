// Database Structure Helper
// ไฟล์นี้ใช้สำหรับสร้าง Collections และ Documents ตามโครงสร้างในภาพ

const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * สร้าง Collection: notification
 * Structure: {
 *   notification_id: string,
 *   time: Timestamp
 * }
 */
async function createNotification(notificationData) {
  const notificationRef = db.collection('notification').doc();
  await notificationRef.set({
    notification_id: notificationRef.id,
    time: admin.firestore.FieldValue.serverTimestamp(),
    ...notificationData
  });
  return notificationRef.id;
}

/**
 * สร้าง Collection: Subject
 * Structure: {
 *   subject_id: string,
 *   subjectName: string,
 *   subjectCode: string,
 *   schedule: Map,
 *   teacher: Array<string>,  // teacher_ids
 *   student: Array<string>   // student_ids
 * }
 */
async function createSubject(subjectData) {
  const { subjectCode, subjectName, schedule } = subjectData;
  const subjectRef = db.collection('Subject').doc(subjectCode);
  
  await subjectRef.set({
    subject_id: subjectCode,
    subjectName: subjectName,
    subjectCode: subjectCode,
    schedule: schedule || {},
    teacher: [],
    student: []
  });
  
  return subjectCode;
}

/**
 * สร้าง Collection: schedule
 * Structure: {
 *   day: number,
 *   startTime: string,
 *   endTime: string,
 *   room: string
 * }
 */
async function createSchedule(scheduleData) {
  const scheduleRef = db.collection('schedule').doc();
  await scheduleRef.set({
    day: scheduleData.day,
    startTime: scheduleData.startTime,
    endTime: scheduleData.endTime,
    room: scheduleData.room
  });
  return scheduleRef.id;
}

/**
 * สร้าง Collection: News
 * Structure: {
 *   news_id: string,
 *   title: string,
 *   content: string,
 *   category: string,
 *   time: Timestamp,
 *   author: Map { admin_id, admin_name }
 * }
 */
async function createNews(newsData) {
  const newsRef = db.collection('News').doc();
  await newsRef.set({
    news_id: newsRef.id,
    title: newsData.title,
    content: newsData.content,
    category: newsData.category || 'general',
    time: admin.firestore.FieldValue.serverTimestamp(),
    author: {
      admin_id: newsData.adminId,
      admin_name: newsData.adminName
    }
  });
  return newsRef.id;
}

/**
 * สร้าง Collection: Message
 * Structure: {
 *   message_id: string,
 *   user: Map { user_id, user_type, user_name },
 *   userText: string,
 *   botText: string,
 *   time: Timestamp
 * }
 */
async function createMessage(messageData) {
  const messageRef = db.collection('Message').doc();
  await messageRef.set({
    message_id: messageRef.id,
    user: {
      user_id: messageData.userId,
      user_type: messageData.userType,
      user_name: messageData.userName
    },
    userText: messageData.userText,
    botText: messageData.botText || '',
    time: admin.firestore.FieldValue.serverTimestamp()
  });
  return messageRef.id;
}

/**
 * สร้าง Collection: chat_history
 * Structure: {
 *   chat_id: string,
 *   time: Timestamp,
 *   message: Map
 * }
 */
async function createChatHistory(chatData) {
  const chatRef = db.collection('chat_history').doc();
  await chatRef.set({
    chat_id: chatRef.id,
    time: admin.firestore.FieldValue.serverTimestamp(),
    message: chatData.message || {}
  });
  return chatRef.id;
}

/**
 * สร้าง Collection: Adviser
 * Structure: {
 *   adviser_id: string,
 *   student_id: string,
 *   teacher_id: string,
 *   student_name: string,
 *   teacher_name: string,
 *   appointment: Array<string>  // appointment_ids
 * }
 */
async function createAdviser(adviserData) {
  const adviserRef = db.collection('Adviser').doc();
  await adviserRef.set({
    adviser_id: adviserRef.id,
    student_id: adviserData.studentId,
    teacher_id: adviserData.teacherId,
    student_name: adviserData.studentName,
    teacher_name: adviserData.teacherName,
    appointment: []
  });
  return adviserRef.id;
}

/**
 * สร้าง Collection: appointment
 * Structure: {
 *   appointment_id: string,
 *   date: string,
 *   time: string,
 *   note: string
 * }
 */
async function createAppointment(appointmentData) {
  const appointmentRef = db.collection('appointment').doc();
  await appointmentRef.set({
    appointment_id: appointmentRef.id,
    date: appointmentData.date,
    time: appointmentData.time,
    note: appointmentData.note || ''
  });
  return appointmentRef.id;
}

/**
 * สร้าง Collection: Admin
 * Structure: {
 *   admin_id: string,
 *   auth_uid: string,
 *   personal_info: Map,
 *   role: Map
 * }
 */
async function createAdmin(adminData) {
  const { adminId, authUid, firstName, lastName, email, phone } = adminData;
  const adminRef = db.collection('Admin').doc(adminId);
  
  await adminRef.set({
    admin_id: adminId,
    auth_uid: authUid,
    personal_info: {
      firstName,
      lastName,
      email,
      phone: phone || ''
    },
    role: {
      role_id: 'admin',
      roleName: 'Admin'
    }
  });
  
  return adminId;
}

/**
 * อัปเดต Student เพื่อเพิ่ม adviser_id
 */
async function assignAdviserToStudent(studentId, teacherId) {
  const studentRef = db.collection('Student').doc(studentId);
  const teacherRef = db.collection('Teacher').doc(teacherId);
  
  const studentDoc = await studentRef.get();
  const teacherDoc = await teacherRef.get();
  
  if (!studentDoc.exists || !teacherDoc.exists) {
    throw new Error('Student or Teacher not found');
  }
  
  const studentName = `${studentDoc.data().personal_info.firstName} ${studentDoc.data().personal_info.lastName}`;
  const teacherName = `${teacherDoc.data().personal_info.firstName} ${teacherDoc.data().personal_info.lastName}`;
  
  // สร้าง Adviser document
  const adviserId = await createAdviser({
    studentId,
    teacherId,
    studentName,
    teacherName
  });
  
  // อัปเดต Student
  await studentRef.update({
    adviser_id: adviserId
  });
  
  return adviserId;
}

module.exports = {
  createNotification,
  createSubject,
  createSchedule,
  createNews,
  createMessage,
  createChatHistory,
  createAdviser,
  createAppointment,
  createAdmin,
  assignAdviserToStudent
};
