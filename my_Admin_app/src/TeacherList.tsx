// src/TeacherList.tsx
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

const API = 'http://localhost:8080';

interface Teacher {
  teacher_id: string;
  teacher_name?: string;
  is_verified?: boolean;
  is_rejected?: boolean;
  personal_info?: { firstName: string; lastName: string; email: string; phone?: string };
}

interface Student {
  student_id: string;
  student_name?: string;
  personal_info?: { firstName: string; lastName: string; email: string; phone?: string };
}

type Tab = 'teacher' | 'student';

export default function TeacherList(): JSX.Element {
  const [tab, setTab]                   = useState<Tab>('teacher');
  const [teachers, setTeachers]         = useState<Teacher[]>([]);
  const [pendingTeachers, setPending]   = useState<Teacher[]>([]);
  const [students, setStudents]         = useState<Student[]>([]);
  const [loadingT, setLoadingT]         = useState(true);
  const [loadingS, setLoadingS]         = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [actionId, setActionId]         = useState<string | null>(null); // ระหว่าง approve/reject

  const loadTeachers = () => {
    setLoadingT(true);
    Promise.all([
      fetch(`${API}/api/teachers/`).then(r => r.json()),
      fetch(`${API}/api/teachers/pending`).then(r => r.json()),
    ]).then(([all, pending]) => {
      setTeachers(Array.isArray(all) ? all : []);
      setPending(pending?.data || []);
    }).catch(e => setError(e?.message || 'โหลดข้อมูลอาจารย์ไม่สำเร็จ'))
      .finally(() => setLoadingT(false));
  };

  useEffect(() => {
    loadTeachers();
    fetch(`${API}/api/students/`)
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d) ? d : []))
      .catch(e => setError(e?.message || 'โหลดข้อมูลนิสิตไม่สำเร็จ'))
      .finally(() => setLoadingS(false));
  }, []);

  function teacherName(t: Teacher) {
    return t.personal_info ? `${t.personal_info.firstName} ${t.personal_info.lastName}`.trim() : t.teacher_name || '-';
  }
  function studentName(s: Student) {
    return s.personal_info ? `${s.personal_info.firstName} ${s.personal_info.lastName}`.trim() : s.student_name || '-';
  }

  async function handleVerify(id: string) {
    if (!confirm('ยืนยันอนุมัติอาจารย์คนนี้?')) return;
    setActionId(id);
    try {
      await fetch(`${API}/api/teachers/${id}/verify`, { method: 'POST' });
      loadTeachers();
    } catch { alert('เกิดข้อผิดพลาด'); }
    finally { setActionId(null); }
  }

  async function handleReject(id: string, name: string) {
    if (!confirm(`ปฏิเสธบัญชีของ "${name}"?\nบัญชีจะถูก block ไม่ให้เข้าสู่ระบบ`)) return;
    setActionId(id);
    try {
      await fetch(`${API}/api/teachers/${id}/reject`, { method: 'POST' });
      loadTeachers();
    } catch { alert('เกิดข้อผิดพลาด'); }
    finally { setActionId(null); }
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredTeachers = teachers.filter(t => {
    const name = teacherName(t);
    return !q || name.toLowerCase().includes(q) || t.teacher_id.toLowerCase().includes(q) || (t.personal_info?.email || '').toLowerCase().includes(q);
  });
  const filteredStudents = students.filter(s => {
    const name = studentName(s);
    return !q || name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || (s.personal_info?.email || '').toLowerCase().includes(q);
  });

  const isLoading = tab === 'teacher' ? loadingT : loadingS;

  return (
    <>
      {/* Tab selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '32px 24px 0' }}>
        {(['teacher', 'student'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 32px', borderRadius: '8px', border: 'none',
            fontWeight: '600', fontSize: '15px', cursor: 'pointer',
            background: tab === t ? '#158e6d' : '#e5e7eb',
            color: tab === t ? 'white' : '#374151',
          }}>
            {t === 'teacher'
              ? `👨‍🏫 อาจารย์ (${loadingT ? '...' : teachers.length} คน)`
              : `🎓 นิสิต (${loadingS ? '...' : students.length} คน)`}
          </button>
        ))}
      </div>

      {error && <div style={{ margin: '16px 24px', padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>❌ {error}</div>}

      {/* Title + Search */}
      <div style={{ padding: '16px 24px 0', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            {tab === 'teacher' ? 'รายชื่ออาจารย์ทั้งหมด' : 'รายชื่อนิสิตทั้งหมด'}
          </h3>
        </div>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder={tab === 'teacher' ? 'ค้นหาอาจารย์จากชื่อ รหัส Email...' : 'ค้นหานิสิตจากชื่อ รหัส Email...'}
            value={searchQuery}
            onInput={e => setSearchQuery((e.target as HTMLInputElement).value)}
            style={{ width: '100%', padding: '11px 40px 11px 42px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', borderColor: q ? '#158e6d' : '#e5e7eb' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af' }}>✕</button>
          )}
        </div>
      </div>

      {isLoading && <div className="state">กำลังโหลดข้อมูล…</div>}

      {/* ══ ส่วนรออนุมัติ (แสดงเฉพาะ tab teacher) ══ */}
      {!isLoading && tab === 'teacher' && pendingTeachers.length > 0 && (
        <div style={{ maxWidth: '1400px', margin: '0 auto 24px', padding: '0 24px' }}>
          <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '12px', overflow: 'hidden' }}>
            {/* header */}
            <div style={{ background: '#f59e0b', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>
                รออนุมัติ ({pendingTeachers.length} คน)
              </span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', marginLeft: 'auto' }}>
                กรุณาตรวจสอบและอนุมัติ
              </span>
            </div>
            {/* list */}
            <div>
              {pendingTeachers.map((t, i) => {
                const name = teacherName(t);
                const isActing = actionId === t.teacher_id;
                return (
                  <div key={t.teacher_id} style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px',
                    borderBottom: i < pendingTeachers.length - 1 ? '1px solid #fde68a' : 'none',
                    background: i % 2 === 0 ? 'white' : '#fffdf0',
                  }}>
                    {/* avatar */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                      background: `hsl(${(t.teacher_id.charCodeAt(0) * 37) % 360}, 55%, 60%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: '700', fontSize: '16px',
                    }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#1f2937' }}>{name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        รหัส: {t.teacher_id}
                        {t.personal_info?.email && <span style={{ marginLeft: '12px' }}>📧 {t.personal_info.email}</span>}
                        {t.personal_info?.phone && <span style={{ marginLeft: '12px' }}>📞 {t.personal_info.phone}</span>}
                      </div>
                    </div>
                    {/* actions */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        disabled={isActing}
                        onClick={() => handleVerify(t.teacher_id)}
                        style={{
                          padding: '8px 18px', border: 'none', borderRadius: '8px',
                          background: isActing ? '#9ca3af' : '#158e6d', color: 'white',
                          fontWeight: '700', fontSize: '13px',
                          cursor: isActing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isActing ? '⏳' : '✅ อนุมัติ'}
                      </button>
                      <button
                        disabled={isActing}
                        onClick={() => handleReject(t.teacher_id, name)}
                        style={{
                          padding: '8px 18px', border: '1px solid #fecaca', borderRadius: '8px',
                          background: '#fee2e2', color: '#dc2626',
                          fontWeight: '700', fontSize: '13px',
                          cursor: isActing ? 'not-allowed' : 'pointer',
                          opacity: isActing ? 0.6 : 1,
                        }}
                      >
                        ❌ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ ตารางอาจารย์/นิสิต ══ */}
      {!isLoading && (
        <div className="table-wrap">
          {tab === 'teacher' ? (
            <table className="table">
              <thead>
                <tr>
                  <th className="col-no">No.</th>
                  <th className="col-code">รหัสอาจารย์</th>
                  <th className="col-name">ชื่อ-นามสกุล</th>
                  <th className="col-email">Email</th>
                  <th className="col-phone">เบอร์โทร</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '100px' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>ไม่พบข้อมูลอาจารย์</td></tr>
                ) : (
                  filteredTeachers.map((t, i) => (
                    <tr key={t.teacher_id}>
                      <td className="col-no">{i + 1}</td>
                      <td className="col-code">{t.teacher_id}</td>
                      <td className="col-name">{teacherName(t)}</td>
                      <td className="col-email">{t.personal_info?.email || '-'}</td>
                      <td className="col-phone">{t.personal_info?.phone || '-'}</td>
                      <td style={{ textAlign: 'center', padding: '8px 16px' }}>
                        {t.is_rejected ? (
                          <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>❌ ปฏิเสธ</span>
                        ) : t.is_verified === false ? (
                          <span style={{ background: '#fef9c3', color: '#d97706', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>⏳ รอยืนยัน</span>
                        ) : (
                          <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>✅ ยืนยันแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="col-no">No.</th>
                  <th className="col-code">รหัสนิสิต</th>
                  <th className="col-name">ชื่อ-นามสกุล</th>
                  <th className="col-email">Email</th>
                  <th className="col-phone">เบอร์โทร</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>ไม่พบข้อมูลนิสิต</td></tr>
                ) : (
                  filteredStudents.map((s, i) => (
                    <tr key={s.student_id}>
                      <td className="col-no">{i + 1}</td>
                      <td className="col-code">{s.student_id}</td>
                      <td className="col-name">{studentName(s)}</td>
                      <td className="col-email">{s.personal_info?.email || '-'}</td>
                      <td className="col-phone">{s.personal_info?.phone || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
