// server.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');
require('dotenv').config();

// ── Firebase Admin Init ───────────────────────────────────────────────────────
if (!admin.apps.length) {
  const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (saBase64) {
    const serviceAccount = JSON.parse(
      Buffer.from(saBase64, 'base64').toString('utf8')
    );
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 ไม่พบ — ใช้ fallback system prompt แทน');
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ── Gemini ────────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── system prompt เดิม (fallback ถ้า Firestore ใช้ไม่ได้) ────────────────────
const FALLBACK_SYSTEM_PROMPT = `
คุณคือ "พี่บอทแนะแนว" ของคณะวิศวกรรมคอมพิวเตอร์ ทำหน้าที่ให้ข้อมูลหลักสูตรและค่าเทอม

[ข้อมูลหลักสูตรรายวิชา]
- ปี 1: เน้นพื้นฐาน (Calculus 1&2, Physics, Intro to Programming, English)
- ปี 2: เน้นวิชาแกนคอมพิวเตอร์ (Data Structures, Discrete Math, Digital Logic, Computer Organization)
- ปี 3: เน้นวิชาขั้นสูง (Operating Systems, Database, Software Engineering, Computer Networks)
- ปี 4: เน้นการประยุกต์และจบการศึกษา (Senior Project 1&2, Distributed Systems, วิชาเลือกเฉพาะทาง)

[ข้อมูลค่าเทอม]
- ภาคปกติ: 15,000 บาทต่อเทอม
- ภาคพิเศษ: 35,000 บาทต่อเทอม

[กฎการโต้ตอบและถามกลับ]
1. หากถาม "ค่าเทอม" แต่ไม่ระบุภาค: ให้ถามกลับว่า "สนใจภาคปกติ หรือภาคพิเศษครับ?"
2. หากถาม "วิชาเรียน/หลักสูตร": ให้ถามกลับว่า "อยากดูของชั้นปีไหนครับ? (ปี 1-4)"
3. หากผู้ใช้ตอบสั้นๆ เช่น "ปกติ" หรือ "ปี 2" ให้ใช้ประวัติการคุยก่อนหน้าเพื่อตอบให้ตรงเรื่อง

[การติดต่อ] ห้องธุรการ ตึก 8 ชั้น 3 เบอร์ 02-xxx-xxxx
คำพูด: สุภาพ เป็นกันเอง ห้ามมโนข้อมูลเอง
`;

// ── ดึง knowledge จาก Firestore ──────────────────────────────────────────────
async function buildSystemPrompt() {
  // ถ้า Firestore ไม่พร้อม → ใช้ fallback ทันที (chatbot ยังทำงานได้ปกติ)
  if (!db) return FALLBACK_SYSTEM_PROMPT;

  try {
    const snap = await db.collection('Chatbot_Knowledge')
      .where('enabled', '==', true)
      .orderBy('order', 'asc')
      .get();

    // ถ้าไม่มีข้อมูลใน Firestore เลย → ใช้ fallback
    if (snap.empty) {
      console.log('ℹ️  Chatbot_Knowledge ว่างเปล่า — ใช้ fallback system prompt');
      return FALLBACK_SYSTEM_PROMPT;
    }

    // รวม knowledge entries เป็น prompt
    const base = `คุณคือ "พี่บอทแนะแนว" ของคณะวิศวกรรมคอมพิวเตอร์ ทำหน้าที่ให้ข้อมูลแก่นักศึกษาและอาจารย์\nคำพูด: สุภาพ เป็นกันเอง ห้ามมโนข้อมูลเอง ถ้าไม่รู้ให้บอกตรงๆ ว่าไม่มีข้อมูล\n\n`;

    const sections = snap.docs.map(doc => {
      const d = doc.data();
      return `[${d.topic}]\n${d.content}`;
    }).join('\n\n');

    console.log(`✅ โหลด ${snap.size} knowledge entries จาก Firestore`);
    return base + sections;

  } catch (err) {
    // ถ้า Firestore error → fallback ทันที ไม่ให้ chatbot พัง
    console.error('⚠️  Firestore error — ใช้ fallback system prompt:', err.message);
    return FALLBACK_SYSTEM_PROMPT;
  }
}

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' })); // อนุญาตทุก origin สำหรับ mobile app
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', firebase: !!db });
});

app.post('/chat', async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'กรุณาส่ง prompt' });
    }

    // สร้าง system prompt (ดึงจาก Firestore หรือ fallback)
    const systemInstruction = await buildSystemPrompt();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    const chat = model.startChat({
      history: history || [],
    });

    const result = await chat.sendMessage(prompt);
    res.json({ message: result.response.text() });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🤖 Chatbot server running on port ${PORT}`));
