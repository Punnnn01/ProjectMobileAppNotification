import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export type StudentRow = {
  no?: number;
  studentID?: string;
  id?: string;
  studentCode?: string;
  firstName?: string;
  lastName?: string;
  adviserId?: string | null;
  adviserName?: string | null;
};

export type TeacherRow = {
  id?: string;
  teacherID?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

const API_BASE = 'http://localhost:8080';

const StudentAdvisorMatcher = (): JSX.Element => {
  const [students, setStudents] = useState<StudentRow[]>([]); // unassigned students
  const [advisors, setAdvisors] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // local pairs for UI
  const [pairs, setPairs] = useState<
    Array<{ student: { id: string; name: string }; advisor: { id: string; name: string } }>
  >([]);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');

  // normalize helpers
  const idOf = (s: any) => s?.id ?? s?.studentID ?? s?.studentCode ?? '';
  const nameOf = (s: any) => s?.name ?? `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // fetch unassigned students (backend provides /api/students/unassigned)
      const sres = await fetch(`${API_BASE}/api/students/unassigned`, { headers: { Accept: 'application/json' } });
      if (!sres.ok) throw new Error(`ไม่สามารถโหลดนิสิต (${sres.status})`);
      const sdata = await sres.json();

      // fetch advisors/teachers (use /api/teachers)
      const ares = await fetch(`${API_BASE}/api/teachers`, { headers: { Accept: 'application/json' } });
      if (!ares.ok) throw new Error(`ไม่สามารถโหลดอาจารย์ (${ares.status})`);
      const adata = await ares.json();

      setStudents(Array.isArray(sdata) ? sdata : []);
      setAdvisors(Array.isArray(adata) ? adata : []);
    } catch (e: any) {
      setError(e?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  async function handlePair() {
    if (!selectedStudentId || !selectedAdvisorId) return;

    const studentRaw = students.find((s) => idOf(s) === selectedStudentId);
    const advisorRaw = advisors.find((a) => idOf(a) === selectedAdvisorId);
    if (!studentRaw || !advisorRaw) return;

    const student = { id: idOf(studentRaw), name: nameOf(studentRaw) };
    const advisor = { id: idOf(advisorRaw), name: nameOf(advisorRaw) };

    // optimistically update UI after successful backend assign
    try {
      const res = await fetch(`${API_BASE}/api/advisers/${encodeURIComponent(student.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ teacherID: advisor.id }),
      });
      if (!res.ok) {
        const err = await (async () => {
          try { return await res.json(); } catch { return null; }
        })();
        throw new Error(err?.message || `HTTP ${res.status}`);
      }

      // remove student from available list and add to pairs
      setStudents((prev) => prev.filter((s) => idOf(s) !== student.id));
      setPairs((prev) => [...prev, { student, advisor }]);
      setSelectedStudentId('');
      setSelectedAdvisorId('');
    } catch (e: any) {
      alert(e?.message || 'ไม่สามารถจับคู่ได้');
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4">จับคู่นิสิตกับอาจารย์ที่ปรึกษา</h2>

      {loading && <div className="mb-4">กำลังโหลดข้อมูล…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {/* Select Student */}
      <div className="mb-4">
        <label className="block text-gray-700">เลือกนิสิต:</label>
        <select
          className="mt-1 block w-full border border-gray-300 p-2 rounded"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId((e.target as HTMLSelectElement).value)}
        >
          <option value="">-- เลือกนิสิต (ยังไม่มีที่ปรึกษา) --</option>
          {students.map((student) => (
            <option key={idOf(student)} value={idOf(student)}>
              {nameOf(student)}
            </option>
          ))}
        </select>
      </div>

      {/* Select Advisor (show all) */}
      <div className="mb-4">
        <label className="block text-gray-700">เลือกอาจารย์:</label>
        <select
          className="mt-1 block w-full border border-gray-300 p-2 rounded"
          value={selectedAdvisorId}
          onChange={(e) => setSelectedAdvisorId((e.target as HTMLSelectElement).value)}
        >
          <option value="">-- เลือกอาจารย์ --</option>
          {advisors.map((advisor) => (
            <option key={idOf(advisor)} value={idOf(advisor)}>
              {nameOf(advisor)}
            </option>
          ))}
        </select>
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handlePair}
        disabled={!selectedStudentId || !selectedAdvisorId}
      >
        จับคู่
      </button>

      {/* Result Table */}
      {pairs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">รายการจับคู่:</h3>
          <ul className="list-disc pl-5">
            {pairs.map((pair, index) => (
              <li key={index}>
                {pair.student.name} → {pair.advisor.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StudentAdvisorMatcher;