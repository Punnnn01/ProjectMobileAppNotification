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
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTime = useRef<number | null>(null);

  // ── Inactivity timeout (1 ชั่วโมง) ────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      console.log('⏰ Session timeout เพราะไม่มีการใช้งาน 1 ชั่วโมง');
      await signOut(auth);
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  // ติดตาม AppState: ถ้าแอปไป background > 1 ชั่วโมง → logout ทันทีเมื่อกลับมา
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // บันทึกเวลาที่แอปไป background
        backgroundTime.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundTime.current) {
          const elapsed = Date.now() - backgroundTime.current;
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            // อยู่ background นานเกิน 1 ชั่วโมง → logout
            console.log('⏰ Background timeout → logout');
            await signOut(auth);
          } else {
            // ยังไม่หมด → reset timer ให้นับใหม่
            resetInactivityTimer();
          }
          backgroundTime.current = null;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [resetInactivityTimer]);

  // ── Firebase Auth State ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setUser(user);
      
      if (user) {
        await fetchUserProfileByAuthUID(user.uid);
        resetInactivityTimer(); // เริ่มนับ timeout เมื่อ login
      } else {
        setUserProfile(null);
        setUserId(null);
        clearInactivityTimer(); // ยกเลิก timer เมื่อ logout
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchUserProfileByAuthUID = async (authUID: string) => {
    try {
      console.log('Fetching profile for auth UID:', authUID);
      
      // ค้นหาใน Student collection
      const studentQuery = query(
        collection(db, 'Student'),
        where('auth_uid', '==', authUID)
      );
      const studentSnapshot = await getDocs(studentQuery);
      
      if (!studentSnapshot.empty) {
        console.log('Found in Student collection');
        const docSnap = studentSnapshot.docs[0];
        const profileData = docSnap.data() as UserProfile;
        const studentId = (profileData as any).student_id || docSnap.id;
        console.log('Profile data:', profileData.personal_info);
        console.log('✅ Setting userId to:', studentId);
        setUserId(studentId);
        setUserProfile(profileData);
        return;
      }
      
      // ค้นหาใน Teacher collection
      const teacherQuery = query(
        collection(db, 'Teacher'),
        where('auth_uid', '==', authUID)
      );
      const teacherSnapshot = await getDocs(teacherQuery);
      
      if (!teacherSnapshot.empty) {
        console.log('Found in Teacher collection');
        const docSnap = teacherSnapshot.docs[0];
        const profileData = docSnap.data() as UserProfile;
        const teacherId = (profileData as any).teacher_id || docSnap.id;
        console.log('Profile data:', profileData.personal_info);
        console.log('✅ Setting userId to:', teacherId);
        setUserId(teacherId);
        setUserProfile(profileData);
        return;
      }

      // ค้นหาใน Admin collection
      const adminQuery = query(
        collection(db, 'Admin'),
        where('auth_uid', '==', authUID)
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        console.log('Found in Admin collection');
        const docSnap = adminSnapshot.docs[0];
        const profileData = docSnap.data() as UserProfile;
        console.log('Profile data:', profileData.personal_info);
        setUserId(docSnap.id);
        setUserProfile(profileData);
      } else {
        console.log('Profile not found in any collection');
        setUserId(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      setUserId(null);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log('Login successful:', uid);

    // เช็คว่าเป็นอาจารย์ที่ยังไม่ได้รับการยืนยันไหม
    const { getDocs, query, collection, where } = await import('firebase/firestore');
    const teacherQ = query(collection(db, 'Teacher'), where('auth_uid', '==', uid));
    const teacherSnap = await getDocs(teacherQ);
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

  const register = useCallback(async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    role: 'student' | 'teacher',
    studentId: string
  ) => {
    console.log('=== Starting Registration ===');
    console.log('Email:', email);
    console.log('Role:', role);
    console.log('Name:', firstName, lastName);
    console.log('Student/Teacher ID:', studentId);

    try {
      const collectionName = role === 'student' ? 'Student' : 'Teacher';
      const existingDoc = await getDoc(doc(db, collectionName, studentId));
      
      if (existingDoc.exists()) {
        throw new Error('รหัสนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น');
      }

      console.log('Step 1: Creating auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log('✓ Auth user created with UID:', uid);

      console.log('Step 2: Saving to Firestore collection:', collectionName, 'with ID:', studentId);
      
      const personalInfo = {
        firstName,
        lastName,
        email,
        phone: ''
      };

      const roleInfo = {
        role_id: role,
        roleName: role === 'student' ? 'Student' : 'Teacher'
      };

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
          bookmarks: []
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
          is_verified: false,   // รอแอดมินยืนยัน
          is_rejected: false,
        });
      }
      
      console.log('✓ User data saved to Firestore with custom ID');
      console.log('=== Registration Complete ===');
    } catch (error: any) {
      console.error('❌ Registration Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('Logging out...');
    setUser(null);
    setUserId(null);
    setUserProfile(null);
    await signOut(auth);
    console.log('✓ Logged out, user and profile cleared');
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      console.log('Refreshing user profile...');
      await fetchUserProfileByAuthUID(user.uid);
      console.log('✓ User profile refreshed');
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    userId,
    userProfile,
    loading,
    login,
    register,
    logout,
    refreshUserProfile
  }), [user, userId, userProfile, loading, login, register, logout, refreshUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
