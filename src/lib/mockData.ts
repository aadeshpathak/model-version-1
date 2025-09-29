// Mock data and localStorage utilities for Society Management System

export interface Member {
  id: string;
  name: string;
  email: string;
  flatNumber: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  monthlyAmount: number;
}

export interface Bill {
  id: string;
  memberId: string;
  month: string;
  year: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  receipt?: string;
  approvedBy: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'maintenance' | 'meeting' | 'announcement' | 'emergency';
  date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'archived';
}

// Initialize default data
const initializeData = () => {
  const members: Member[] = [
    {
      id: '1',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@email.com',
      flatNumber: 'A-201',
      phone: '+91-9876543210',
      joinDate: '2023-01-15',
      status: 'active',
      monthlyAmount: 2500
    },
    {
      id: '2',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      flatNumber: 'B-105',
      phone: '+91-9876543211',
      joinDate: '2023-02-20',
      status: 'active',
      monthlyAmount: 2500
    },
    {
      id: '3',
      name: 'Amit Singh',
      email: 'amit.singh@email.com',
      flatNumber: 'C-303',
      phone: '+91-9876543212',
      joinDate: '2023-03-10',
      status: 'active',
      monthlyAmount: 2500
    },
    {
      id: '4',
      name: 'Sunita Devi',
      email: 'sunita.devi@email.com',
      flatNumber: 'A-102',
      phone: '+91-9876543213',
      joinDate: '2023-01-25',
      status: 'active',
      monthlyAmount: 2500
    },
    {
      id: '5',
      name: 'Rohit Gupta',
      email: 'rohit.gupta@email.com',
      flatNumber: 'B-207',
      phone: '+91-9876543214',
      joinDate: '2023-04-05',
      status: 'active',
      monthlyAmount: 2500
    },
    {
      id: '6',
      name: 'Neha Jain',
      email: 'neha.jain@email.com',
      flatNumber: 'C-401',
      phone: '+91-9876543215',
      joinDate: '2023-05-12',
      status: 'active',
      monthlyAmount: 2500
    }
  ];

  const bills: Bill[] = [];
  const currentYear = 2024;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate bills for each member for current year
  members.forEach(member => {
    months.forEach((month, index) => {
      const billId = `${member.id}-${currentYear}-${index + 1}`;
      const dueDate = `${currentYear}-${(index + 1).toString().padStart(2, '0')}-15`;
      
      let status: 'pending' | 'paid' | 'overdue' = 'pending';
      let paidDate: string | undefined;
      let paymentMethod: string | undefined;
      let receiptNumber: string | undefined;

      // Mark some bills as paid (past months)
      if (index < new Date().getMonth()) {
        if (member.name === 'Rohit Gupta' && index >= 9) {
          status = 'overdue';
        } else if (member.name === 'Neha Jain' && index >= 10) {
          status = 'overdue';
        } else {
          status = 'paid';
          paidDate = `${currentYear}-${(index + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 28) + 1}`;
          paymentMethod = Math.random() > 0.5 ? 'Online' : 'Cash';
          receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        }
      }

      // Current month is pending, future months are not generated yet
      if (index === new Date().getMonth()) {
        status = 'pending';
      }

      if (index <= new Date().getMonth()) {
        bills.push({
          id: billId,
          memberId: member.id,
          month,
          year: currentYear,
          amount: member.monthlyAmount,
          dueDate,
          status,
          paidDate,
          paymentMethod,
          receiptNumber
        });
      }
    });
  });

  const expenses: Expense[] = [
    {
      id: '1',
      category: 'Electricity',
      description: 'Monthly electricity bill for common areas',
      amount: 15000,
      date: '2024-01-10',
      vendor: 'State Electricity Board',
      approvedBy: 'Admin'
    },
    {
      id: '2',
      category: 'Security',
      description: 'Security guard salary for January',
      amount: 25000,
      date: '2024-01-08',
      vendor: 'Guardian Security Services',
      approvedBy: 'Admin'
    },
    {
      id: '3',
      category: 'Maintenance',
      description: 'Lift maintenance and repairs',
      amount: 8500,
      date: '2024-01-05',
      vendor: 'Quick Fix Solutions',
      approvedBy: 'Admin'
    },
    {
      id: '4',
      category: 'Cleaning',
      description: 'Housekeeping services for January',
      amount: 12000,
      date: '2024-01-03',
      vendor: 'Clean & Green Services',
      approvedBy: 'Admin'
    },
    {
      id: '5',
      category: 'Water',
      description: 'Water tanker and pump maintenance',
      amount: 6500,
      date: '2024-01-12',
      vendor: 'Aqua Solutions',
      approvedBy: 'Admin'
    }
  ];

  const notices: Notice[] = [
    {
      id: '1',
      title: 'Water Supply Maintenance',
      content: 'Water supply will be interrupted on January 15th from 10 AM to 2 PM for maintenance work.',
      type: 'maintenance',
      date: '2024-01-10',
      priority: 'high',
      status: 'active'
    },
    {
      id: '2',
      title: 'Society Annual Meeting',
      content: 'Annual general meeting will be held on January 20th at 6 PM in the community hall.',
      type: 'meeting',
      date: '2024-01-08',
      priority: 'medium',
      status: 'active'
    },
    {
      id: '3',
      title: 'New Parking Rules',
      content: 'New parking guidelines have been implemented. Please ensure proper parking in designated areas.',
      type: 'announcement',
      date: '2024-01-05',
      priority: 'medium',
      status: 'active'
    }
  ];

  // Store in localStorage if not exists
  if (!localStorage.getItem('society_members')) {
    localStorage.setItem('society_members', JSON.stringify(members));
  }
  if (!localStorage.getItem('society_bills')) {
    localStorage.setItem('society_bills', JSON.stringify(bills));
  }
  if (!localStorage.getItem('society_expenses')) {
    localStorage.setItem('society_expenses', JSON.stringify(expenses));
  }
  if (!localStorage.getItem('society_notices')) {
    localStorage.setItem('society_notices', JSON.stringify(notices));
  }
};

// Data access functions
export const getMembers = (): Member[] => {
  initializeData();
  return JSON.parse(localStorage.getItem('society_members') || '[]');
};

export const getBills = (): Bill[] => {
  initializeData();
  return JSON.parse(localStorage.getItem('society_bills') || '[]');
};

export const getExpenses = (): Expense[] => {
  initializeData();
  return JSON.parse(localStorage.getItem('society_expenses') || '[]');
};

export const getNotices = (): Notice[] => {
  initializeData();
  return JSON.parse(localStorage.getItem('society_notices') || '[]');
};

// Data manipulation functions
export const addMember = (member: Omit<Member, 'id'>): Member => {
  const members = getMembers();
  const newMember: Member = {
    ...member,
    id: Date.now().toString()
  };
  members.push(newMember);
  localStorage.setItem('society_members', JSON.stringify(members));
  return newMember;
};

export const updateMember = (id: string, updates: Partial<Member>): Member | null => {
  const members = getMembers();
  const index = members.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  members[index] = { ...members[index], ...updates };
  localStorage.setItem('society_members', JSON.stringify(members));
  return members[index];
};

export const deleteMember = (id: string): boolean => {
  const members = getMembers();
  const filteredMembers = members.filter(m => m.id !== id);
  localStorage.setItem('society_members', JSON.stringify(filteredMembers));
  return filteredMembers.length !== members.length;
};

export const addExpense = (expense: Omit<Expense, 'id'>): Expense => {
  const expenses = getExpenses();
  const newExpense: Expense = {
    ...expense,
    id: Date.now().toString()
  };
  expenses.push(newExpense);
  localStorage.setItem('society_expenses', JSON.stringify(expenses));
  return newExpense;
};

export const updateBill = (id: string, updates: Partial<Bill>): Bill | null => {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === id);
  if (index === -1) return null;
  
  bills[index] = { ...bills[index], ...updates };
  localStorage.setItem('society_bills', JSON.stringify(bills));
  return bills[index];
};

export const generateMonthlyBills = (month: string, year: number): Bill[] => {
  const members = getMembers().filter(m => m.status === 'active');
  const bills = getBills();
  const newBills: Bill[] = [];

  members.forEach(member => {
    const billId = `${member.id}-${year}-${month}`;
    const existingBill = bills.find(b => b.id === billId);
    
    if (!existingBill) {
      const newBill: Bill = {
        id: billId,
        memberId: member.id,
        month: getMonthName(parseInt(month)),
        year,
        amount: member.monthlyAmount,
        dueDate: `${year}-${month.padStart(2, '0')}-15`,
        status: 'pending'
      };
      newBills.push(newBill);
      bills.push(newBill);
    }
  });

  if (newBills.length > 0) {
    localStorage.setItem('society_bills', JSON.stringify(bills));
  }
  return newBills;
};

const getMonthName = (monthNumber: number): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNumber - 1];
};

// Analytics functions
export const getSocietyStats = () => {
  const members = getMembers();
  const bills = getBills();
  const expenses = getExpenses();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingMembers = members.filter(m => m.status === 'pending').length;

  const currentMonthBills = bills.filter(b => 
    b.year === currentYear && 
    new Date(`${b.month} 1, ${b.year}`).getMonth() + 1 === currentMonth
  );
  
  const paidBills = currentMonthBills.filter(b => b.status === 'paid');
  const totalCollection = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
  
  const currentMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getFullYear() === currentYear && 
           expenseDate.getMonth() + 1 === currentMonth;
  });
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const collectionRate = currentMonthBills.length > 0 
    ? Math.round((paidBills.length / currentMonthBills.length) * 100) 
    : 0;

  const overdueMembers = members.filter(member => {
    return bills.some(bill => 
      bill.memberId === member.id && 
      bill.status === 'overdue'
    );
  });

  return {
    totalMembers,
    activeMembers,
    pendingMembers,
    totalCollection,
    totalExpenses,
    netBalance: totalCollection - totalExpenses,
    collectionRate,
    overdueCount: overdueMembers.length,
    monthlyTarget: activeMembers * 2500 // Assuming standard rate
  };
};