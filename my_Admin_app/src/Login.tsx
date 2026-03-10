// src/Login.tsx
import { useState } from 'preact/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './style.css';

export type UserRole = 'admin' | 'teacher';

export interface LoggedInUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  docId: string; // admin_id หรือ teacher_id
}

interface LoginProps {
  onLoginSuccess: (user: LoggedInUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Login ด้วย Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // 2. ตรวจสอบว่าเป็น Admin หรือ Teacher โดยค้นหาจาก Firestore
      const user = await resolveUserRole(uid);

      if (!user) {
        await auth.signOut();
        setError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบ (ไม่พบในฐานข้อมูล Admin หรือ Teacher)');
        return;
      }

      onLoginSuccess(user);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (code === 'auth/too-many-requests') {
        setError('ลองใหม่หลายครั้งเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง');
      } else if (code === 'auth/network-request-failed') {
        setError('ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      } else {
        setError('เกิดข้อผิดพลาด: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🔐 เข้าสู่ระบบ</h1>
          <p>ระบบจัดการแจ้งเตือน</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">อีเมล</label>
            <input
              type="email"
              id="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="กรอกอีเมล"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              type="password"
              id="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              placeholder="กรอกรหัสผ่าน"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ค้นหา role ของผู้ใช้จาก Firestore
async function resolveUserRole(uid: string): Promise<LoggedInUser | null> {
  // ค้นหาใน Admin ก่อน
  const adminSnap = await getDoc(doc(db, 'Admin', uid));
  if (adminSnap.exists()) {
    const data = adminSnap.data();
    return {
      uid,
      email: data.personal_info?.email || '',
      role: 'admin',
      displayName: `${data.personal_info?.firstName || ''} ${data.personal_info?.lastName || ''}`.trim() || 'Admin',
      docId: adminSnap.id,
    };
  }

  // ค้นหาใน Teacher โดย auth_uid
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const teacherQuery = query(collection(db, 'Teacher'), where('auth_uid', '==', uid));
  const teacherSnap = await getDocs(teacherQuery);

  if (!teacherSnap.empty) {
    const docSnap = teacherSnap.docs[0];
    const data = docSnap.data();
    return {
      uid,
      email: data.personal_info?.email || '',
      role: 'teacher',
      displayName: `${data.personal_info?.firstName || ''} ${data.personal_info?.lastName || ''}`.trim() || 'Teacher',
      docId: docSnap.id,
    };
  }

  return null;
}
