// Services for Firestore operations

import type { Timestamp as TimestampType } from 'firebase/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, onSnapshot, where, orderBy, serverTimestamp, limit, arrayUnion, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface User {
  id: string;
  email: string;
  role: 'member' | 'admin';
  fullName: string;
  phone: string;
  flatNumber: string;
  approved: boolean;
  dismissed: boolean;
  bannedUntil: TimestampType | null;
  lastLogin: TimestampType | null;
}

export interface Bill {
  id: string;
  memberId: string;
  amount: number;
  dueDate: TimestampType;
  status: 'pending' | 'paid' | 'overdue';
  month?: string;
  year?: number;
  target?: 'all' | string[]; // 'all' or array of memberIds
  paidDate?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  lateFee?: number;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  target: 'all' | string[]; // 'all' or array of memberIds
  sentBy: string;
  sentAt: TimestampType;
  readBy?: string[]; // array of memberIds who have read the notice
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  vendor: string;
  description?: string;
  month: string;
  year: number;
  target: 'all' | string[]; // 'all' or array of memberIds
  createdAt: TimestampType;
}

// Get all members (for admin)
export const getMembers = (callback: (members: User[]) => void) => {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, (snapshot) => {
    const members: User[] = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return { id: docSnapshot.id, ...data as Omit<User, 'id'> };
    });
    callback(members);
  });
};

// Add member
export const addMember = async (data: Omit<User, 'id'>) => {
  const ref = await addDoc(collection(db, 'users'), {
    ...data,
    approved: false, // default pending
    dismissed: false,
    bannedUntil: null,
    lastLogin: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// Update member
export const updateMember = async (id: string, data: Partial<Omit<User, 'id'>>) => {
  const memberRef = doc(db, 'users', id);
  await updateDoc(memberRef, data);
};

// Delete member
export const deleteMember = async (id: string) => {
  const memberRef = doc(db, 'users', id);
  await deleteDoc(memberRef);
};

// Get specific member
export const getMember = async (id: string) => {
  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id, ...docSnap.data() as Omit<User, 'id'> };
  }
  return null;
};

// Ban member
export const banMember = async (id: string, days: number) => {
  const banTime = Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
  await updateMember(id, { bannedUntil: banTime });
};

// Approve member
export const approveMember = async (id: string) => {
  await updateMember(id, { approved: true });
};

// Dismiss member
export const dismissMember = async (id: string) => {
  await updateMember(id, { dismissed: true });
};

// Get member's bills (for member dashboard)
export const getMemberBills = (memberId: string, callback: (bills: Bill[]) => void) => {
  const q = query(collection(db, 'bills'), where('memberId', '==', memberId));
  return onSnapshot(q, (snapshot) => {
    const bills: Bill[] = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data() as Omit<Bill, 'id'>
    }));
    callback(bills);
  });
};

// Add expense
export const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, 'expenses'), { ...data, createdAt: serverTimestamp() });
};

// Get expenses for member (all or targeted)
export const getMemberExpenses = (memberId: string, callback: (expenses: any[]) => void) => {
  return onSnapshot(collection(db, 'expenses'), (snapshot) => {
    const expenses = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          target: data.target || 'all' // default to all if not set
        };
      })
      .filter(expense =>
        expense.target === 'all' ||
        (Array.isArray(expense.target) && expense.target.includes(memberId))
      );
    callback(expenses);
  });
};

// Generate monthly bills for selected members with fixed amount
export const generateMonthlyBills = async (month: string, year: number, target: 'all' | string[], amount: number) => {
  let users = [];

  if (target === 'all') {
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('approved', '==', true)));
    users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    // Get specific users
    const userPromises = target.map(uid => getDoc(doc(db, 'users', uid)));
    const userDocs = await Promise.all(userPromises);
    users = userDocs
      .filter(docSnap => docSnap.exists() && docSnap.data()?.approved)
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  // Get late fee from settings
  const settingsDoc = await getDoc(doc(db, 'settings', 'society'));
  const lateFee = settingsDoc.exists() ? settingsDoc.data().lateFee || 0 : 0;

  // Check for overdue bills for each user
  const billsPromises = users.map(async (user) => {
    const overdueBills = await getDocs(query(
      collection(db, 'bills'),
      where('memberId', '==', user.id),
      where('status', '==', 'overdue')
    ));

    const hasOverdue = !overdueBills.empty;
    const totalLateFee = hasOverdue ? lateFee : 0;

    return {
      memberId: user.id,
      amount: amount + totalLateFee,
      dueDate: Timestamp.fromDate(new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0)), // Last day of month
      status: 'pending',
      month,
      year,
      target,
      lateFee: totalLateFee,
      createdAt: serverTimestamp(),
    };
  });

  const bills = await Promise.all(billsPromises);

  const batch = [];
  for (const bill of bills) {
    batch.push(addDoc(collection(db, 'bills'), bill));
  }

  await Promise.all(batch);
};

// Send notice
export const addNotice = async (data: Omit<Notice, 'id'>) => {
  await addDoc(collection(db, 'notices'), {
    ...data,
    sentAt: serverTimestamp(),
    readBy: []
  });
};

// Mark notice as read by member
export const markNoticeAsRead = async (noticeId: string, memberId: string) => {
  const noticeRef = doc(db, 'notices', noticeId);
  await updateDoc(noticeRef, {
    readBy: arrayUnion(memberId)
  });
};

// Get notices for member (all or targeted to uid)
export const getMemberNotices = (memberId: string, callback: (notices: Notice[]) => void) => {
  return onSnapshot(collection(db, 'notices'), (snapshot) => {
    const notices: Notice[] = snapshot.docs
      .map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data() as Omit<Notice, 'id'>
      }))
      .filter(notice =>
        notice.target === 'all' ||
        (Array.isArray(notice.target) && notice.target.includes(memberId))
      );
    callback(notices);
  });
};

// Get all notices for admin
export const getAllNotices = (callback: (notices: Notice[]) => void) => {
  const q = query(collection(db, 'notices'), orderBy('sentAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const notices: Notice[] = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data() as Omit<Notice, 'id'>
    }));
    callback(notices);
  });
};


// Update profile
export const updateProfile = async (uid: string, data: Partial<Omit<User, 'id'>>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
};

// Get society stats for dashboard
export const getSocietyStats = (callback: (stats: any) => void) => {
  const unsubscribeUsers = onSnapshot(collection(db, 'users'), (userSnapshot) => {
    const users = userSnapshot.docs.map(doc => doc.data());
    const totalMembers = users.filter(u => u.approved && u.role !== 'admin').length; // approved non-admin
    const activeMembers = users.filter(u => u.approved && u.role !== 'admin').length; // same for now

    // Get bills stats
    const unsubscribeBills = onSnapshot(collection(db, 'bills'), (billSnapshot) => {
      const bills = billSnapshot.docs.map(doc => doc.data());
      const totalCollection = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);
      const pendingCollection = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.amount || 0), 0);
      const collectionRate = totalCollection + pendingCollection > 0 ? Math.round((totalCollection / (totalCollection + pendingCollection)) * 100) : 0;

      // Get expenses stats
      const unsubscribeExpenses = onSnapshot(collection(db, 'expenses'), (expenseSnapshot) => {
        const expenses = expenseSnapshot.docs.map(doc => doc.data());
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netBalance = totalCollection - totalExpenses;

        callback({
          totalMembers,
          activeMembers,
          totalCollection,
          pendingCollection,
          collectionRate,
          totalExpenses,
          netBalance,
        });
      });

      return () => unsubscribeExpenses();
    });

    return () => unsubscribeBills();
  });

  return unsubscribeUsers;
};

// Get recent payments
export const getRecentPayments = (callback: (payments: any[]) => void) => {
  const q = query(collection(db, 'bills'), where('status', '==', 'paid'), limit(10));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(docSnapshot => docSnapshot.data()));
  });
};

// Get overdue members
export const getOverdueMembers = (callback: (overdue: any[]) => void) => {
  // Complex query, implement logic
  callback([]);
};

// Get recent bills for admin dashboard
export const getRecentBills = (callback: (bills: any[]) => void) => {
  const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(10));
  return onSnapshot(q, (snapshot) => {
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(bills);
  });
};

// Get all bills for admin bill management
export const getAllBills = (callback: (bills: any[]) => void) => {
  const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(bills);
  });
};

// Get all expenses for admin
export const getAllExpenses = (callback: (expenses: Expense[]) => void) => {
  return onSnapshot(collection(db, 'expenses'), (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Expense));
    callback(expenses);
  });
};

// Get recent expenses for admin dashboard
export const getRecentExpenses = (callback: (expenses: Expense[]) => void) => {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10));
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Expense));
    callback(expenses);
  });
};

// Update bill
export const updateBill = async (billId: string, data: Partial<Bill>) => {
  const billRef = doc(db, 'bills', billId);
  await updateDoc(billRef, data);
};

// Delete bill
export const deleteBill = async (billId: string) => {
  await deleteDoc(doc(db, 'bills', billId));
};

// Get society settings
export const getSocietySettings = (callback: (settings: any) => void) => {
  const docRef = doc(db, 'settings', 'society');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({
        societyName: 'Green Valley Society',
        address: '',
        maintenanceFee: 2500,
        lateFee: 100,
        dueDay: 15,
        emailNotifications: true,
        smsNotifications: false,
        paymentGateway: 'Razorpay'
      });
    }
  });
};

// Add more functions as needed
