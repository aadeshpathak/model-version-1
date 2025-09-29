import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { updateMember } from '@/lib/firestoreServices';
import type { User } from '@/lib/firestoreServices';

type UserType = 'member' | 'admin' | null;

interface UserContextType {
  currentUser: UserType;
  uid: string;
  role: UserType;
  userEmail: string;
  memberName: string;
  currentView: string;
  approved: boolean;
  dismissed: boolean;
  userData: User | null;
  isInitializing: boolean;
  handleLogin: (userType: UserType, email: string, uid: string, approved: boolean, dismissed: boolean) => void;
  handleLogout: () => void;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  updateUserData: (data: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<UserType>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [userEmail, setUserEmail] = useState('');
  const [uid, setUid] = useState('');
  const [role, setRole] = useState<UserType>('member');
  const [approved, setApproved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Session management constants
  const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
  const SESSION_KEY = 'society_app_session';
  const LAST_ACTIVITY_KEY = 'society_app_last_activity';

  // Session storage helpers
  const saveSession = useCallback((sessionData: any) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        ...sessionData,
        timestamp: Date.now()
      }));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save session:', error);
    }
  }, []);

  const loadSession = useCallback(() => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

      if (sessionData && lastActivity) {
        const session = JSON.parse(sessionData);
        const lastActivityTime = parseInt(lastActivity);
        const now = Date.now();

        // Check if session is still valid (within 20 minutes)
        if (now - lastActivityTime < SESSION_TIMEOUT) {
          return session;
        } else {
          // Session expired, clear it
          clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
    }
    return null;
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  }, []);

  // Activity tracking
  const updateActivity = useCallback(() => {
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to update activity:', error);
    }
  }, []);

  // Auto logout function
  const autoLogout = useCallback(async () => {
    console.log('Auto-logout triggered due to inactivity');
    clearSession();
    setCurrentUser(null);
    setUserEmail('');
    setUid('');
    setApproved(false);
    setDismissed(false);
    setCurrentView('dashboard');
    setUserData(null);

    // Sign out from Firebase
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Firebase sign out error:', error);
    }
  }, [clearSession]);

  // Check for session timeout
  const checkSessionTimeout = useCallback(() => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity && currentUser) {
      const lastActivityTime = parseInt(lastActivity);
      const now = Date.now();

      if (now - lastActivityTime >= SESSION_TIMEOUT) {
        autoLogout();
      }
    }
  }, [currentUser, autoLogout]);

  // Activity event listeners
  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [currentUser, updateActivity]);

  // Session timeout checker
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(checkSessionTimeout, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [currentUser, checkSessionTimeout]);

  // Firebase auth state listener and session restoration
  useEffect(() => {
    console.log('Setting up Firebase auth listener...');

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser ? 'logged in' : 'logged out');

      if (firebaseUser) {
        // User is signed in with Firebase
        const session = loadSession();

        if (session && session.uid === firebaseUser.uid) {
          // Restore session from localStorage
          console.log('Restoring session from localStorage');
          setCurrentUser(session.currentUser);
          setUserEmail(session.userEmail);
          setUid(session.uid);
          setRole(session.role);
          setApproved(session.approved);
          setDismissed(session.dismissed);
          setCurrentView(session.currentView || 'dashboard');
        } else {
          // New login or session mismatch - this will be handled by handleLogin
          console.log('New Firebase login detected');
        }
      } else {
        // User is signed out from Firebase
        console.log('Firebase user signed out');
        clearSession();
        setCurrentUser(null);
        setUserEmail('');
        setUid('');
        setApproved(false);
        setDismissed(false);
        setCurrentView('dashboard');
        setUserData(null);
      }

      setIsInitializing(false);
    });

    return () => unsubscribeAuth();
  }, [loadSession, clearSession]);

  // User data listener
  useEffect(() => {
    if (uid && currentUser) {
      console.log('Setting up user data listener for uid:', uid);
      const unsubscribe = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('User data updated:', data);
          setApproved(data.approved || false);
          setDismissed(data.dismissed || false);
          setUserData({ id: docSnap.id, ...data } as User);
        } else {
          console.warn('User document not found');
        }
      });
      return unsubscribe;
    }
  }, [uid, currentUser]);

  const updateUserData = async (data: Partial<User>) => {
    if (uid) {
      await updateMember(uid, data);
    }
  };

  const handleLogin = useCallback(async (userType: UserType, email: string, uid: string, approved: boolean, dismissed: boolean) => {
    console.log('Handling login for:', userType, email);

    setCurrentUser(userType);
    setUserEmail(email);
    setUid(uid);
    setRole(userType);
    setApproved(approved);
    setDismissed(dismissed);
    setCurrentView('dashboard');

    // Save session to localStorage
    saveSession({
      currentUser: userType,
      userEmail: email,
      uid,
      role: userType,
      approved,
      dismissed,
      currentView: 'dashboard'
    });

    console.log('Session saved to localStorage');
  }, [saveSession]);

  const handleLogout = useCallback(async () => {
    console.log('Handling logout');

    // Clear session from localStorage
    clearSession();

    // Reset all state
    setCurrentUser(null);
    setUserEmail('');
    setUid('');
    setApproved(false);
    setDismissed(false);
    setCurrentView('dashboard');
    setUserData(null);

    // Sign out from Firebase
    try {
      await signOut(auth);
      console.log('Firebase sign out successful');
    } catch (error) {
      console.warn('Firebase sign out error:', error);
    }
  }, [clearSession]);

  const getMemberName = () => {
    if (currentUser === 'admin') return 'Admin User';
    return userEmail.includes('rajesh') ? 'Rajesh Kumar' : 'Society Member';
  };

  const value = {
    currentUser,
    currentView,
    userEmail,
    memberName: getMemberName(),
    uid,
    role,
    approved,
    dismissed,
    userData,
    isInitializing,
    handleLogin,
    handleLogout,
    setCurrentView,
    updateUserData,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
