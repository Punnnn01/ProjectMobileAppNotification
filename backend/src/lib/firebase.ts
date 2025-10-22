import dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();

if (!admin.apps.length) {
  const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!saBase64) {
    // ทางเลือก: ใช้ไฟล์ serviceAccountKey.json (ยกเลิกคอมเมนต์ 2 บรรทัดถ้าจะใช้ไฟล์)
    // const serviceAccount = require("../../serviceAccountKey.json");
    // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 (or enable file mode in lib/firebase.ts).");
  } else {
    const serviceAccount = JSON.parse(Buffer.from(saBase64, "base64").toString("utf8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

export const db = admin.firestore();
export const Timestamp = admin.firestore.Timestamp;