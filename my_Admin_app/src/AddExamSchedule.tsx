import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as XLSX from 'xlsx';

interface ExamRow {
  date: string;
  time: string;
  subject: string;
  group: string;
  studentCount: number;
  room: string;
  examiner: string;
}

const AddExamSchedule = (): JSX.Element => {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: any) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      const parsed = json.map((row) => ({
        date: row['วันที่'],
        time: row['เวลา'],
        subject: row['วิชา'],
        group: row['หมู่เรียน'],
        studentCount: Number(row['จำนวนนิสิต']),
        room: row['ห้องสอบ'],
        examiner: row['กรรมการคุมสอบ'],
      })) as ExamRow[];

      setRows(parsed);
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirm = async () => {
    try {
      console.log('ส่งข้อมูลไป backend:', rows);
      alert('✅ ส่งตารางสอบเรียบร้อยแล้ว');
      setRows([]);
      setFileName(null);
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">เพิ่มตารางสอบ</h2>

      <div className="mb-4">
        <label className="block mb-1 text-gray-700 font-medium">อัปโหลดไฟล์ Excel/CSV:</label>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
        {fileName && <p className="text-sm mt-2 text-gray-500">📄 ไฟล์ที่เลือก: {fileName}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto mt-6">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">วันที่</th>
                  <th className="border px-2 py-1">เวลา</th>
                  <th className="border px-2 py-1">วิชา</th>
                  <th className="border px-2 py-1">หมู่เรียน</th>
                  <th className="border px-2 py-1">จำนวนนิสิต</th>
                  <th className="border px-2 py-1">ห้องสอบ</th>
                  <th className="border px-2 py-1">กรรมการคุมสอบ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="text-center">
                    <td className="border px-2 py-1">{row.date}</td>
                    <td className="border px-2 py-1">{row.time}</td>
                    <td className="border px-2 py-1">{row.subject}</td>
                    <td className="border px-2 py-1">{row.group}</td>
                    <td className="border px-2 py-1">{row.studentCount}</td>
                    <td className="border px-2 py-1">{row.room}</td>
                    <td className="border px-2 py-1">{row.examiner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleConfirm}
            className="mt-6 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            ✅ ยืนยันตารางสอบ
          </button>
        </>
      )}
    </div>
  );
};

export default AddExamSchedule;
