// src/main.ts
import './style.css';

type StudentRow = {
  no: number;
  studentID?: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  adviserId?: string | null;
  adviserName?: string | null; // ถ้า backend รวมชื่อมาให้
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <button class="btn-logout" id="btnLogout">ออกจากระบบ</button>
  </header>

  <section class="actions">
    <button class="action-btn" id="btnNews" href="addNews">เพิ่มข่าวสาร</button>
    <button class="action-btn" id="btnExam">เพิ่มตารางสอบ</button>
    <button class="action-btn" id="btnMatch">จับคู่นิสิต/ที่ปรึกษา</button>
  </section>

  <h3 class="section-title">รายชื่อนิสิตทั้งหมด</h3>

  <div id="state" class="state">กำลังโหลดข้อมูล…</div>

  <div class="table-wrap" style="display:none" id="tableWrap">
    <table class="table">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-code">รหัสนิสิต</th>
          <th class="col-name">ชื่อ-นามสกุล</th>
          <th class="col-advisor">ที่ปรึกษา</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
`;

const tbody = document.getElementById('tbody') as HTMLTableSectionElement;
const stateEl = document.getElementById('state') as HTMLDivElement;
const tableWrap = document.getElementById('tableWrap') as HTMLDivElement;

// ปุ่ม (placeholder ไว้ต่อยอด)
document.getElementById('btnLogout')?.addEventListener('click', () => alert('TODO: ออกจากระบบ'));
document.getElementById('btnNews')?.addEventListener('click', () => alert('TODO: เพิ่มข่าวสาร'));
document.getElementById('btnExam')?.addEventListener('click', () => alert('TODO: เพิ่มตารางสอบ'));
document.getElementById('btnMatch')?.addEventListener('click', () => alert('TODO: จับคู่นิสิต/ที่ปรึกษา'));

function escapeHtml(str: string) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadStudents() {
  try {
    stateEl.style.display = 'block';
    stateEl.textContent = 'กำลังโหลดข้อมูล…';
    tableWrap.style.display = 'none';

    // ถ้าตั้ง proxy ใน vite แล้ว ใช้แค่เส้นทางสัมพัทธ์ /api/students
    // ถ้าไม่ได้ตั้ง proxy ให้เปลี่ยนเป็น URL ของ backend เช่น http://localhost:3000/api/students
    const res = await fetch('http://localhost:8080/api/students/', { headers: { Accept: 'application/json' } });
    console.log(res);
    if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);

    const rows = (await res.json()) as StudentRow[]; // รองรับรูปแบบที่ backend ส่งมา
    renderRows(rows);
    stateEl.style.display = 'none';
    tableWrap.style.display = 'block';
  } catch (e: any) {
    stateEl.classList.add('error');
    stateEl.textContent = e?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
  }
}

function renderRows(rows: StudentRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding:28px 0;">ไม่พบข้อมูลนิสิต</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((r, i) => {
      const fullName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
      // ถ้า backend ให้ adviserName มาแล้วใช้เลย ไม่งั้น fallback จาก adviserId
      const advisorText =
        r.adviserName && r.adviserName.trim() !== ''
          ? r.adviserName
          : r.adviserId
          ? `อ. #${r.adviserId}`
          : '-';

      return `
        <tr>
          <td class="col-no">${r.no ?? i + 1}</td>
          <td class="col-code">${escapeHtml(r.studentCode)}</td>
          <td class="col-name">${escapeHtml(fullName)}</td>
          <td class="col-advisor">${escapeHtml(advisorText)}</td>
        </tr>
      `;
    })
    .join('');
}

// เริ่มทำงาน
loadStudents();
