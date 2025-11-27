import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
}

interface AuthContextType {
  user: User | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setUser(user);
      
      if (user) {
        await fetchUserProfileByAuthUID(user.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchUserProfileByAuthUID = async (authUID: string) => {
    try {
      console.log('Fetching profile for auth UID:', authUID);
      
      // ค้นหาใน Student collection ที่มี auth_uid ตรงกับ authUID
      const studentQuery = query(
        collection(db, 'Student'),
        where('auth_uid', '==', authUID)
      );
      const studentSnapshot = await getDocs(studentQuery);
      
      if (!studentSnapshot.empty) {
        console.log('Found in Student collection');
        const profileData = studentSnapshot.docs[0].data() as UserProfile;
        console.log('Profile data:', profileData.personal_info);
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
        const profileData = teacherSnapshot.docs[0].data() as UserProfile;
        console.log('Profile data:', profileData.personal_info);
        setUserProfile(profileData);
      } else {
        console.log('Profile not found in any collection');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful:', userCredential.user.uid);
    // Profile จะถูก fetch โดย onAuthStateChanged
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
      // 0. ตรวจสอบว่ารหัสซ้ำหรือไม่
      const collectionName = role === 'student' ? 'Student' : 'Teacher';
      const existingDoc = await getDoc(doc(db, collectionName, studentId));
      
      if (existingDoc.exists()) {
        throw new Error('รหัสนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น');
      }

      // 1. สร้าง user ใน Authentication
      console.log('Step 1: Creating auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log('✓ Auth user created with UID:', uid);

      // 2. สร้างข้อมูล user แยก Student และ Teacher
      console.log('Step 2: Saving to Firestore collection:', collectionName, 'with ID:', studentId);
      
      if (role === 'student') {
        await setDoc(doc(db, collectionName, studentId), {
          student_id: studentId,
          student_name: `${firstName} ${lastName}`,
          email: email,
          auth_uid: uid,
          role: {
            role_id: 'student',
            roleName: 'Student'
          },
          personal_info: {
            firstName,
            lastName,
            email,
            phone: ''
          },
          adviser: '', // Student มีฟิลด์ adviser
          notification: [],
          chat_history: [],
          appointment: []
        });
      } else {
        await setDoc(doc(db, collectionName, studentId), {
          teacher_id: studentId,
          teacher_name: `${firstName} ${lastName}`,
          email: email,
          auth_uid: uid,
          role: {
            role_id: 'teacher',
            roleName: 'Teacher'
          },
          personal_info: {
            firstName,
            lastName,
            email,
            phone: ''
          },
          // Teacher ไม่มีฟิลด์ adviser
          notification: [],
          chat_history: [],
          appointment: []
        });
      }
      
      console.log('✓ User data saved to Firestore with custom ID');
      console.log('=== Registration Complete ===');

      // ไม่ต้อง setUserProfile เพราะจะ logout ทันที
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
    setUserProfile(null);
    await signOut(auth);
    console.log('✓ Logged out, user and profile cleared');
  }, []);

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    login,
    register,
    logout
  }), [user, userProfile, loading, login, register, logout]);

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
