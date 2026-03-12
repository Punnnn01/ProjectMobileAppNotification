import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

interface UserProfile {
  role: {
    role_id: string;
    roleName: string;
  };
  personal_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  subject?: string[];
  notification: string[];
  adviser_id?: string;
  chat_history: string[];
  is_verified?: boolean;
  is_rejected?: boolean;
}

interface AuthContextType {
  user: User | null;
  userId: string | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'student' | 'teacher',
    studentId: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 ชั่วโมง

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTime  = useRef<number | null>(null);
  // เก็บ authUID ล่าสุดที่กำลัง fetch ไว้ป้องกัน race condition
  const currentAuthUID  = useRef<string | null>(null);

  // ── Inactivity timeout ──────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      console.log('⏰ Session timeout — 1 ชั่วโมงไม่มีการใช้งาน');
      await signOut(auth);
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  // ติดตาม AppState background > 1 ชั่วโมง
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTime.current = Date.now();
      } else if (nextState === 'active' && backgroundTime.current) {
        const elapsed = Date.now() - backgroundTime.current;
        backgroundTime.current = null;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          console.log('⏰ Background timeout → logout');
          await signOut(auth);
        } else {
          resetInactivityTimer();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [resetInactivityTimer]);

  // ── Fetch user profile from Firestore ──────────────────────────────────────
  const fetchUserProfileByAuthUID = useCallback(async (authUID: string) => {
    currentAuthUID.current = authUID;
    try {
      console.log('Fetching profile for auth UID:', authUID);

      // Student
      const studentSnap = await getDocs(
        query(collection(db, 'Student'), where('auth_uid', '==', authUID))
      );
      if (!studentSnap.empty && currentAuthUID.current === authUID) {
        const docSnap    = studentSnap.docs[0];
        const profileData = docSnap.data() as UserProfile;
        const sid         = (profileData as any).student_id || docSnap.id;
        console.log('Found in Student. userId:', sid);
        setUserId(sid);
        setUserProfile(profileData);
        return;
      }

      // Teacher
      const teacherSnap = await getDocs(
        query(collection(db, 'Teacher'), where('auth_uid', '==', authUID))
      );
      if (!teacherSnap.empty && currentAuthUID.current === authUID) {
        const docSnap    = teacherSnap.docs[0];
        const profileData = docSnap.data() as UserProfile;
        const tid         = (profileData as any).teacher_id || docSnap.id;
        console.log('Found in Teacher. userId:', tid);
        setUserId(tid);
        setUserProfile(profileData);
        return;
      }

      // Admin
      const adminSnap = await getDocs(
        query(collection(db, 'Admin'), where('auth_uid', '==', authUID))
      );
      if (!adminSnap.empty && currentAuthUID.current === authUID) {
        const docSnap    = adminSnap.docs[0];
        const profileData = docSnap.data() as UserProfile;
        console.log('Found in Admin. userId:', docSnap.id);
        setUserId(docSnap.id);
        setUserProfile(profileData);
        return;
      }

      // ไม่พบใน collection ไหนเลย
      if (currentAuthUID.current === authUID) {
        console.log('Profile not found in any collection');
        setUserId(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (currentAuthUID.current === authUID) {
        setUserId(null);
        setUserProfile(null);
      }
    }
  }, []);

  // ── Firebase Auth state listener ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email ?? 'null');
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserProfileByAuthUID(firebaseUser.uid);
        resetInactivityTimer();
      } else {
        currentAuthUID.current = null;
        setUserProfile(null);
        setUserId(null);
        clearInactivityTimer();
      }

      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserProfileByAuthUID, resetInactivityTimer, clearInactivityTimer]);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;
    console.log('Login successful:', uid);

    // เช็คสถานะ teacher pending/rejected
    const teacherSnap = await getDocs(
      query(collection(db, 'Teacher'), where('auth_uid', '==', uid))
    );
    if (!teacherSnap.empty) {
      const data = teacherSnap.docs[0].data();
      if (data.is_rejected === true) {
        await signOut(auth);
        throw { code: 'teacher/rejected', message: 'บัญชีของคุณไม่ได้รับการยืนยัน กรุณาติดต่อผู้ดูแลระบบ' };
      }
      if (data.is_verified === false) {
        await signOut(auth);
        throw { code: 'teacher/pending', message: 'บัญชีของคุณอยู่ระหว่างรอการยืนยันจากแอดมิน' };
      }
    }
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'student' | 'teacher',
    studentId: string
  ) => {
    console.log('=== Starting Registration ===');
    const collectionName = role === 'student' ? 'Student' : 'Teacher';

    // เช็ค ID ซ้ำ
    const existingDoc = await getDoc(doc(db, collectionName, studentId));
    if (existingDoc.exists()) throw new Error('รหัสนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log('✓ Auth user created with UID:', uid);

    const personalInfo = { firstName, lastName, email, phone: '' };
    const roleInfo     = { role_id: role, roleName: role === 'student' ? 'Student' : 'Teacher' };

    if (role === 'student') {
      await setDoc(doc(db, 'Student', studentId), {
        student_id: studentId,
        auth_uid: uid,
        personal_info: personalInfo,
        role: roleInfo,
        subject: [],
        notification: [],
        adviser_id: '',
        chat_history: [],
        bookmarks: [],
      });
    } else {
      await setDoc(doc(db, 'Teacher', studentId), {
        teacher_id: studentId,
        auth_uid: uid,
        personal_info: personalInfo,
        role: roleInfo,
        subject: [],
        notification: [],
        chat_history: [],
        bookmarks: [],
        is_verified: false,
        is_rejected: false,
      });
    }
    console.log('=== Registration Complete ===');
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    console.log('Logging out...');
    // clear state ก่อน signOut เพื่อให้ UI ไม่ค้าง
    currentAuthUID.current = null;
    setUser(null);
    setUserId(null);
    setUserProfile(null);
    clearInactivityTimer();
    await signOut(auth);
    console.log('✓ Logged out');
  }, [clearInactivityTimer]);

  // ── refreshUserProfile ─────────────────────────────────────────────────────
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      console.log('Refreshing user profile...');
      await fetchUserProfileByAuthUID(user.uid);
      console.log('✓ User profile refreshed');
    }
  }, [user, fetchUserProfileByAuthUID]);

  const value = useMemo(() => ({
    user, userId, userProfile, loading,
    login, register, logout, refreshUserProfile
  }), [user, userId, userProfile, loading, login, register, logout, refreshUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
