import { db, admin } from "../lib/firebase";

export type ChatbotUser = {
  user_id: string;
  user_type: "student" | "teacher";
  user_name: string;
};

export type ChatbotMessageHistory = {
  cmh_id: string;
  user: ChatbotUser;    // Map (Obj)
  userText: string;
  botText: string;
  time: FirebaseFirestore.Timestamp;
};

const col = () => db.collection("Chatbot_Message_History");

export const ChatbotService = {

  // ดึงประวัติทั้งหมดของ user คนนั้น
  getByUser: async (userId: string): Promise<ChatbotMessageHistory[]> => {
    const snap = await col()
      .where("user.user_id", "==", userId)
      .orderBy("time", "desc")
      .get();
    return snap.docs.map((d) => ({ ...d.data(), cmh_id: d.id } as ChatbotMessageHistory));
  },

  // ดึงประวัติตาม cmh_id
  getById: async (cmhId: string): Promise<ChatbotMessageHistory | null> => {
    const doc = await col().doc(cmhId).get();
    if (!doc.exists) return null;
    return { ...doc.data(), cmh_id: doc.id } as ChatbotMessageHistory;
  },

  // บันทึกประวัติการสนทนา และเพิ่ม cmh_id เข้า Student/Teacher
  saveMessage: async (
    user: ChatbotUser,
    userText: string,
    botText: string
  ): Promise<string> => {
    // 1. สร้าง document ใน Chatbot_Message_History
    const ref = col().doc();
    await ref.set({
      cmh_id: ref.id,
      user,
      userText,
      botText,
      time: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. เพิ่ม cmh_id เข้า chat_chatbot_history ของ user
    const userCollection = user.user_type === "student" ? "Student" : "Teacher";
    await db.collection(userCollection).doc(user.user_id).update({
      chat_chatbot_history: admin.firestore.FieldValue.arrayUnion(ref.id)
    });

    return ref.id;
  },

  // ลบประวัติการสนทนา 1 รายการ
  deleteMessage: async (cmhId: string, userId: string, userType: "student" | "teacher"): Promise<void> => {
    // 1. ลบออกจาก Chatbot_Message_History
    await col().doc(cmhId).delete();

    // 2. ลบ cmh_id ออกจาก chat_chatbot_history ของ user
    const userCollection = userType === "student" ? "Student" : "Teacher";
    await db.collection(userCollection).doc(userId).update({
      chat_chatbot_history: admin.firestore.FieldValue.arrayRemove(cmhId)
    });
  },

  // ลบประวัติทั้งหมดของ user คนนั้น
  clearHistory: async (userId: string, userType: "student" | "teacher"): Promise<number> => {
    const snap = await col().where("user.user_id", "==", userId).get();

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // ล้าง Array ใน Student/Teacher
    const userCollection = userType === "student" ? "Student" : "Teacher";
    await db.collection(userCollection).doc(userId).update({
      chat_chatbot_history: [],
      CMH: {}
    });

    return snap.size;
  }
};
