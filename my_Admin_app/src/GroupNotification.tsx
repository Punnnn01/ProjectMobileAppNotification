// src/GroupNotification.tsx
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { LoggedInUser } from "./Login";

const API_BASE = "https://projectmobileappnotification-production.up.railway.app";

interface Group {
  group_id: string;
  name_group: string;
  description?: string;
  created_by_id: string;
  created_by_role: string;
  student_id: string[];
  news_id: string;
}

interface Student {
  student_id: string;
  personal_info?: { firstName: string; lastName: string; email: string };
  student_name?: string;
}

interface Props {
  currentUser: LoggedInUser;
}

export default function GroupNotification({ currentUser }: Props): JSX.Element {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form สร้างกลุ่มใหม่
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // ลบกลุ่ม
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // detail modal
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // search ใน student list
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [groupsRes, studentsRes] = await Promise.all([
        fetch(
          `${API_BASE}/api/group-notifications/creator/${currentUser.docId}`,
        ),
        fetch(`${API_BASE}/api/students/`),
      ]);
      const groupsData = groupsRes.ok ? await groupsRes.json() : { data: [] };
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      setGroups(groupsData.data || []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (e: any) {
      setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function studentName(s: Student) {
    if (s.personal_info)
      return `${s.personal_info.firstName} ${s.personal_info.lastName}`.trim();
    return s.student_name || s.student_id;
  }

  function toggleStudent(id: string) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    if (!newGroupName.trim()) return setCreateError("กรุณากรอกชื่อกลุ่ม");
    if (selectedStudents.length === 0)
      return setCreateError("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/group-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_group: newGroupName.trim(),
          description: newGroupDesc.trim(),
          created_by_id: currentUser.docId,
          created_by_role: currentUser.role,
          student_id: selectedStudents,
          news_id: "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setCreateSuccess(`สร้างกลุ่ม "${newGroupName.trim()}" สำเร็จ`);
      setNewGroupName("");
      setNewGroupDesc("");
      setSelectedStudents([]);
      await loadAll();
    } catch (e: any) {
      setCreateError(e?.message || "สร้างกลุ่มไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!detailGroup) return;
    if (!confirm(`ต้องการลบสมาชิกคนนี้ออกจากกลุ่มหรือไม่?`)) return;
    setRemovingId(studentId);
    try {
      const res = await fetch(
        `${API_BASE}/api/group-notifications/${detailGroup.group_id}/remove-students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: [studentId] }),
        },
      );
      if (!res.ok) throw new Error("ลบสมาชิกไม่สำเร็จ");
      // อัปเดต detailGroup ใน state ทันที ไม่ต้อง reload ทั้งหน้า
      const updated = {
        ...detailGroup,
        student_id: detailGroup.student_id.filter((id) => id !== studentId),
      };
      setDetailGroup(updated);
      setGroups((prev) =>
        prev.map((g) => (g.group_id === detailGroup.group_id ? updated : g)),
      );
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e?.message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleDelete(groupId: string, groupName: string) {
    if (!confirm(`ต้องการลบกลุ่ม "${groupName}" หรือไม่?`)) return;
    setDeletingId(groupId);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${groupId}`, {
        method: "DELETE",
      });
      await loadAll();
    } catch (e: any) {
      alert("ลบกลุ่มไม่สำเร็จ: " + e?.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ── filtered students ──────────────────────────────
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      studentName(s).toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q)
    );
  });

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
        กำลังโหลด...
      </div>
    );

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 24px" }}>
      {/* ═══ ฟอร์มสร้างกลุ่ม ═══ */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          marginBottom: "32px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "24px",
            color: "#1f2937",
          }}
        >
          ➕ สร้างกลุ่มการแจ้งเตือนใหม่
        </h2>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleCreate}>
          {/* ชื่อกลุ่ม */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              ชื่อกลุ่ม <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={newGroupName}
              onInput={(e) =>
                setNewGroupName((e.target as HTMLInputElement).value)
              }
              placeholder="เช่น กลุ่มนิสิตปี 1 หมู่ A"
              style={inputStyle}
            />
          </div>

          {/* คำอธิบายกลุ่ม */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>คำอธิบายกลุ่ม</label>
            <textarea
              value={newGroupDesc}
              onInput={(e) =>
                setNewGroupDesc((e.target as HTMLTextAreaElement).value)
              }
              placeholder="เช่น กลุ่มสำหรับแจ้งเตือนนิสิตชั้นปีที่ 1 หมู่เรียน A ภาควิชาวิทยาการคอมพิวเตอร์"
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: "1.5",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* เลือกสมาชิก */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              เลือกสมาชิก
              {selectedStudents.length > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    background: "#158e6d",
                    color: "white",
                    borderRadius: "12px",
                    padding: "2px 10px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  {selectedStudents.length} คน
                </span>
              )}
              <span style={{ color: "#ef4444" }}> *</span>
            </label>

            {/* search */}
            <input
              type="text"
              value={studentSearch}
              onInput={(e) =>
                setStudentSearch((e.target as HTMLInputElement).value)
              }
              placeholder="🔍 ค้นหาชื่อหรือรหัสนิสิต..."
              style={{ ...inputStyle, marginBottom: "8px", fontSize: "13px" }}
            />

            <div
              style={{
                border: "2px solid #d1d5db",
                borderRadius: "8px",
                maxHeight: "240px",
                overflowY: "auto",
                background: "#fafafa",
              }}
            >
              {filteredStudents.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    color: "#999",
                    textAlign: "center",
                  }}
                >
                  ไม่พบข้อมูลนิสิต
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isChecked = selectedStudents.includes(s.student_id);
                  return (
                    <label
                      key={s.student_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: isChecked ? "#ecfdf5" : "transparent",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudent(s.student_id)}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: "#158e6d",
                        }}
                      />
                      <span style={{ fontSize: "14px", color: "#1f2937" }}>
                        {studentName(s)}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          marginLeft: "auto",
                        }}
                      >
                        {s.student_id}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {createError && (
            <div
              style={{
                padding: "12px",
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              ❌ {createError}
            </div>
          )}
          {createSuccess && (
            <div
              style={{
                padding: "12px",
                background: "#d1fae5",
                color: "#065f46",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              ✅ {createSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={creating ? btnDisabledStyle : btnPrimaryStyle}
          >
            {creating ? "⏳ กำลังสร้าง..." : "✅ สร้างกลุ่ม"}
          </button>
        </form>
      </div>

      {/* ═══ รายการกลุ่มของฉัน ═══ */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "24px",
            color: "#1f2937",
          }}
        >
          👥 กลุ่มของฉัน ({groups.length} กลุ่ม)
        </h2>

        {groups.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
            <div>ยังไม่มีกลุ่ม</div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {groups.map((g) => (
              <div
                key={g.group_id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#fafafa",
                  transition: "box-shadow 0.15s",
                }}
              >
                {/* top row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* ชื่อกลุ่ม */}
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "16px",
                        color: "#1f2937",
                        marginBottom: "4px",
                      }}
                    >
                      {g.name_group}
                    </div>

                    {/* description */}
                    {g.description && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                          marginBottom: "8px",
                          lineHeight: "1.5",
                        }}
                      >
                        {g.description}
                      </div>
                    )}

                    {/* member count chip */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "#ecfdf5",
                          color: "#065f46",
                          border: "1px solid #a7f3d0",
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        👤 {g.student_id.length} สมาชิก
                      </span>
                    </div>
                  </div>

                  {/* action buttons */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => setDetailGroup(g)}
                      style={{
                        padding: "8px 14px",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      👁️ รายละเอียด
                    </button>
                    <button
                      onClick={() => handleDelete(g.group_id, g.name_group)}
                      disabled={deletingId === g.group_id}
                      style={{
                        padding: "8px 14px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor:
                          deletingId === g.group_id ? "not-allowed" : "pointer",
                        opacity: deletingId === g.group_id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === g.group_id ? "⏳" : "ลบ"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Detail Modal ═══ */}
      {detailGroup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailGroup(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* modal header */}
            <div
              style={{
                padding: "24px 24px 16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#1f2937",
                    marginBottom: "4px",
                  }}
                >
                  {detailGroup.name_group}
                </div>
                {detailGroup.description && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      lineHeight: "1.5",
                    }}
                  >
                    {detailGroup.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => setDetailGroup(null)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: "32px",
                  textAlign: "center",
                  color: "#6b7280",
                  flexShrink: 0,
                  marginLeft: "16px",
                }}
              >
                ✕
              </button>
            </div>

            {/* member count */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  borderRadius: "20px",
                  padding: "4px 14px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                👤 สมาชิกทั้งหมด {detailGroup.student_id.length} คน
              </span>
            </div>

            {/* member list */}
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {detailGroup.student_id.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  ไม่มีสมาชิกในกลุ่มนี้
                </div>
              ) : (
                detailGroup.student_id.map((id, idx) => {
                  const s = students.find((st) => st.student_id === id);
                  const name = s ? studentName(s) : id;
                  const email = s?.personal_info?.email || "";
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 24px",
                        borderBottom:
                          idx < detailGroup.student_id.length - 1
                            ? "1px solid #f9f9f9"
                            : "none",
                      }}
                    >
                      {/* avatar circle */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: `hsl(${(id.charCodeAt(0) * 37) % 360}, 60%, 60%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "700",
                          fontSize: "14px",
                          flexShrink: 0,
                        }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1f2937",
                          }}
                        >
                          {name}
                        </div>
                        {email && (
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                            {email}
                          </div>
                        )}
                        {!email && (
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                            {id}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            background: "#f3f4f6",
                            borderRadius: "6px",
                            padding: "2px 8px",
                          }}
                        >
                          #{idx + 1}
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(id)}
                          disabled={removingId === id}
                          title="ลบสมาชิกออกจากกลุ่ม"
                          style={{
                            width: "28px",
                            height: "28px",
                            flexShrink: 0,
                            border: "none",
                            borderRadius: "6px",
                            background:
                              removingId === id ? "#f3f4f6" : "#fee2e2",
                            color: removingId === id ? "#9ca3af" : "#dc2626",
                            cursor:
                              removingId === id ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {removingId === id ? "⏳" : "ลบ"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* footer */}
            <div
              style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}
            >
              <button
                onClick={() => setDetailGroup(null)}
                style={{ ...btnPrimaryStyle, width: "100%" }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────
const labelStyle: Record<string, any> = {
  display: "block",
  fontWeight: "600",
  marginBottom: "8px",
  fontSize: "14px",
  color: "#374151",
};

const inputStyle: Record<string, any> = {
  width: "100%",
  padding: "12px 16px",
  boxSizing: "border-box",
  border: "2px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  color: "#1f2937",
  background: "white",
};

const btnPrimaryStyle: Record<string, any> = {
  padding: "13px 20px",
  background: "#158e6d",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "15px",
  cursor: "pointer",
};

const btnDisabledStyle: Record<string, any> = {
  ...btnPrimaryStyle,
  background: "#9ca3af",
  cursor: "not-allowed",
};
