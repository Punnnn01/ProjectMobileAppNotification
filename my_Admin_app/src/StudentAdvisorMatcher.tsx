import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export type StudentRow = {
  student_id: string;
  student_name: string;
  email: string;
  personal_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  adviser: string;
};

export type TeacherRow = {
  teacher_id: string;
  teacher_name: string;
  email: string;
  personal_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
};

const API_BASE = 'https://projectmobileappnotification-production.up.railway.app';

const StudentAdvisorMatcher = (): JSX.Element => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [advisors, setAdvisors] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingPair, setPendingPair] = useState<{
    student: { id: string; name: string };
    advisor: { id: string; name: string };
  } | null>(null);

  const idOf = (s: any) => {
    return s?.student_id || s?.teacher_id || s?.id || '';
  };
  
  const nameOf = (s: any) => {
    if (s?.student_name) return s.student_name;
    if (s?.teacher_name) return s.teacher_name;
    
    if (s?.personal_info) {
      const first = s.personal_info.firstName || '';
      const last = s.personal_info.lastName || '';
      return `${first} ${last}`.trim() || 'ไม่ระบุชื่อ';
    }
    
    return 'ไม่ระบุชื่อ';
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const sres = await fetch(`${API_BASE}/api/students/unassigned`, { 
        headers: { Accept: 'application/json' } 
      });
      
      if (!sres.ok) throw new Error(`ไม่สามารถโหลดนิสิต (${sres.status})`);
      const sdata = await sres.json();

      const ares = await fetch(`${API_BASE}/api/teachers`, { 
        headers: { Accept: 'application/json' } 
      });
      
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

  function handlePairClick() {
    if (!selectedStudentId || !selectedAdvisorId) return;

    const studentRaw = students.find((s) => idOf(s) === selectedStudentId);
    const advisorRaw = advisors.find((a) => idOf(a) === selectedAdvisorId);
    
    if (!studentRaw || !advisorRaw) return;

    const student = { id: idOf(studentRaw), name: nameOf(studentRaw) };
    const advisor = { id: idOf(advisorRaw), name: nameOf(advisorRaw) };

    setPendingPair({ student, advisor });
    setShowConfirmModal(true);
  }

  async function confirmPair() {
    if (!pendingPair) return;

    const { student, advisor } = pendingPair;

    try {
      const res = await fetch(`${API_BASE}/api/advisers/${encodeURIComponent(student.id)}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Accept: 'application/json' 
        },
        body: JSON.stringify({ teacherID: advisor.id }),
      });

      if (!res.ok) {
        const err = await (async () => {
          try {
            return await res.json();
          } catch {
            return null;
          }
        })();
        throw new Error(err?.message || `HTTP ${res.status}`);
      }

      // Remove student from list
      setStudents((prev) => prev.filter((s) => idOf(s) !== student.id));
      
      // Reset selections
      setSelectedStudentId('');
      setSelectedAdvisorId('');
      
      // Close confirm modal and show success modal
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      
      // Auto close success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setPendingPair(null);
      }, 2000);
    } catch (e: any) {
      alert(e?.message || 'ไม่สามารถจับคู่ได้');
      setShowConfirmModal(false);
    }
  }

  function cancelPair() {
    setShowConfirmModal(false);
    setPendingPair(null);
  }

  return (
    <div style={{ 
      maxWidth: '700px', 
      margin: '40px auto', 
      padding: '0 24px'
    }}>
      {/* Card Container */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          จับคู่นิสิตกับอาจารย์ที่ปรึกษา
        </h2>

        {loading && (
          <div style={{
            padding: '16px',
            background: '#dbeafe',
            color: '#1e40af',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            กำลังโหลดข้อมูล…
          </div>
        )}
        
        {error && (
          <div style={{
            padding: '16px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <strong>ข้อผิดพลาด:</strong> {error}
          </div>
        )}

        {!loading && !error && students.length === 0 && (
          <div style={{
            padding: '16px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            ⚠️ ไม่พบนิสิตที่ยังไม่มีที่ปรึกษา
          </div>
        )}

        {!loading && (
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px',
            textAlign: 'center',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            📊 นิสิต: <strong>{students.length}</strong> คน | อาจารย์: <strong>{advisors.length}</strong> คน
          </div>
        )}

        {/* Select Student */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#374151',
            fontSize: '14px'
          }}>
            เลือกนิสิต ({students.length} คน):
          </label>
          <select
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'all 0.2s',
              background: 'white'
            }}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId((e.target as HTMLSelectElement).value)}
            disabled={loading || students.length === 0}
          >
            <option value="">-- เลือกนิสิต (ยังไม่มีที่ปรึกษา) --</option>
            {students.map((student) => {
              const id = idOf(student);
              const name = nameOf(student);
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Select Advisor */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#374151',
            fontSize: '14px'
          }}>
            เลือกอาจารย์ ({advisors.length} คน):
          </label>
          <select
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'all 0.2s',
              background: 'white'
            }}
            value={selectedAdvisorId}
            onChange={(e) => setSelectedAdvisorId((e.target as HTMLSelectElement).value)}
            disabled={loading || advisors.length === 0}
          >
            <option value="">-- เลือกอาจารย์ --</option>
            {advisors.map((advisor) => {
              const id = idOf(advisor);
              const name = nameOf(advisor);
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        <button
          style={{
            width: '100%',
            background: selectedStudentId && selectedAdvisorId ? '#2563eb' : '#9ca3af',
            color: 'white',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: selectedStudentId && selectedAdvisorId ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
          onClick={handlePairClick}
          disabled={!selectedStudentId || !selectedAdvisorId || loading}
        >
          จับคู่
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingPair && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            margin: '0 16px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#1f2937',
              textAlign: 'center'
            }}>
              ยืนยันการจับคู่
            </h3>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '16px',
                textAlign: 'center' 
              }}>
                คุณต้องการจับคู่:
              </p>
              <div style={{
                background: '#eff6ff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}>
                <p style={{ 
                  fontWeight: '600', 
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  นิสิต:
                </p>
                <p style={{ 
                  color: '#374151',
                  marginLeft: '16px',
                  marginBottom: '4px'
                }}>
                  {pendingPair.student.name}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginLeft: '16px',
                  marginBottom: '16px'
                }}>
                  ID: {pendingPair.student.id}
                </p>
                
                <p style={{ 
                  fontWeight: '600', 
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  อาจารย์ที่ปรึกษา:
                </p>
                <p style={{ 
                  color: '#2563eb',
                  marginLeft: '16px',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  {pendingPair.advisor.name}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginLeft: '16px'
                }}>
                  ID: {pendingPair.advisor.id}
                </p>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                style={{
                  padding: '12px 24px',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={cancelPair}
              >
                ยกเลิก
              </button>
              <button
                style={{
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={confirmPair}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '48px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            animation: 'scaleIn 0.3s ease'
          }}>
            {/* Check Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'checkmark 0.5s ease'
            }}>
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#10b981',
              marginBottom: '12px'
            }}>
              สำเร็จ!
            </h3>

            <p style={{
              fontSize: '18px',
              color: '#374151',
              fontWeight: '500',
              lineHeight: '1.6'
            }}>
              จับคู่นิสิตกับที่ปรึกษาสำเร็จ
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentAdvisorMatcher;
