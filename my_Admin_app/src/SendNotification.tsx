import { useState } from 'preact/hooks';

interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
}

export default function SendNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetGroup, setTargetGroup] = useState<'all' | 'students' | 'teachers'>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NotificationResult | null>(null);

  const sendNotification = async () => {
    if (!title || !body) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // ส่งผ่าน Backend API
      const response = await fetch('https://projectmobileappnotification-production.up.railway.app/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          targetGroup,
        }),
      });

      const data = await response.json();
      console.log('✅ Response:', data);

      if (!data.success) {
        throw new Error(data.error || 'ส่งไม่สำเร็จ');
      }

      setResult({
        success: true,
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
      });

      alert(`ส่งสำเร็จ! ${data.sentCount} คน${data.failedCount > 0 ? `, ส่งไม่สำเร็จ: ${data.failedCount} คน` : ''}`);

      // Clear form
      setTitle('');
      setBody('');

    } catch (error: any) {
      console.error('❌ Error:', error);
      alert('ส่งไม่สำเร็จ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#1B8B6A', marginBottom: '20px' }}>
        📤 ส่ง Push Notification
      </h2>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          หัวข้อ:
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          placeholder="เช่น ข่าวสำคัญ"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          ข้อความ:
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          placeholder="เช่น มีข่าวสารสำคัญ กรุณาตรวจสอบ"
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          ส่งถึง:
        </label>
        <select
          value={targetGroup}
          onChange={(e) => setTargetGroup((e.target as HTMLSelectElement).value as any)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxSizing: 'border-box',
          }}
        >
          <option value="all">ทุกคน (นักศึกษา + อาจารย์)</option>
          <option value="students">นักศึกษาเท่านั้น</option>
          <option value="teachers">อาจารย์เท่านั้น</option>
        </select>
      </div>

      <button
        onClick={sendNotification}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#1B8B6A',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
      >
        {loading ? '⏳ กำลังส่ง...' : '📤 ส่ง Notification'}
      </button>

      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '5px',
          }}
        >
          <strong style={{ color: '#155724' }}>✅ ส่งสำเร็จ!</strong>
          <p style={{ margin: '10px 0 5px 0' }}>
            ส่งไปยัง: <strong>{result.sentCount}</strong> คน
          </p>
          {result.failedCount > 0 && (
            <p style={{ margin: '5px 0', color: '#721c24' }}>
              ส่งไม่สำเร็จ: <strong>{result.failedCount}</strong> คน
            </p>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <strong>💡 คำแนะนำ:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Notification จะส่งไปยังผู้ที่เปิดใช้งานการแจ้งเตือนเท่านั้น</li>
          <li>ผู้ใช้ต้อง Login และมี FCM Token ในระบบ</li>
          <li>การส่งอาจใช้เวลา 5-30 วินาที</li>
        </ul>
      </div>
    </div>
  );
}
