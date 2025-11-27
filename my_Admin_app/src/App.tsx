// src/App.tsx
import { useEffect, useState } from 'preact/hooks';
import AddExamSchedule from './AddExamSchedule';
import AddNews from './AddNews';
import { Link, Route, RouterProvider } from './router';
import StudentAdvisorMatcher from './StudentAdvisorMatcher';
import './style.css';

export type StudentRow = {
  no: number;
  student_id: string;
  student_name: string;
  personal_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  adviser?: string;
  adviserName?: string | null;
};

export default function App() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      setLoading(true);
      setError(null);

      // 1. ดึงข้อมูลนิสิตทั้งหมด
      const studentsRes = await fetch('http://localhost:8080/api/students/', { 
        headers: { Accept: 'application/json' } 
      });
      
      if (!studentsRes.ok) throw new Error(`โหลดข้อมูลนิสิตไม่สำเร็จ (${studentsRes.status})`);
      
      const students = await studentsRes.json();
      console.log('Loaded students:', students);

      // 2. ดึงข้อมูลอาจารย์ทั้งหมด
      const teachersRes = await fetch('http://localhost:8080/api/teachers/', { 
        headers: { Accept: 'application/json' } 
      });
      
      const teachers = teachersRes.ok ? await teachersRes.json() : [];
      console.log('Loaded teachers:', teachers);

      // 3. สร้าง Map ของอาจารย์ (teacherId -> ชื่อเต็ม)
      const teacherMap = new Map<string, string>();
      teachers.forEach((t: any) => {
        const fullName = t.personal_info 
          ? `${t.personal_info.firstName} ${t.personal_info.lastName}`.trim()
          : t.teacher_name || '';
        teacherMap.set(t.teacher_id, fullName);
      });

      // 4. แปลงข้อมูลนิสิตและเติมชื่ออาจารย์
      const mapped = students.map((item: any, index: number) => {
        const adviserName = item.adviser && item.adviser.trim() !== '' 
          ? teacherMap.get(item.adviser) || null
          : null;

        return {
          no: index + 1,
          student_id: item.student_id,
          student_name: item.student_name,
          personal_info: item.personal_info,
          adviser: item.adviser,
          adviserName: adviserName
        };
      });
      
      setRows(mapped);
    } catch (e: any) {
      console.error('Load students error:', e);
      setError(e?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function renderAdvisor(r: StudentRow) {
    // แสดงชื่ออาจารย์ถ้ามี
    if (r.adviserName && r.adviserName.trim() !== '') {
      return `อ. ${r.adviserName}`;
    }
    // ถ้ามี ID แต่ไม่เจอชื่อ
    if (r.adviser && r.adviser.trim() !== '') {
      return `ID: ${r.adviser} (ไม่พบข้อมูล)`;
    }
    // ไม่มีที่ปรึกษา
    return '-';
  }

  return (
    <RouterProvider>
      <div>
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            className="btn-logout"
            id="btnHome"
            onClick={() => { location.hash = '#/'; }}
            aria-label="กลับหน้าหลัก"
          >
            หน้าหลัก
          </button>

          <button class="btn-logout" id="btnLogout">ออกจากระบบ</button>
        </header>
        
        <section class="actions">
          <Link to="/add-news"><button class="action-btn">เพิ่มข่าวสาร</button></Link>
          <Link to="/add-exam"><button class="action-btn">เพิ่มตารางสอบ</button></Link>
          <Link to="/match-advisor"><button class="action-btn" id="btnMatch">จับคู่นิสิต/ที่ปรึกษา</button></Link>
        </section>

        <Route path="/">
          <h3 className="section-title">รายชื่อนิสิตทั้งหมด</h3>

          {loading && <div id="state" className="state">กำลังโหลดข้อมูล…</div>}
          {error && <div id="state" className="state error">{error}</div>}

          {!loading && !error && (
            <div className="table-wrap" id="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-no">No.</th>
                    <th className="col-code">รหัสนิสิต</th>
                    <th className="col-name">ชื่อ-นามสกุล</th>
                    <th className="col-email">Email</th>
                    <th className="col-phone">เบอร์โทร</th>
                    <th className="col-advisor">ที่ปรึกษา</th>
                  </tr>
                </thead>
                <tbody id="tbody">
                  {(!rows || rows.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '28px 0' }}>ไม่พบข้อมูลนิสิต</td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const fullName = `${r.personal_info?.firstName || ''} ${r.personal_info?.lastName || ''}`.trim() || r.student_name;
                      return (
                        <tr key={r.student_id}>
                          <td className="col-no">{r.no}</td>
                          <td className="col-code">{r.student_id}</td>
                          <td className="col-name">{fullName}</td>
                          <td className="col-email">{r.personal_info?.email || '-'}</td>
                          <td className="col-phone">{r.personal_info?.phone || '-'}</td>
                          <td className="col-advisor">{renderAdvisor(r)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Route>

        <Route path="/add-news">
            <AddNews />
        </Route>
        <Route path="/match-advisor">
            <StudentAdvisorMatcher />
        </Route>
        <Route path="/add-exam">
            <AddExamSchedule />
        </Route>
      </div>
    </RouterProvider>
  );
}
