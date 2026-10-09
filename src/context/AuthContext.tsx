import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Store, Subscription } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';

interface AuthContextType {
  user: User | { uid: string; email: string; displayName?: string } | null;
  profile: UserProfile | null;
  store: Store | null;
  subscription: Subscription | null;
  isAdmin: boolean;
  isPlanActive: boolean;
  isTrialActive: boolean;
  isPlanExpired: boolean;
  trialDaysRemaining: number;
  canAccessAdvancedFeatures: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, storeName: string, phoneNumber?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginWithDefaultAdmin: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check admin status
  const isAdmin = Boolean(
    profile?.role === 'admin' ||
    user?.email?.toLowerCase() === 'nhgb2605@gmail.com'
  );

  // Compute plan and trial status
  const nowTime = Date.now();
  const subEndDate = subscription?.endDate ? new Date(subscription.endDate).getTime() : 0;
  const isPlanActive = Boolean(isAdmin || (subscription && subscription.status === 'active' && subEndDate > nowTime));
  const isPlanExpired = Boolean(!isAdmin && (!subscription || subEndDate <= nowTime));
  const trialDaysRemaining = subscription?.endDate
    ? Math.max(0, Math.ceil((subEndDate - nowTime) / 86400000))
    : 0;
  const isTrialActive = Boolean(
    subscription?.isTrial ||
    subscription?.planId === 'business_household'
  ) && !isPlanExpired;

  // Non-admin users cannot access advanced features once the 3-day trial expires
  const canAccessAdvancedFeatures = isAdmin || isPlanActive;

  const fetchUserData = async (currentUser: { uid: string; email: string | null; displayName?: string | null }) => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        setProfile(uData);
      } else {
        const isAutoAdmin = currentUser.email?.toLowerCase() === 'nhgb2605@gmail.com';
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Chủ quán',
          storeName: 'Cửa hàng của tôi',
          role: isAutoAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
      }

      // 2. Fetch or create store
      const storeDocRef = doc(db, 'stores', currentUser.uid);
      const storeSnap = await getDoc(storeDocRef);
      if (storeSnap.exists()) {
        setStore(storeSnap.data() as Store);
      } else {
        const newStore: Store = {
          id: currentUser.uid,
          ownerId: currentUser.uid,
          name: profile?.storeName || 'Cửa hàng của tôi',
          createdAt: new Date().toISOString()
        };
        await setDoc(storeDocRef, newStore);
        setStore(newStore);
      }

      // 3. Subscription
      const subDocRef = doc(db, 'subscriptions', currentUser.uid);
      const subSnap = await getDoc(subDocRef);
      if (subSnap.exists()) {
        setSubscription(subSnap.data() as Subscription);
      } else {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 3 * 86400000);
        const trialSub: Subscription = {
          id: currentUser.uid,
          userId: currentUser.uid,
          storeId: currentUser.uid,
          planId: 'business_household',
          planName: 'Gói Hộ Kinh Doanh (Free 3 ngày)',
          status: 'active',
          isTrial: true,
          startDate: now.toISOString(),
          endDate: trialEnd.toISOString(),
          createdAt: now.toISOString()
        };
        try {
          await setDoc(subDocRef, trialSub);
          setSubscription(trialSub);
        } catch {
          setSubscription(trialSub);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    // 1. Instant local session check
    const savedSessionStr = localStorage.getItem('dopipos_session');
    let hasLocalSession = false;
    if (savedSessionStr) {
      try {
        const savedSession = JSON.parse(savedSessionStr);
        if (savedSession && savedSession.user) {
          setUser(savedSession.user);
          setProfile(savedSession.profile || savedSession.user);
          setStore(savedSession.store);
          setSubscription(savedSession.subscription);
          hasLocalSession = true;
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem('dopipos_session');
      }
    }

    // Fast startup safety timer: Never keep user waiting more than 350ms on first render
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 350);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser);
        setLoading(false);

        // Realtime subscription listener
        const subUnsub = onSnapshot(
          doc(db, 'subscriptions', currentUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              setSubscription(snapshot.data() as Subscription);
            }
          },
          (error) => {
            console.warn('Subscription listener notice:', error.message);
          }
        );

        return () => subUnsub();
      } else {
        const currentActiveSession = localStorage.getItem('dopipos_session');
        if (!currentActiveSession) {
          setUser(null);
          setProfile(null);
          setStore(null);
          setSubscription(null);
        }
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const refreshSubscription = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'subscriptions', user.uid));
      if (snap.exists()) {
        const sub = snap.data() as Subscription;
        setSubscription(sub);
        // update local session
        const currentSession = localStorage.getItem('dopipos_session');
        if (currentSession) {
          const parsed = JSON.parse(currentSession);
          parsed.subscription = sub;
          localStorage.setItem('dopipos_session', JSON.stringify(parsed));
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `subscriptions/${user.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
      const storeSnap = await getDoc(doc(db, 'stores', user.uid));
      if (storeSnap.exists()) {
        setStore(storeSnap.data() as Store);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
    }
  };

  // 1. One-click Default Admin Login
  const loginWithDefaultAdmin = async () => {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setProfile(data.user);
          setStore(data.store);
          setSubscription(data.subscription);
          localStorage.setItem('dopipos_session', JSON.stringify({
            user: data.user,
            profile: data.user,
            store: data.store,
            subscription: data.subscription
          }));
          return;
        }
      }
    } catch {
      // Backend not reachable (e.g. GitHub Pages or static host)
    }

    // Static / Offline Demo Admin session fallback
    const mockAdmin: UserProfile = {
      uid: 'admin_demo_master',
      email: 'nhgb2605@gmail.com',
      displayName: 'Quản trị viên (Master)',
      storeName: 'Cửa hàng DopiPOS',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    const mockStore: Store = {
      id: 'admin_demo_master',
      ownerId: 'admin_demo_master',
      name: 'Cửa hàng DopiPOS Demo',
      createdAt: new Date().toISOString()
    };
    const mockSub: Subscription = {
      id: 'sub_demo_master',
      userId: 'admin_demo_master',
      storeId: 'admin_demo_master',
      planId: 'business_household',
      planName: 'Gói Hộ Kinh Doanh (Vĩnh viễn)',
      status: 'active',
      isTrial: false,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      createdAt: new Date().toISOString()
    };
    setUser(mockAdmin);
    setProfile(mockAdmin);
    setStore(mockStore);
    setSubscription(mockSub);
    localStorage.setItem('dopipos_session', JSON.stringify({
      user: mockAdmin,
      profile: mockAdmin,
      store: mockStore,
      subscription: mockSub
    }));
  };

  // 2. Google Sign-In
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await fetchUserData(cred.user);
    localStorage.removeItem('dopipos_session');
  };

  // 3. Robust Sign Up (Handles Backend + Client Firestore seamlessly)
  const signUp = async (
    email: string,
    pass: string,
    displayName: string,
    storeName: string,
    phoneNumber?: string
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanStoreName = storeName.trim();
    const cleanPhone = (phoneNumber || '').trim();

    if (!normalizedEmail || !pass || !cleanDisplayName || !cleanStoreName) {
      throw new Error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
    }

    if (pass.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    // Attempt 1: Call Backend Server Registration (Hashes password and auto-seeds sample menu)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: pass,
          displayName: cleanDisplayName,
          storeName: cleanStoreName,
          phoneNumber: cleanPhone
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.user) {
        setUser(data.user);
        setProfile(data.user);
        setStore(data.store);
        setSubscription(data.subscription);
        localStorage.setItem(
          'dopipos_session',
          JSON.stringify({
            user: data.user,
            profile: data.user,
            store: data.store,
            subscription: data.subscription
          })
        );
        return;
      }

      if (data && !data.success && data.message) {
        throw new Error(data.message);
      }
    } catch (apiErr: any) {
      // If error is an explicit business error (e.g. email already exists), bubble it up
      if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('Network') && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      console.warn('Backend register not available, switching to direct client registration...');
    }

    // Attempt 2: Direct Client Firestore Registration (Works even on static hosting / GitHub Pages)
    try {
      // Check if email already in use
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
      const existSnap = await getDocs(q);
      if (!existSnap.empty) {
        throw new Error('Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.');
      }
    } catch (chkErr: any) {
      if (chkErr.message?.includes('Email này đã được sử dụng')) {
        throw chkErr;
      }
    }

    const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 3 * 86400000).toISOString();
    const isAutoAdmin = normalizedEmail === 'nhgb2605@gmail.com';

    let passwordHash = '';
    try {
      const msgBuffer = new TextEncoder().encode(pass + '_dopipos_salt');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      passwordHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      passwordHash = pass;
    }

    const newProfile: UserProfile = {
      uid,
      email: normalizedEmail,
      displayName: cleanDisplayName,
      phoneNumber: cleanPhone,
      storeName: cleanStoreName,
      role: isAutoAdmin ? 'admin' : 'user',
      createdAt: nowIso
    };

    const newStore: Store = {
      id: uid,
      ownerId: uid,
      name: cleanStoreName,
      phone: cleanPhone,
      createdAt: nowIso
    };

    const trialSub: Subscription = {
      id: uid,
      userId: uid,
      storeId: uid,
      planId: 'business_household',
      planName: 'Gói Hộ Kinh Doanh (Free 3 ngày)',
      status: 'active',
      isTrial: true,
      startDate: nowIso,
      endDate: trialEnd,
      createdAt: nowIso
    };

    try {
      await setDoc(doc(db, 'users', uid), { ...newProfile, passwordHash });
      await setDoc(doc(db, 'stores', uid), newStore);
      await setDoc(doc(db, 'subscriptions', uid), trialSub);
    } catch (fbWriteErr) {
      console.warn('Client direct firestore write error:', fbWriteErr);
    }

    setUser(newProfile);
    setProfile(newProfile);
    setStore(newStore);
    setSubscription(trialSub);
    localStorage.setItem(
      'dopipos_session',
      JSON.stringify({
        user: newProfile,
        profile: newProfile,
        store: newStore,
        subscription: trialSub
      })
    );
  };

  // 4. Robust Login (Handles Backend + Client Firestore seamlessly)
  const login = async (email: string, pass: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !pass) {
      throw new Error('Vui lòng nhập email và mật khẩu.');
    }

    // Attempt 1: Call Backend Server Login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: pass })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.user) {
        setUser(data.user);
        setProfile(data.user);
        setStore(data.store);
        setSubscription(data.subscription);
        localStorage.setItem(
          'dopipos_session',
          JSON.stringify({
            user: data.user,
            profile: data.user,
            store: data.store,
            subscription: data.subscription
          })
        );
        return;
      }

      if (data && !data.success && data.message) {
        throw new Error(data.message);
      }
    } catch (apiErr: any) {
      // If error is an explicit login rejection from server, throw it
      if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('Network') && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      console.warn('Backend login not reachable, verifying via client Firestore...');
    }

    // Attempt 2: Client-side Firestore verification
    let clientHash = '';
    try {
      const msgBuffer = new TextEncoder().encode(pass + '_dopipos_salt');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      clientHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      clientHash = pass;
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
      const userSnap = await getDocs(q);

      if (userSnap.empty) {
        throw new Error('Không tìm thấy tài khoản với email này.');
      }

      const userData = userSnap.docs[0].data() as any;
      const isMatch =
        userData.passwordHash === clientHash ||
        userData.passwordHash === pass ||
        (!userData.passwordHash && normalizedEmail === 'nhgb2605@gmail.com');

      if (!isMatch) {
        throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }

      const uid = userData.uid;
      const storeSnap = await getDoc(doc(db, 'stores', uid));
      const subSnap = await getDoc(doc(db, 'subscriptions', uid));

      const loadedStore = storeSnap.exists()
        ? (storeSnap.data() as Store)
        : { id: uid, ownerId: uid, name: userData.storeName || 'Cửa hàng của tôi', createdAt: new Date().toISOString() };

      const loadedSub = subSnap.exists() ? (subSnap.data() as Subscription) : null;

      setUser(userData);
      setProfile(userData);
      setStore(loadedStore);
      setSubscription(loadedSub);

      localStorage.setItem(
        'dopipos_session',
        JSON.stringify({
          user: userData,
          profile: userData,
          store: loadedStore,
          subscription: loadedSub
        })
      );
    } catch (clientErr: any) {
      throw new Error(clientErr.message || 'Email hoặc mật khẩu không chính xác.');
    }
  };

  const logout = async () => {
    localStorage.removeItem('dopipos_session');
    setUser(null);
    setProfile(null);
    setStore(null);
    setSubscription(null);
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        store,
        subscription,
        isAdmin,
        isPlanActive,
        isTrialActive,
        isPlanExpired,
        trialDaysRemaining,
        canAccessAdvancedFeatures,
        loading,
        signUp,
        login,
        signInWithGoogle,
        loginWithDefaultAdmin,
        logout,
        resetPassword,
        refreshSubscription,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
