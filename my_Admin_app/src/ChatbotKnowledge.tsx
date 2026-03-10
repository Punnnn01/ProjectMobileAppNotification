// src/ChatbotKnowledge.tsx
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { db } from "./firebase";

interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  order: number;
  enabled: boolean;
  updatedAt?: any;
}

const EMPTY_FORM = { topic: "", content: "", order: 0, enabled: true };

export default function ChatbotKnowledge(): JSX.Element {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ฟอร์ม
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // โหลดข้อมูล
  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "Chatbot_Knowledge"),
        orderBy("order", "asc"),
      );
      const snap = await getDocs(q);
      setEntries(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KnowledgeEntry),
      );
    } catch (e: any) {
      setError("โหลดข้อมูลไม่สำเร็จ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // เปิดฟอร์มเพิ่มใหม่
  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: entries.length + 1 });
    setFormError("");
    setShowForm(true);
  };

  // เปิดฟอร์มแก้ไข
  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setForm({
      topic: entry.topic,
      content: entry.content,
      order: entry.order,
      enabled: entry.enabled,
    });
    setFormError("");
    setShowForm(true);
  };

  // บันทึก (เพิ่ม/แก้ไข)
  const handleSave = async () => {
    if (!form.topic.trim()) {
      setFormError("กรุณากรอกหัวข้อ");
      return;
    }
    if (!form.content.trim()) {
      setFormError("กรุณากรอกเนื้อหา");
      return;
    }
    if (form.order < 0) {
      setFormError("ลำดับต้องเป็น 0 หรือมากกว่าเท่านั้น");
      return;
    }
    const conflictEntry = entries.find(
      (e) => e.order === form.order && e.id !== editingId,
    );
    if (conflictEntry) {
      // หาลำดับเดิมของ entry ที่กำลังแก้ไข (เพื่อใช้สลับกลับ)
      const myOldOrder = editingId
        ? (entries.find((e) => e.id === editingId)?.order ?? form.order)
        : -1; // ถ้าเป็น entry ใหม่ ไม่มีลำดับเดิม → จะ block

      if (!editingId) {
        // entry ใหม่: ไม่มีลำดับเดิมที่จะเอาไปสลับ → error
        setFormError(
          `ลำดับ ${form.order} ถูกใช้โดย "${conflictEntry.topic}" แล้ว กรุณาใช้ลำดับอื่น`,
        );
        return;
      }

      // entry เดิม: สลับลำดับกัน
      setSaving(true);
      setFormError("");
      try {
        // 1. อัปเดต entry ที่ชนกับ: เอาลำดับเดิมของเราไป
        await updateDoc(doc(db, "Chatbot_Knowledge", conflictEntry.id), {
          order: myOldOrder,
          updatedAt: serverTimestamp(),
        });
        // 2. อัปเดตตัวเรา: เอาลำดับใหม่
        await updateDoc(doc(db, "Chatbot_Knowledge", editingId), {
          topic: form.topic.trim(),
          content: form.content.trim(),
          order: form.order,
          enabled: form.enabled,
          updatedAt: serverTimestamp(),
        });
        showSuccess(`สลับลำดับ กับ "${conflictEntry.topic}" เรียบร้อยแล้ว`);
        setShowForm(false);
        await loadEntries();
      } catch (e: any) {
        setFormError("สลับไม่สำเร็จ: " + e.message);
      } finally {
        setSaving(false);
      }
      return; // ออกจาก handleSave เลย ไม่ต้องทำต่อ
    }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        topic: form.topic.trim(),
        content: form.content.trim(),
        order: Number(form.order) || 0,
        enabled: form.enabled,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "Chatbot_Knowledge", editingId), payload);
        showSuccess("✅ แก้ไขข้อมูลเรียบร้อยแล้ว");
      } else {
        await addDoc(collection(db, "Chatbot_Knowledge"), payload);
        showSuccess("✅ เพิ่มข้อมูลเรียบร้อยแล้ว");
      }

      setShowForm(false);
      await loadEntries();
    } catch (e: any) {
      setFormError("บันทึกไม่สำเร็จ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // toggle เปิด/ปิด
  const handleToggle = async (entry: KnowledgeEntry) => {
    try {
      await updateDoc(doc(db, "Chatbot_Knowledge", entry.id), {
        enabled: !entry.enabled,
        updatedAt: serverTimestamp(),
      });
      showSuccess(
        `${!entry.enabled ? "✅ เปิดใช้" : "⏸️ ปิดใช้"} "${entry.topic}" แล้ว`,
      );
      await loadEntries();
    } catch (e: any) {
      setError("อัปเดตไม่สำเร็จ: " + e.message);
    }
  };

  // ลบ
  const handleDelete = async (entry: KnowledgeEntry) => {
    if (
      !confirm(
        `ลบหัวข้อ "${entry.topic}" ออกจาก chatbot?\n\nบอทจะไม่ตอบเรื่องนี้อีกต่อไป`,
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "Chatbot_Knowledge", entry.id));
      showSuccess(`🗑️ ลบ "${entry.topic}" แล้ว`);
      await loadEntries();
    } catch (e: any) {
      setError("ลบไม่สำเร็จ: " + e.message);
    }
  };

  const enabledCount = entries.filter((e) => e.enabled).length;
  const disabledCount = entries.length - enabledCount;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#1f2937",
              margin: 0,
            }}
          >
            🤖 จัดการข้อมูล Chatbot
          </h2>
        </div>
        <button
          onClick={handleAdd}
          style={{
            background: "#158e6d",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "10px 20px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ➕ เพิ่มข้อมูลใหม่
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: "ทั้งหมด",
            val: entries.length,
            color: "#6366f1",
            bg: "#eef2ff",
          },
          {
            label: "เปิดใช้งาน",
            val: enabledCount,
            color: "#158e6d",
            bg: "#d1fae5",
          },
          {
            label: "ปิดใช้งาน",
            val: disabledCount,
            color: "#f59e0b",
            bg: "#fef3c7",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              borderRadius: "10px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{ fontSize: "22px", fontWeight: "800", color: s.color }}
            >
              {s.val}
            </span>
            <span style={{ fontSize: "13px", color: "#374151" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          ❌ {error}
        </div>
      )}
      {successMsg && (
        <div
          style={{
            background: "#d1fae5",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#1f2937",
              }}
            >
              {editingId ? "✏️ แก้ไขข้อมูล" : "➕ เพิ่มข้อมูลใหม่"}
            </h3>

            {/* หัวข้อ */}
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              หัวข้อ <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น ข้อมูลค่าเทอม, หลักสูตรปี 1"
              value={form.topic}
              onInput={(e) =>
                setForm((f) => ({
                  ...f,
                  topic: (e.target as HTMLInputElement).value,
                }))
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box",
              }}
            />

            {/* เนื้อหา */}
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              เนื้อหา <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              placeholder="พิมพ์ข้อมูลที่ต้องการให้บอทรู้ เช่น&#10;- ภาคปกติ: 15,000 บาท/เทอม&#10;- ภาคพิเศษ: 35,000 บาท/เทอม"
              value={form.content}
              onInput={(e) =>
                setForm((f) => ({
                  ...f,
                  content: (e.target as HTMLTextAreaElement).value,
                }))
              }
              rows={6}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "16px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            {/* ลำดับ + enabled */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  ลำดับ (0 ขึ้นไป)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.order}
                  onInput={(e) => {
                    const val = Number((e.target as HTMLInputElement).value);
                    setForm((f) => ({ ...f, order: val < 0 ? 0 : val }));
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "8px",
                  paddingBottom: "2px",
                }}
              >
                <input
                  type="checkbox"
                  id="enabled-check"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      enabled: (e.target as HTMLInputElement).checked,
                    }))
                  }
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label
                  for="enabled-check"
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  เปิดใช้งาน
                </label>
              </div>
            </div>

            {formError && (
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  margin: "-8px 0 16px",
                }}
              >
                {formError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: "8px",
                  background: saving ? "#9ca3af" : "#158e6d",
                  color: "white",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "700",
                }}
              >
                {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
          ⏳ กำลังโหลด...
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "#f9fafb",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🤖</div>
          <p style={{ fontSize: "16px" }}>ยังไม่มีข้อมูล Chatbot</p>
          <p style={{ fontSize: "13px" }}>กด "เพิ่มข้อมูลใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "white",
                border: `2px solid ${entry.enabled ? "#d1fae5" : "#f3f4f6"}`,
                borderRadius: "12px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                opacity: entry.enabled ? 1 : 0.65,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {/* Order badge */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: entry.enabled ? "#d1fae5" : "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  color: entry.enabled ? "#065f46" : "#9ca3af",
                  flexShrink: 0,
                }}
              >
                {entry.order}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "700",
                      fontSize: "15px",
                      color: "#1f2937",
                    }}
                  >
                    {entry.topic}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: entry.enabled ? "#d1fae5" : "#f3f4f6",
                      color: entry.enabled ? "#065f46" : "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    {entry.enabled ? "✅ เปิดอยู่" : "⏸️ ปิดอยู่"}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#6b7280",
                    whiteSpace: "pre-line",
                    lineHeight: "1.5",
                  }}
                >
                  {entry.content.length > 200
                    ? entry.content.slice(0, 200) + "…"
                    : entry.content}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => handleToggle(entry)}
                  title={entry.enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  style={{
                    padding: "7px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {entry.enabled ? "⏸️" : "▶️"}
                </button>
                <button
                  onClick={() => handleEdit(entry)}
                  title="แก้ไข"
                  style={{
                    padding: "7px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(entry)}
                  title="ลบ"
                  style={{
                    padding: "7px 10px",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* คำแนะนำ */}
      <div
        style={{
          marginTop: "28px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontWeight: "700",
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          💡 วิธีใช้งาน
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "13px",
            color: "#78350f",
            lineHeight: "1.8",
          }}
        >
          <li>
            เพิ่มข้อมูลแต่ละหัวข้อที่ต้องการให้บอทรู้ เช่น ค่าเทอม, หลักสูตร,
            ติดต่อ
          </li>
          <li>ลำดับ (order) น้อยกว่า = แสดงก่อนใน system prompt ของบอท</li>
          <li>ปิดใช้งาน = บอทจะไม่ใช้ข้อมูลนั้น (แต่ยังเก็บไว้)</li>
          <li>การเปลี่ยนแปลงมีผลทันทีกับ request ถัดไปของ chatbot</li>
        </ul>
      </div>
    </div>
  );
}
