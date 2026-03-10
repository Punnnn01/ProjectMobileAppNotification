import { Request, Response } from "express";
import { TeacherService } from "../services/teacher.service";
import { db } from "../lib/firebase";

export const TeacherController = {
  // GET /api/teachers
  getAll: async (_: Request, res: Response) => {
    const data = await TeacherService.getAll();
    res.json(data);
  },

  // GET /api/teachers/pending
  getPending: async (_: Request, res: Response) => {
    try {
      const data = await TeacherService.getPending();
      res.json({ success: true, data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  // POST /api/teachers/:id/verify
  verify: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await TeacherService.verify(id);

      // ดึง FCM token ของอาจารย์เพื่อส่ง push notification
      const doc = await db.collection("Teacher").doc(id).get();
      const teacherData = doc.data();
      const fcmToken = teacherData?.fcm_token;

      if (fcmToken) {
        const { admin } = await import("../lib/firebase");
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "✅ บัญชีได้รับการยืนยันแล้ว",
            body: "แอดมินยืนยันบัญชีอาจารย์ของคุณเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบได้ทันที",
          },
          data: { type: "teacher_verified" },
        });
      }

      res.json({ success: true, message: "ยืนยันอาจารย์เรียบร้อยแล้ว" });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  // POST /api/teachers/:id/reject
  reject: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // ดึง FCM token ก่อน reject
      const doc = await db.collection("Teacher").doc(id).get();
      const teacherData = doc.data();
      const fcmToken = teacherData?.fcm_token;

      await TeacherService.reject(id);

      if (fcmToken) {
        const { admin } = await import("../lib/firebase");
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "❌ บัญชีไม่ได้รับการยืนยัน",
            body: "ขออภัย บัญชีอาจารย์ของคุณไม่ได้รับการยืนยันจากแอดมิน กรุณาติดต่อผู้ดูแลระบบ",
          },
          data: { type: "teacher_rejected" },
        });
      }

      res.json({ success: true, message: "ปฏิเสธอาจารย์เรียบร้อยแล้ว" });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
};
