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
interface Props { currentUser: LoggedInUser; }

export default function GroupNotification({ currentUser }: Props): JSX.Element {
  const [groups, setGroups]     = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [newGroupName, setNewGroupName]         = useState("");
  const [newGroupDesc, setNewGroupDesc]         = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating]                 = useState(false);
  const [createSuccess, setCreateSuccess]       = useState<string | null>(null);
  const [createError, setCreateError]           = useState<string | null>(null);
  const [createSearch, setCreateSearch]         = useState("");
  const [deletingId, setDeletingId]             = useState<string | null>(null);

  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [editMode, setEditMode]       = useState<"view" | "edit-info" | "add-members">("view");
  const [removingId, setRemovingId]   = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [editDesc, setEditDesc]       = useState("");
  const [savingInfo, setSavingInfo]   = useState(false);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [addSearch, setAddSearch]     = useState("");
  const [addSelected, setAddSelected] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [addSuccess, setAddSuccess]   = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [gr, sr] = await Promise.all([
        fetch(`${API_BASE}/api/group-notifications/creator/${currentUser.docId}`),
        fetch(`${API_BASE}/api/students/`),
      ]);
      const gd = gr.ok ? await gr.json() : { data: [] };
      const sd = sr.ok ? await sr.json() : [];
      setGroups(gd.data || []);
      setStudents(Array.isArray(sd) ? sd : []);
    } catch (e: any) { setError(e?.message || "โหลดข้อมูลไม่สำเร็จ"); }
    finally { setLoading(false); }
  }

  function sName(s: Student) {
    if (s.personal_info) return `${s.personal_info.firstName} ${s.personal_info.lastName}`.trim();
    return s.student_name || s.student_id;
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    setCreateError(null); setCreateSuccess(null);
    if (!newGroupName.trim()) return setCreateError("กรุณากรอกชื่อกลุ่ม");
    if (!selectedStudents.length) return setCreateError("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/group-notifications`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_group: newGroupName.trim(), description: newGroupDesc.trim(),
          created_by_id: currentUser.docId, created_by_role: currentUser.role,
          student_id: selectedStudents, news_id: "",
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setCreateSuccess(`สร้างกลุ่ม "${newGroupName.trim()}" สำเร็จ`);
      setNewGroupName(""); setNewGroupDesc(""); setSelectedStudents([]); setCreateSearch("");
      await loadAll();
    } catch (e: any) { setCreateError(e?.message || "สร้างกลุ่มไม่สำเร็จ"); }
    finally { setCreating(false); }
  }

  async function handleDelete(groupId: string, groupName: string) {
    if (!confirm(`ต้องการลบกลุ่ม "${groupName}" หรือไม่?`)) return;
    setDeletingId(groupId);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${groupId}`, { method: "DELETE" });
      await loadAll();
    } catch (e: any) { alert("ลบกลุ่มไม่สำเร็จ: " + e?.message); }
    finally { setDeletingId(null); }
  }

  function openDetail(g: Group) {
    setDetailGroup(g); setEditMode("view");
    setEditName(g.name_group); setEditDesc(g.description || "");
    setAddSelected([]); setAddSearch("");
    setInfoSuccess(null); setAddSuccess(null);
  }

  async function handleRemoveStudent(studentId: string) {
    if (!detailGroup || !confirm("ต้องการลบสมาชิกคนนี้ออกจากกลุ่มหรือไม่?")) return;
    setRemovingId(studentId);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}/remove-students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });
      const updated = { ...detailGroup, student_id: detailGroup.student_id.filter(id => id !== studentId) };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e?.message); }
    finally { setRemovingId(null); }
  }

  async function handleSaveInfo() {
    if (!detailGroup || !editName.trim()) return;
    setSavingInfo(true); setInfoSuccess(null);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_group: editName.trim(), description: editDesc.trim() }),
      });
      const updated = { ...detailGroup, name_group: editName.trim(), description: editDesc.trim() };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
      setInfoSuccess("บันทึกสำเร็จ"); setEditMode("view");
    } catch (e: any) { alert("บันทึกไม่สำเร็จ: " + e?.message); }
    finally { setSavingInfo(false); }
  }

  async function handleAddMembers() {
    if (!detailGroup || !addSelected.length) return;
    setAddingMembers(true); setAddSuccess(null);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}/add-students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: addSelected }),
      });
      const newIds = [...new Set([...detailGroup.student_id, ...addSelected])];
      const updated = { ...detailGroup, student_id: newIds };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
      setAddSuccess(`เพิ่ม ${addSelected.length} สมาชิกสำเร็จ`);
      setAddSelected([]); setEditMode("view");
    } catch (e: any) { alert("เพิ่มสมาชิกไม่สำเร็จ: " + e?.message); }
    finally { setAddingMembers(false); }
  }

  const notInGroup = students.filter(s =>
    !detailGroup?.student_id.includes(s.student_id) &&
    (sName(s).toLowerCase().includes(addSearch.toLowerCase()) || s.student_id.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const filteredCreate = students.filter(s =>
    sName(s).toLowerCase().includes(createSearch.toLowerCase()) || s.student_id.toLowerCase().includes(createSearch.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>กำลังโหลด...</div>;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1a1d23", letterSpacing: "-0.3px", margin: 0 }}>Group Notification</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          จัดการกลุ่มสำหรับส่งข่าวสาร — มีทั้งหมด {groups.length} กลุ่ม
        </p>
      </div>

      {error && <div style={{ padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: "10px", marginBottom: "20px", fontSize: "13px" }}>ข้อผิดพลาด: {error}</div>}

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* ── คอลัมน์ซ้าย: สร้างกลุ่ม ── */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#1a1d23", margin: "0 0 20px" }}>สร้างกลุ่มใหม่</h3>

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={lbl}>ชื่อกลุ่ม <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" value={newGroupName} onInput={(e) => setNewGroupName((e.target as HTMLInputElement).value)}
                placeholder="เช่น กลุ่มนิสิตปี 1 หมู่ A" style={inp} />
            </div>

            <div>
              <label style={lbl}>คำอธิบาย</label>
              <textarea value={newGroupDesc} onInput={(e) => setNewGroupDesc((e.target as HTMLTextAreaElement).value)}
                rows={2} placeholder="คำอธิบายเพิ่มเติม..." style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div>
              <label style={lbl}>
                เลือกสมาชิก
                {selectedStudents.length > 0 && (
                  <span style={{ marginLeft: "8px", background: "#158e6d", color: "#fff", borderRadius: "20px", padding: "1px 9px", fontSize: "11px", fontWeight: "700" }}>
                    {selectedStudents.length} คน
                  </span>
                )}
                <span style={{ color: "#ef4444" }}> *</span>
              </label>
              <input type="text" value={createSearch} onInput={(e) => setCreateSearch((e.target as HTMLInputElement).value)}
                placeholder="ค้นหาชื่อหรือรหัสนิสิต..." style={{ ...inp, marginBottom: "8px", fontSize: "13px" }} />
              <div style={{ border: "1.5px solid #e5e7eb", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", background: "#fafafa" }}>
                {filteredCreate.length === 0 ? (
                  <div style={{ padding: "14px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>ไม่พบนิสิต</div>
                ) : filteredCreate.map(s => {
                  const checked = selectedStudents.includes(s.student_id);
                  return (
                    <label key={s.student_id} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 12px", cursor: "pointer",
                      background: checked ? "#ecfdf5" : "transparent",
                      borderBottom: "1px solid #f0f0f0",
                    }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setSelectedStudents(prev => checked ? prev.filter(id => id !== s.student_id) : [...prev, s.student_id])}
                        style={{ width: "15px", height: "15px", accentColor: "#158e6d" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: "#1f2937" }}>{sName(s)}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>{s.student_id}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {createError && <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "13px" }}>{createError}</div>}
            {createSuccess && <div style={{ padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: "8px", fontSize: "13px" }}>{createSuccess}</div>}

            <button type="submit" disabled={creating} style={{
              background: creating ? "#9ca3af" : "#158e6d", color: "#fff", border: "none",
              padding: "12px", borderRadius: "9px", fontWeight: "600", fontSize: "14px",
              cursor: creating ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {creating ? "กำลังสร้าง..." : "สร้างกลุ่ม"}
            </button>
          </form>
        </div>

        {/* ── คอลัมน์ขวา: รายการกลุ่ม ── */}
        <div>
          {groups.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "48px 24px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>👥</div>
              <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px", color: "#6b7280" }}>ยังไม่มีกลุ่ม</div>
              <div style={{ fontSize: "13px" }}>สร้างกลุ่มแรกได้จากฝั่งซ้ายเลยครับ</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {groups.map(g => (
                <div key={g.group_id} style={{
                  background: "#fff", borderRadius: "14px",
                  border: "1px solid #e5e7eb", padding: "18px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  display: "flex", alignItems: "center", gap: "16px",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
                    background: `hsl(${(g.group_id.charCodeAt(0) * 47) % 360}, 55%, 92%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", fontWeight: "700",
                    color: `hsl(${(g.group_id.charCodeAt(0) * 47) % 360}, 55%, 38%)`,
                  }}>
                    {g.name_group.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1d23", marginBottom: "2px" }}>{g.name_group}</div>
                    {g.description && <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.description}</div>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: "600" }}>
                      {g.student_id.length} สมาชิก
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => openDetail(g)} style={{
                      padding: "8px 16px", background: "#f0f9ff", color: "#0369a1",
                      border: "1px solid #bae6fd", borderRadius: "8px",
                      fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                    }}>จัดการ</button>
                    <button onClick={() => handleDelete(g.group_id, g.name_group)} disabled={deletingId === g.group_id} style={{
                      padding: "8px 16px", background: "#fff5f5", color: "#dc2626",
                      border: "1px solid #fecaca", borderRadius: "8px",
                      fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                      opacity: deletingId === g.group_id ? 0.6 : 1,
                    }}>
                      {deletingId === g.group_id ? "..." : "ลบ"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {detailGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetailGroup(null); }}>
          <div style={{ background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "520px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>

            {/* Header */}
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1d23" }}>{detailGroup.name_group}</div>
                {detailGroup.description && <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{detailGroup.description}</div>}
              </div>
              <button onClick={() => setDetailGroup(null)} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "#f3f4f6", cursor: "pointer", fontSize: "16px", color: "#6b7280", flexShrink: 0 }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", padding: "12px 24px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
              {(["view", "edit-info", "add-members"] as const).map(tab => {
                const labels = { "view": "สมาชิก", "edit-info": "แก้ไขชื่อ", "add-members": "เพิ่มสมาชิก" };
                return (
                  <button key={tab} onClick={() => setEditMode(tab)} style={{
                    padding: "6px 14px", border: "1.5px solid", borderRadius: "8px", fontSize: "13px",
                    fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
                    borderColor: editMode === tab ? "#158e6d" : "#d1d5db",
                    background: editMode === tab ? "#ecfdf5" : "white",
                    color: editMode === tab ? "#065f46" : "#6b7280",
                  }}>{labels[tab]}</button>
                );
              })}
            </div>

            {/* Content */}
            <div style={{ overflowY: "auto", flex: 1 }}>

              {/* View */}
              {editMode === "view" && (
                <>
                  <div style={{ padding: "12px 24px", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{detailGroup.student_id.length} สมาชิก</span>
                  </div>
                  {detailGroup.student_id.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>ไม่มีสมาชิก</div>
                  ) : detailGroup.student_id.map((id, idx) => {
                    const s = students.find(st => st.student_id === id);
                    const name = s ? sName(s) : id;
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 24px", borderBottom: idx < detailGroup.student_id.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                          background: `hsl(${(id.charCodeAt(0) * 37) % 360}, 60%, 88%)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: `hsl(${(id.charCodeAt(0) * 37) % 360}, 60%, 38%)`,
                          fontWeight: "700", fontSize: "13px",
                        }}>{name.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1d23" }}>{name}</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>{s?.personal_info?.email || id}</div>
                        </div>
                        <button onClick={() => handleRemoveStudent(id)} disabled={removingId === id} style={{
                          padding: "5px 12px", background: "#fff5f5", color: "#dc2626",
                          border: "1px solid #fecaca", borderRadius: "7px",
                          fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                          opacity: removingId === id ? 0.6 : 1,
                        }}>
                          {removingId === id ? "..." : "ลบ"}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Edit info */}
              {editMode === "edit-info" && (
                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={lbl}>ชื่อกลุ่ม *</label>
                    <input type="text" value={editName} onInput={(e) => setEditName((e.target as HTMLInputElement).value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>คำอธิบาย</label>
                    <textarea value={editDesc} onInput={(e) => setEditDesc((e.target as HTMLTextAreaElement).value)} rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                  {infoSuccess && <div style={{ padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: "8px", fontSize: "13px" }}>{infoSuccess}</div>}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setEditMode("view")} style={{ flex: 1, padding: "11px", background: "#f3f4f6", color: "#555", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
                    <button onClick={handleSaveInfo} disabled={savingInfo} style={{ flex: 1, padding: "11px", background: savingInfo ? "#9ca3af" : "#158e6d", color: "#fff", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                      {savingInfo ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </div>
              )}

              {/* Add members */}
              {editMode === "add-members" && (
                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>นิสิตที่ยังไม่ได้อยู่ในกลุ่ม</div>
                  {addSelected.length > 0 && (
                    <div style={{ display: "inline-flex", background: "#158e6d", color: "#fff", borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: "700", alignSelf: "flex-start" }}>
                      เลือก {addSelected.length} คน
                    </div>
                  )}
                  <input type="text" value={addSearch} onInput={(e) => setAddSearch((e.target as HTMLInputElement).value)} placeholder="ค้นหา..." style={{ ...inp, fontSize: "13px" }} />
                  <div style={{ border: "1.5px solid #e5e7eb", borderRadius: "8px", maxHeight: "220px", overflowY: "auto", background: "#fafafa" }}>
                    {notInGroup.length === 0 ? (
                      <div style={{ padding: "14px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                        {addSearch ? "ไม่พบ" : "ทุกคนอยู่ในกลุ่มแล้ว"}
                      </div>
                    ) : notInGroup.map(s => {
                      const checked = addSelected.includes(s.student_id);
                      return (
                        <label key={s.student_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", cursor: "pointer", background: checked ? "#ecfdf5" : "transparent", borderBottom: "1px solid #f0f0f0" }}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setAddSelected(prev => checked ? prev.filter(id => id !== s.student_id) : [...prev, s.student_id])}
                            style={{ width: "15px", height: "15px", accentColor: "#158e6d" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: "500", color: "#1f2937" }}>{sName(s)}</div>
                            <div style={{ fontSize: "11px", color: "#9ca3af" }}>{s.student_id}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {addSuccess && <div style={{ padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: "8px", fontSize: "13px" }}>{addSuccess}</div>}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setEditMode("view")} style={{ flex: 1, padding: "11px", background: "#f3f4f6", color: "#555", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
                    <button onClick={handleAddMembers} disabled={addingMembers || !addSelected.length} style={{ flex: 1, padding: "11px", background: addSelected.length && !addingMembers ? "#158e6d" : "#9ca3af", color: "#fff", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                      {addingMembers ? "กำลังเพิ่ม..." : `เพิ่ม ${addSelected.length || ""} คน`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0" }}>
              <button onClick={() => setDetailGroup(null)} style={{ width: "100%", padding: "11px", background: "#158e6d", color: "#fff", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared styles
const lbl: any = { display: "block", fontWeight: "600", marginBottom: "6px", fontSize: "13px", color: "#374151" };
const inp: any = { width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white", boxSizing: "border-box", fontFamily: "inherit", color: "#1f2937", outline: "none" };
