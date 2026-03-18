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

  // ── สร้างกลุ่มใหม่ ──
  const [newGroupName, setNewGroupName]     = useState("");
  const [newGroupDesc, setNewGroupDesc]     = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating]             = useState(false);
  const [createSuccess, setCreateSuccess]   = useState<string | null>(null);
  const [createError, setCreateError]       = useState<string | null>(null);
  const [createSearch, setCreateSearch]     = useState("");

  // ── ลบกลุ่ม ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Detail/Edit modal ──
  const [detailGroup, setDetailGroup]   = useState<Group | null>(null);
  const [editMode, setEditMode]         = useState<"view" | "edit-info" | "add-members">("view");
  const [removingId, setRemovingId]     = useState<string | null>(null);

  // edit info
  const [editName, setEditName]         = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [savingInfo, setSavingInfo]     = useState(false);
  const [infoSuccess, setInfoSuccess]   = useState<string | null>(null);

  // add members
  const [addSearch, setAddSearch]       = useState("");
  const [addSelected, setAddSelected]   = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [addSuccess, setAddSuccess]     = useState<string | null>(null);

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

  // ── สร้างกลุ่ม ──
  async function handleCreate(e: Event) {
    e.preventDefault();
    setCreateError(null); setCreateSuccess(null);
    if (!newGroupName.trim()) return setCreateError("กรุณากรอกชื่อกลุ่ม");
    if (!selectedStudents.length) return setCreateError("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");
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
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setCreateSuccess(`สร้างกลุ่ม "${newGroupName.trim()}" สำเร็จ ✅`);
      setNewGroupName(""); setNewGroupDesc(""); setSelectedStudents([]); setCreateSearch("");
      await loadAll();
    } catch (e: any) { setCreateError(e?.message || "สร้างกลุ่มไม่สำเร็จ"); }
    finally { setCreating(false); }
  }

  // ── ลบกลุ่ม ──
  async function handleDelete(groupId: string, groupName: string) {
    if (!confirm(`ต้องการลบกลุ่ม "${groupName}" หรือไม่?`)) return;
    setDeletingId(groupId);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${groupId}`, { method: "DELETE" });
      await loadAll();
    } catch (e: any) { alert("ลบกลุ่มไม่สำเร็จ: " + e?.message); }
    finally { setDeletingId(null); }
  }

  // ── เปิด modal ──
  function openDetail(g: Group) {
    setDetailGroup(g);
    setEditMode("view");
    setEditName(g.name_group);
    setEditDesc(g.description || "");
    setAddSelected([]);
    setAddSearch("");
    setInfoSuccess(null);
    setAddSuccess(null);
  }

  // ── ลบสมาชิก ──
  async function handleRemoveStudent(studentId: string) {
    if (!detailGroup || !confirm("ต้องการลบสมาชิกคนนี้ออกจากกลุ่มหรือไม่?")) return;
    setRemovingId(studentId);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}/remove-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });
      const updated = { ...detailGroup, student_id: detailGroup.student_id.filter(id => id !== studentId) };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e?.message); }
    finally { setRemovingId(null); }
  }

  // ── บันทึกชื่อ/คำอธิบาย ──
  async function handleSaveInfo() {
    if (!detailGroup || !editName.trim()) return;
    setSavingInfo(true); setInfoSuccess(null);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_group: editName.trim(), description: editDesc.trim() }),
      });
      const updated = { ...detailGroup, name_group: editName.trim(), description: editDesc.trim() };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
      setInfoSuccess("บันทึกสำเร็จ ✅");
      setEditMode("view");
    } catch (e: any) { alert("บันทึกไม่สำเร็จ: " + e?.message); }
    finally { setSavingInfo(false); }
  }

  // ── เพิ่มสมาชิก ──
  async function handleAddMembers() {
    if (!detailGroup || !addSelected.length) return;
    setAddingMembers(true); setAddSuccess(null);
    try {
      await fetch(`${API_BASE}/api/group-notifications/${detailGroup.group_id}/add-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: addSelected }),
      });
      const newIds = [...new Set([...detailGroup.student_id, ...addSelected])];
      const updated = { ...detailGroup, student_id: newIds };
      setDetailGroup(updated);
      setGroups(prev => prev.map(g => g.group_id === detailGroup.group_id ? updated : g));
      setAddSuccess(`เพิ่ม ${addSelected.length} สมาชิกสำเร็จ ✅`);
      setAddSelected([]);
      setEditMode("view");
    } catch (e: any) { alert("เพิ่มสมาชิกไม่สำเร็จ: " + e?.message); }
    finally { setAddingMembers(false); }
  }

  // students ที่ยังไม่ได้อยู่ในกลุ่ม (สำหรับ add members)
  const notInGroup = students.filter(s =>
    !detailGroup?.student_id.includes(s.student_id) &&
    (sName(s).toLowerCase().includes(addSearch.toLowerCase()) || s.student_id.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const filteredCreate = students.filter(s =>
    sName(s).toLowerCase().includes(createSearch.toLowerCase()) || s.student_id.toLowerCase().includes(createSearch.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>กำลังโหลด...</div>;

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 24px" }}>

      {/* ═══ ฟอร์มสร้างกลุ่ม ═══ */}
      <div style={cardStyle}>
        <h2 style={h2Style}>➕ สร้างกลุ่มการแจ้งเตือนใหม่</h2>
        {error && <div style={errorBox}>❌ {error}</div>}
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>ชื่อกลุ่ม <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" value={newGroupName} onInput={(e) => setNewGroupName((e.target as HTMLInputElement).value)} placeholder="เช่น กลุ่มนิสิตปี 1 หมู่ A" style={inputStyle} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>คำอธิบายกลุ่ม</label>
            <textarea value={newGroupDesc} onInput={(e) => setNewGroupDesc((e.target as HTMLTextAreaElement).value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} placeholder="คำอธิบายเพิ่มเติม..." />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              เลือกสมาชิก {selectedStudents.length > 0 && <span style={badgeGreen}>{selectedStudents.length} คน</span>}
              <span style={{ color: "#ef4444" }}> *</span>
            </label>
            <input type="text" value={createSearch} onInput={(e) => setCreateSearch((e.target as HTMLInputElement).value)} placeholder="🔍 ค้นหา..." style={{ ...inputStyle, marginBottom: "8px", fontSize: "13px" }} />
            <div style={listBox}>
              {filteredCreate.length === 0 ? <div style={emptyList}>ไม่พบนิสิต</div> : filteredCreate.map(s => {
                const checked = selectedStudents.includes(s.student_id);
                return (
                  <label key={s.student_id} style={{ ...listRow, background: checked ? "#ecfdf5" : "transparent" }}>
                    <input type="checkbox" checked={checked} onChange={() => setSelectedStudents(prev => checked ? prev.filter(id => id !== s.student_id) : [...prev, s.student_id])} style={{ width: "16px", height: "16px", accentColor: "#158e6d" }} />
                    <span style={{ fontSize: "14px", color: "#1f2937" }}>{sName(s)}</span>
                    <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "auto" }}>{s.student_id}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {createError && <div style={{ ...errorBox, marginBottom: "12px" }}>❌ {createError}</div>}
          {createSuccess && <div style={successBox}>{createSuccess}</div>}
          <button type="submit" disabled={creating} style={creating ? btnDisabled : btnPrimary}>{creating ? "⏳ กำลังสร้าง..." : "✅ สร้างกลุ่ม"}</button>
        </form>
      </div>

      {/* ═══ รายการกลุ่ม ═══ */}
      <div style={cardStyle}>
        <h2 style={h2Style}>👥 กลุ่มของฉัน ({groups.length} กลุ่ม)</h2>
        {groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
            <div>ยังไม่มีกลุ่ม</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {groups.map(g => (
              <div key={g.group_id} style={groupCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "#1f2937", marginBottom: "2px" }}>{g.name_group}</div>
                  {g.description && <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>{g.description}</div>}
                  <span style={badgeGreenOutline}>👤 {g.student_id.length} สมาชิก</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={() => openDetail(g)} style={btnBlue}>✏️ จัดการ</button>
                  <button onClick={() => handleDelete(g.group_id, g.name_group)} disabled={deletingId === g.group_id} style={{ ...btnRed, opacity: deletingId === g.group_id ? 0.6 : 1 }}>{deletingId === g.group_id ? "⏳" : "ลบ"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Detail Modal ═══ */}
      {detailGroup && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDetailGroup(null); }}>
          <div style={modalBox}>

            {/* header */}
            <div style={modalHeader}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#1f2937" }}>{detailGroup.name_group}</div>
                {detailGroup.description && <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{detailGroup.description}</div>}
              </div>
              <button onClick={() => setDetailGroup(null)} style={closeBtn}>✕</button>
            </div>

            {/* tab bar */}
            <div style={{ display: "flex", gap: "8px", padding: "12px 24px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
              {(["view", "edit-info", "add-members"] as const).map(tab => {
                const labels = { "view": "👁️ สมาชิก", "edit-info": "✏️ แก้ไขชื่อ", "add-members": "➕ เพิ่มสมาชิก" };
                return (
                  <button key={tab} onClick={() => setEditMode(tab)} style={{
                    padding: "7px 14px", border: "2px solid", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                    borderColor: editMode === tab ? "#158e6d" : "#d1d5db",
                    background: editMode === tab ? "#ecfdf5" : "white",
                    color: editMode === tab ? "#065f46" : "#6b7280",
                  }}>{labels[tab]}</button>
                );
              })}
            </div>

            {/* ── VIEW MODE ── */}
            {editMode === "view" && (
              <>
                <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={badgeGreenOutline}>👤 สมาชิกทั้งหมด {detailGroup.student_id.length} คน</span>
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
                  {detailGroup.student_id.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>ไม่มีสมาชิก</div>
                  ) : detailGroup.student_id.map((id, idx) => {
                    const s = students.find(st => st.student_id === id);
                    const name = s ? sName(s) : id;
                    return (
                      <div key={id} style={{ ...listRow, padding: "12px 24px", borderBottom: idx < detailGroup.student_id.length - 1 ? "1px solid #f9f9f9" : "none" }}>
                        <div style={avatar(id)}>{name.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>{name}</div>
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>{s?.personal_info?.email || id}</div>
                        </div>
                        <button onClick={() => handleRemoveStudent(id)} disabled={removingId === id} style={{ ...btnRed, width: "28px", height: "28px", padding: 0, fontSize: "12px", opacity: removingId === id ? 0.6 : 1 }}>
                          {removingId === id ? "⏳" : "ลบ"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── EDIT INFO MODE ── */}
            {editMode === "edit-info" && (
              <div style={{ padding: "20px 24px", overflowY: "auto" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>ชื่อกลุ่ม *</label>
                  <input type="text" value={editName} onInput={(e) => setEditName((e.target as HTMLInputElement).value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>คำอธิบาย</label>
                  <textarea value={editDesc} onInput={(e) => setEditDesc((e.target as HTMLTextAreaElement).value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                {infoSuccess && <div style={successBox}>{infoSuccess}</div>}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setEditMode("view")} style={{ ...btnDisabled, flex: 1, background: "#f3f4f6", color: "#555" }}>ยกเลิก</button>
                  <button onClick={handleSaveInfo} disabled={savingInfo} style={{ ...btnPrimary, flex: 1 }}>{savingInfo ? "⏳ บันทึก..." : "💾 บันทึก"}</button>
                </div>
              </div>
            )}

            {/* ── ADD MEMBERS MODE ── */}
            {editMode === "add-members" && (
              <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
                <div style={{ marginBottom: "10px", fontSize: "13px", color: "#6b7280" }}>นิสิตที่ยังไม่ได้อยู่ในกลุ่ม</div>
                {addSelected.length > 0 && <div style={{ ...badgeGreen, display: "inline-block", marginBottom: "10px" }}>เลือก {addSelected.length} คน</div>}
                <input type="text" value={addSearch} onInput={(e) => setAddSearch((e.target as HTMLInputElement).value)} placeholder="🔍 ค้นหา..." style={{ ...inputStyle, marginBottom: "8px", fontSize: "13px" }} />
                <div style={{ ...listBox, maxHeight: "240px" }}>
                  {notInGroup.length === 0 ? <div style={emptyList}>{addSearch ? "ไม่พบ" : "ทุกคนอยู่ในกลุ่มแล้ว"}</div> : notInGroup.map(s => {
                    const checked = addSelected.includes(s.student_id);
                    return (
                      <label key={s.student_id} style={{ ...listRow, background: checked ? "#ecfdf5" : "transparent" }}>
                        <input type="checkbox" checked={checked} onChange={() => setAddSelected(prev => checked ? prev.filter(id => id !== s.student_id) : [...prev, s.student_id])} style={{ width: "16px", height: "16px", accentColor: "#158e6d" }} />
                        <span style={{ fontSize: "14px", color: "#1f2937" }}>{sName(s)}</span>
                        <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "auto" }}>{s.student_id}</span>
                      </label>
                    );
                  })}
                </div>
                {addSuccess && <div style={{ ...successBox, marginTop: "10px" }}>{addSuccess}</div>}
                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button onClick={() => setEditMode("view")} style={{ ...btnDisabled, flex: 1, background: "#f3f4f6", color: "#555" }}>ยกเลิก</button>
                  <button onClick={handleAddMembers} disabled={addingMembers || !addSelected.length} style={{ ...(addSelected.length ? btnPrimary : btnDisabled), flex: 1 }}>{addingMembers ? "⏳ กำลังเพิ่ม..." : `➕ เพิ่ม ${addSelected.length || ""} คน`}</button>
                </div>
              </div>
            )}

            {/* footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0" }}>
              <button onClick={() => setDetailGroup(null)} style={{ ...btnPrimary, width: "100%" }}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const cardStyle: Record<string,any> = { background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "32px" };
const h2Style: Record<string,any> = { fontSize: "22px", fontWeight: "bold", marginBottom: "24px", color: "#1f2937" };
const labelStyle: Record<string,any> = { display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px", color: "#374151" };
const inputStyle: Record<string,any> = { width: "100%", padding: "12px 16px", boxSizing: "border-box", border: "2px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", color: "#1f2937", background: "white" };
const listBox: Record<string,any> = { border: "2px solid #d1d5db", borderRadius: "8px", maxHeight: "220px", overflowY: "auto", background: "#fafafa" };
const listRow: Record<string,any> = { display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" };
const emptyList: Record<string,any> = { padding: "16px", color: "#999", textAlign: "center", fontSize: "14px" };
const errorBox: Record<string,any> = { padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" };
const successBox: Record<string,any> = { padding: "12px 16px", background: "#d1fae5", color: "#065f46", borderRadius: "8px", marginBottom: "12px" };
const groupCard: Record<string,any> = { border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" };
const badgeGreen: Record<string,any> = { marginLeft: "8px", background: "#158e6d", color: "white", borderRadius: "12px", padding: "2px 10px", fontSize: "12px", fontWeight: "600" };
const badgeGreenOutline: Record<string,any> = { display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: "600" };
const btnPrimary: Record<string,any> = { padding: "13px 20px", background: "#158e6d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "15px", cursor: "pointer" };
const btnDisabled: Record<string,any> = { ...btnPrimary, background: "#9ca3af", cursor: "not-allowed" };
const btnBlue: Record<string,any> = { padding: "8px 14px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" };
const btnRed: Record<string,any> = { padding: "8px 14px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" };
const modalOverlay: Record<string,any> = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" };
const modalBox: Record<string,any> = { background: "white", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" };
const modalHeader: Record<string,any> = { padding: "24px 24px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
const closeBtn: Record<string,any> = { width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f3f4f6", cursor: "pointer", fontSize: "18px", color: "#6b7280", flexShrink: 0, marginLeft: "16px" };
const avatar = (id: string): Record<string,any> => ({ width: "36px", height: "36px", borderRadius: "50%", background: `hsl(${(id.charCodeAt(0)*37)%360},60%,60%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "14px", flexShrink: 0 });
