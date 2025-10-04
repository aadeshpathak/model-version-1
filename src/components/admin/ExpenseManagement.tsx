import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  Zap,
  Shield,
  Droplets,
  Wrench,
  Truck,
  Users2,
  Edit,
  Trash2,
  Upload,
  FileText,
  Download,
  X
} from 'lucide-react';
import { getAllExpenses, addExpense, updateExpense, deleteExpense, type Expense, addBill, getAllBills, getMembers, deleteBill } from '@/lib/firestoreServices';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import MobileCard from '@/components/ui/MobileCard';
import { motion } from 'framer-motion';

const expenseCategories = [
  { value: 'electricity', label: 'Electricity', icon: Zap, color: 'bg-yellow-500' },
  { value: 'security', label: 'Security', icon: Shield, color: 'bg-blue-500' },
  { value: 'water', label: 'Water', icon: Droplets, color: 'bg-cyan-500' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-orange-500' },
  { value: 'cleaning', label: 'Cleaning', icon: Building, color: 'bg-green-500' },
  { value: 'garbage', label: 'Garbage Collection', icon: Truck, color: 'bg-gray-500' },
  { value: 'staff', label: 'Staff Salary', icon: Users2, color: 'bg-purple-500' },
  { value: 'other', label: 'Other', icon: Receipt, color: 'bg-gray-400' }
];

export const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [expenseProgress, setExpenseProgress] = useState(0);
  const [billProgress, setBillProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ billsInserted: number; expensesInserted: number; skipped: number } | null>(null);
  const [hasImportedData, setHasImportedData] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'completed' | 'error'>('idle');
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteBillProgress, setDeleteBillProgress] = useState(0);
  const [deleteExpenseProgress, setDeleteExpenseProgress] = useState(0);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    vendor: '',
    target: 'all' as 'all' | string[]
  });

  useEffect(() => {
    let expensesUnsubscribe: (() => void) | null = null;
    let billsUnsubscribe: (() => void) | null = null;

    const checkImportedData = () => {
      let hasImportedExpenses = false;
      let hasImportedBills = false;

      expensesUnsubscribe = getAllExpenses((expenses) => {
        setExpenses(expenses);
        hasImportedExpenses = expenses.some(expense => expense.isImported);
        setHasImportedData(hasImportedExpenses || hasImportedBills);
      });

      billsUnsubscribe = getAllBills((bills) => {
        hasImportedBills = bills.some(bill => bill.isImported);
        setHasImportedData(hasImportedExpenses || hasImportedBills);
      });
    };

    checkImportedData();

    return () => {
      expensesUnsubscribe?.();
      billsUnsubscribe?.();
    };
  }, []);

  const loadExpenses = () => {
    // Expenses are loaded via useEffect with getAllExpenses
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      vendor: '',
      target: 'all'
    });
  };

  const handleEditCategory = (category: any) => {
    // Find the first expense in this category for the selected filters to edit
    const expensesInCategory = expenses.filter(exp =>
      exp.category.toLowerCase() === category.value.toLowerCase() &&
      (monthFilter === 'all' || exp.month === monthFilter) &&
      (yearFilter === 'all' || exp.year.toString() === yearFilter)
    );

    if (expensesInCategory.length > 0) {
      setEditingExpense(expensesInCategory[0]);
      setIsEditExpenseDialogOpen(true);
    } else {
      const filterText = [];
      if (monthFilter !== 'all') filterText.push(monthFilter);
      if (yearFilter !== 'all') filterText.push(yearFilter);
      const filterDescription = filterText.length > 0 ? ` for ${filterText.join(' ')}` : '';

      toast({
        title: "No expenses found",
        description: `No expenses found in "${category.label}" category${filterDescription}.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryValue: string) => {
    const filterParts = [];
    if (monthFilter !== 'all') filterParts.push(`month of ${monthFilter}`);
    if (yearFilter !== 'all') filterParts.push(`year ${yearFilter}`);
    const filterText = filterParts.length > 0 ? filterParts.join(' and ') : 'all time';

    if (window.confirm(`Are you sure you want to delete all expenses in the "${categoryValue}" category for ${filterText}? This action cannot be undone.`)) {
      try {
        // Get all expenses in this category for the selected filters
        const expensesToDelete = expenses.filter(exp =>
          exp.category.toLowerCase() === categoryValue.toLowerCase() &&
          (monthFilter === 'all' || exp.month === monthFilter) &&
          (yearFilter === 'all' || exp.year.toString() === yearFilter)
        );

        if (expensesToDelete.length === 0) {
          toast({
            title: "No expenses found",
            description: `No expenses found in the "${categoryValue}" category for ${filterText}.`,
          });
          return;
        }

        // Delete all expenses in this category for the selected filters
        const deletePromises = expensesToDelete.map(expense => deleteExpense(expense.id));
        await Promise.all(deletePromises);

        toast({
          title: "Expenses Deleted",
          description: `Successfully deleted ${expensesToDelete.length} expense(s) in "${categoryValue}" category.`,
        });

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete category expenses.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }

      // Validate month selection
      if (formData.month !== 'ALL' && !months.includes(formData.month)) {
        toast({
          title: "Error",
          description: "Please select a valid month.",
          variant: "destructive",
        });
        return;
      }

      if (formData.month === 'ALL') {
        // Add expense for all months
        const expensePromises = months.map(month =>
          addExpense({
            category: formData.category,
            amount,
            vendor: formData.vendor,
            description: formData.description || undefined,
            month,
            year: parseInt(formData.year),
            target: formData.target
          })
        );
        Promise.all(expensePromises).then(() => {
          toast({
            title: "Expenses Added",
            description: "Expense has been recorded for all 12 months successfully.",
          });
          setIsAddDialogOpen(false);
          resetForm();
        }).catch((error) => {
          toast({
            title: "Error",
            description: "An error occurred while adding the expenses.",
            variant: "destructive",
          });
        });
      } else {
        // Add expense for single month
        addExpense({
          category: formData.category,
          amount,
          vendor: formData.vendor,
          description: formData.description || undefined,
          month: formData.month,
          year: parseInt(formData.year),
          target: formData.target
        });

        toast({
          title: "Expense Added",
          description: "Expense has been recorded successfully.",
        });

        setIsAddDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while adding the expense.",
        variant: "destructive",
      });
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || expense.category.toLowerCase() === categoryFilter;

    const matchesMonth = monthFilter === 'all' || expense.month === monthFilter;

    const matchesYear = yearFilter === 'all' || expense.year.toString() === yearFilter;

    return matchesSearch && matchesCategory && matchesMonth && matchesYear;
  });

  // Calculate stats
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthIndex = new Date().getMonth();
  const lastMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const lastMonth = months[lastMonthIndex];
  const lastMonthYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = expenses.filter(e =>
    e.month === currentMonth && e.year === currentYear
  );

  const lastMonthExpenses = expenses.filter(e =>
    e.month === lastMonth && e.year === lastMonthYear
  );

  const stats = {
    total: filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    currentMonth: currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    lastMonth: lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    count: filteredExpenses.length
  };

  const monthlyChange = stats.lastMonth > 0
    ? ((stats.currentMonth - stats.lastMonth) / stats.lastMonth) * 100
    : (stats.currentMonth > 0 ? 100 : 0);

  // Category-wise breakdown
  const categoryBreakdown = expenseCategories.map(category => {
    const categoryExpenses = filteredExpenses.filter(e => 
      e.category.toLowerCase() === category.value
    );
    return {
      ...category,
      amount: categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      count: categoryExpenses.length
    };
  }).filter(category => category.amount > 0);

  const getCategoryIcon = (category: string) => {
    const found = expenseCategories.find(cat => cat.value === category.toLowerCase());
    return found ? found.icon : Receipt;
  };

  const getCategoryColor = (category: string) => {
    const found = expenseCategories.find(cat => cat.value === category.toLowerCase());
    return found ? found.color : 'bg-gray-400';
  };

  const handleDeleteRecentImport = async () => {
    if (!hasImportedData) {
      toast({
        title: "No Imported Data",
        description: "No imported data found to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteImportedData = async () => {
    setDeleteStatus('deleting');
    setDeleteProgress(10);
    setDeleteBillProgress(0);
    setDeleteExpenseProgress(0);

    try {
      let totalDeleted = 0;

      // Phase 1: Delete imported bills first
      setDeleteProgress(20);
      const allBills = await new Promise<any[]>((resolve) => {
        const unsubscribe = getAllBills((bills) => {
          resolve(bills.filter(bill => bill.isImported));
          unsubscribe();
        });
      });

      if (allBills.length > 0) {
        setDeleteProgress(40);
        const billDeletePromises = allBills.map(bill => deleteBill(bill.id));
        await Promise.all(billDeletePromises);
        totalDeleted += allBills.length;
        setDeleteBillProgress(100);
      } else {
        setDeleteBillProgress(100);
      }

      // Phase 2: Delete imported expenses after bills
      setDeleteProgress(60);
      const allExpenses = await new Promise<any[]>((resolve) => {
        const unsubscribe = getAllExpenses((expenses) => {
          resolve(expenses.filter(expense => expense.isImported));
          unsubscribe();
        });
      });

      if (allExpenses.length > 0) {
        setDeleteProgress(80);
        const expenseDeletePromises = allExpenses.map(expense => deleteExpense(expense.id));
        await Promise.all(expenseDeletePromises);
        totalDeleted += allExpenses.length;
        setDeleteExpenseProgress(100);
      } else {
        setDeleteExpenseProgress(100);
      }

      setDeleteProgress(95);

      if (totalDeleted === 0) {
        setDeleteStatus('completed');
        setDeleteProgress(100);
        toast({
          title: "No Data Found",
          description: "No imported data found to delete.",
        });
        setTimeout(() => {
          setIsDeleteDialogOpen(false);
          setDeleteStatus('idle');
          setDeleteProgress(0);
        }, 2000);
        return;
      }

      setDeleteProgress(100);
      setDeleteStatus('completed');

      toast({
        title: "Imported Data Deleted",
        description: `Successfully deleted ${totalDeleted} imported records from everywhere.`,
      });

      // Update state
      setHasImportedData(false);

      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setDeleteStatus('idle');
        setDeleteProgress(0);
        setDeleteBillProgress(0);
        setDeleteExpenseProgress(0);
      }, 3000);

    } catch (error) {
      console.error('Error deleting imported data:', error);
      setDeleteStatus('error');
      toast({
        title: "Delete Failed",
        description: "Failed to delete imported data.",
        variant: "destructive",
      });
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setDeleteStatus('idle');
        setDeleteProgress(0);
        setDeleteBillProgress(0);
        setDeleteExpenseProgress(0);
      }, 3000);
    }
  };

  const handleImportFile = async (file: File, status: 'paid' | 'pending') => {
    setImportStatus('uploading');
    setImportProgress(10);

    try {
      // Parse the file on the client side
      const fileContent = await file.arrayBuffer();
      let rawData = [];

      setImportProgress(20);

      // Parse based on file type
      if (file.name.endsWith('.csv')) {
        // Simple CSV parsing (for basic CSV files)
        const csvText = new TextDecoder().decode(fileContent);
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          rawData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Use xlsx library for Excel files
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(fileContent, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawData = XLSX.utils.sheet_to_json(worksheet);
      } else if (file.name.endsWith('.json')) {
        const jsonText = new TextDecoder().decode(fileContent);
        rawData = JSON.parse(jsonText);
      }

      setImportProgress(40);
      setImportStatus('processing');

      if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('No data found in file or invalid format');
      }

      // Get all approved members for bill creation
      const members = await new Promise<any[]>((resolve) => {
        const unsubscribe = getMembers((users) => {
          resolve(users.filter(u => u.approved && u.role !== 'admin'));
          unsubscribe();
        });
      });

      if (members.length === 0) {
        throw new Error('No approved members found to create bills for');
      }

      // Validate and transform data
      const validRecords = [];
      const errors = [];

      rawData.forEach((record, index) => {
        try {
          const transformedRecord = {
            expense_category: record.expense_category || record.category || record.Expense_Category || record.Category || 'other',
            amount: parseFloat(record.amount || record.Amount || record.expense_amount || record.Expense_Amount || 0),
            month: record.month || record.Month || record.expense_month || record.Expense_Month || 'January',
            year: parseInt(record.year || record.Year || record.expense_year || record.Expense_Year || new Date().getFullYear()),
            description: record.description || record.Description || `Imported from ${file.name}`
          };

          // Basic validation
          if (transformedRecord.amount <= 0) {
            throw new Error('Invalid amount');
          }

          validRecords.push(transformedRecord);
        } catch (error) {
          errors.push({
            row: index + 1,
            error: error.message
          });
        }
      });

      if (validRecords.length === 0) {
        throw new Error('No valid records found in file');
      }

      setImportProgress(60);

      // Import as both bills and expenses with smart categorization
      const importBatchId = `import_${Date.now()}`;
      let billsInserted = 0;
      let expensesInserted = 0;
      let skipped = 0;

      // Smart category mapping
      const getNormalizedCategory = (rawCategory: string) => {
        if (!rawCategory) return 'other';

        const category = String(rawCategory).toLowerCase().trim();

        // Direct matches
        const directMatches: { [key: string]: string } = {
          'electricity': 'electricity',
          'security': 'security',
          'water': 'water',
          'maintenance': 'maintenance',
          'cleaning': 'cleaning',
          'garbage': 'garbage',
          'staff': 'staff',
          'other': 'other'
        };

        if (directMatches[category]) return directMatches[category];

        // Fuzzy matches
        const fuzzyMatches = [
          { patterns: ['electric', 'power', 'energy'], category: 'electricity' },
          { patterns: ['security', 'guard', 'watchman'], category: 'security' },
          { patterns: ['water', 'sewage', 'drainage'], category: 'water' },
          { patterns: ['maintenance', 'repair', 'fix'], category: 'maintenance' },
          { patterns: ['cleaning', 'cleaner', 'housekeeping'], category: 'cleaning' },
          { patterns: ['garbage', 'waste', 'collection'], category: 'garbage' },
          { patterns: ['staff', 'salary', 'employee', 'worker'], category: 'staff' }
        ];

        for (const match of fuzzyMatches) {
          if (match.patterns.some(pattern => category.includes(pattern))) {
            return match.category;
          }
        }

        return 'other';
      };

      // Group expenses by month/year for bill creation
      const expensesByMonth = validRecords.reduce((acc, record) => {
        const key = `${record.month}-${record.year}`;
        if (!acc[key]) {
          acc[key] = {
            month: record.month,
            year: record.year,
            totalAmount: 0,
            records: []
          };
        }
        acc[key].totalAmount += record.amount;
        acc[key].records.push(record);
        return acc;
      }, {} as Record<string, { month: string; year: number; totalAmount: number; records: any[] }>);

      // Phase 1: Create expenses first
      setExpenseProgress(0);
      for (let i = 0; i < validRecords.length; i++) {
        const record = validRecords[i];
        try {
          const normalizedCategory = getNormalizedCategory(record.expense_category);

          await addExpense({
            category: normalizedCategory,
            amount: record.amount,
            month: record.month,
            year: record.year,
            vendor: 'Imported Dataset',
            description: record.description || `Imported from ${file.name}`,
            target: 'all',
            status: status,
            isImported: true,
            importBatchId: importBatchId
          });

          expensesInserted++;
          setExpenseProgress(Math.floor((i + 1) / validRecords.length * 100));
        } catch (error) {
          console.error('Error saving expense:', error);
        }
      }

      // Phase 2: Create bills for each month with calculated amounts
      setBillProgress(0);
      const totalMonthKeys = Object.keys(expensesByMonth);
      let monthProcessed = 0;

      for (const monthKey of totalMonthKeys) {
        const monthData = expensesByMonth[monthKey];
        const billAmountPerMember = Math.round(monthData.totalAmount / members.length);

        try {
          const billPromises = members.map(member =>
            addBill({
              memberId: member.id,
              amount: billAmountPerMember,
              dueDate: Timestamp.fromDate(new Date(monthData.year, new Date(`${monthData.month} 1, ${monthData.year}`).getMonth() + 1, 0)), // Last day of month
              status: status, // 'paid' or 'pending'
              month: monthData.month,
              year: monthData.year,
              target: 'all',
              lateFee: 0,
              isImported: true,
              importBatchId: importBatchId,
              paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
              paymentMethod: status === 'paid' ? 'Import' : undefined,
              receiptNumber: status === 'paid' ? `IMP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}` : undefined
            })
          );

          await Promise.all(billPromises);
          billsInserted += members.length;

          monthProcessed++;
          setBillProgress(Math.floor((monthProcessed / totalMonthKeys.length) * 100));
        } catch (error) {
          console.error('Error saving bills for month:', monthKey, error);
        }
      }

      // Update overall progress
      setImportProgress(95);

      setImportProgress(95);

      // Import successful - update state
      setHasImportedData(true);

      setImportProgress(100);
      setImportStatus('completed');
      setImportResult({ billsInserted, expensesInserted, skipped });

      const statusText = status === 'paid' ? 'paid bills and expenses' : 'pending bills and expenses';
      const monthCount = Object.keys(expensesByMonth).length;
      toast({
        title: "Import Successful",
        description: `Created ${billsInserted} bills and ${expensesInserted} expenses across ${monthCount} months for ${members.length} members.`,
      });

      // Reset after showing success
      setTimeout(() => {
        setImportStatus('idle');
        setImportProgress(0);
        setImportResult(null);
        setIsImportDialogOpen(false);
      }, 3000);

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');

      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });

      setTimeout(() => {
        setImportStatus('idle');
        setImportProgress(0);
        setImportResult(null);
      }, 3000);
    }
  };

  // Mobile View
  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-white overflow-x-hidden">
        <motion.div
          className="bg-white shadow-sm p-6 border-b"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-600">Import and manage expenses</p>
        </motion.div>

        <div className="p-4 space-y-6 pb-24">
          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-red-600">₹{stats.total.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">Total Expenses</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-orange-600">₹{stats.currentMonth.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">This Month</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
              <div className="text-xs text-gray-600 mt-1">Total Count</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Monthly Change</div>
            </MobileCard>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-3"
          >
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-orange-500 text-white py-3 rounded-2xl font-medium">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-primary text-white py-3 rounded-2xl font-medium"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Dataset
              </Button>
              {hasImportedData && (
                <Button
                  variant="destructive"
                  className="flex-1 py-3 rounded-2xl font-medium"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete Imported
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Reset file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  // Store file temporarily and open status selection dialog
                  (window as any).selectedImportFile = file;
                  setIsImportDialogOpen(true);
                }
              }}
            />
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter expense description"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="month">Month</Label>
                      <Select value={formData.month} onValueChange={(value) => setFormData({...formData, month: value})}>
                        <SelectTrigger className="transition-all duration-200 hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg animate-in fade-in-0 zoom-in-95">
                          <SelectItem value="ALL" className="hover:bg-orange-50 focus:bg-orange-50 cursor-pointer transition-colors">
                            <span className="font-medium text-orange-600">ALL Months</span>
                          </SelectItem>
                          {months.map(month => (
                            <SelectItem key={month} value={month} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer transition-colors">
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        min="2020"
                        max="2030"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vendor">Vendor/Payee</Label>
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                      Add Expense
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Expenses List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Expenses ({filteredExpenses.length})</h2>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredExpenses.map((expense, index) => {
                const IconComponent = getCategoryIcon(expense.category);
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                  >
                    <MobileCard>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{expense.description}</h3>
                            <p className="text-xs text-gray-600 truncate">{expense.vendor}</p>
                            <p className="text-xs text-gray-600">{expense.month} {expense.year}</p>
                            <Badge variant="outline" className="text-xs mt-1 capitalize">
                              {expense.category}
                            </Badge>
                            {expense.isImported && (
                              <Badge variant="secondary" className="text-xs mt-1 ml-1">
                                <Download className="w-3 h-3 mr-1" />
                                Imported
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-lg text-red-600">-₹{expense.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </MobileCard>
                  </motion.div>
                );
              })}
            </div>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No expenses found</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Import and manage society expenses</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-gradient-primary shadow-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Dataset
          </Button>
          {hasImportedData && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <X className="w-4 h-4 mr-2" />
              Delete Imported Data
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-primary" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter expense description"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select value={formData.month} onValueChange={(value) => setFormData({...formData, month: value})}>
                    <SelectTrigger className="transition-all duration-200 hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg animate-in fade-in-0 zoom-in-95">
                      <SelectItem value="ALL" className="hover:bg-orange-50 focus:bg-orange-50 cursor-pointer transition-colors">
                        <span className="font-medium text-orange-600">ALL Months</span>
                      </SelectItem>
                      {months.map(month => (
                        <SelectItem key={month} value={month} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer transition-colors">
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vendor">Vendor/Payee</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="target">Target</Label>
                <Select value={formData.target === 'all' ? 'all' : 'specific'} onValueChange={(value) => setFormData({...formData, target: value === 'all' ? 'all' : []})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="specific">Specific Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-primary">
                  Add Expense
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
  
        {/* Import Dataset Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Import Dataset</DialogTitle>
            </DialogHeader>
  
            {importStatus === 'idle' && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Choose how to mark the imported expenses:
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const file = (window as any).selectedImportFile;
                      if (file) {
                        handleImportFile(file, 'paid');
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Mark as Paid
                  </Button>
                  <Button
                    onClick={() => {
                      const file = (window as any).selectedImportFile;
                      if (file) {
                        handleImportFile(file, 'pending');
                      }
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Mark as Pending
                  </Button>
                </div>
              </div>
            )}
  
            {(importStatus === 'uploading' || importStatus === 'processing') && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {importStatus === 'uploading' ? 'Uploading File...' : 'Processing Data...'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {importProgress}% completed
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>

                {/* Phase-specific progress bars */}
                {importStatus === 'processing' && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Creating Expenses</span>
                        <span>{expenseProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${expenseProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Creating Bills</span>
                        <span>{billProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${billProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
  
            {importStatus === 'completed' && importResult && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-600 text-2xl mb-2">✓</div>
                  <div className="text-lg font-semibold text-green-600">Import Completed!</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {importResult.billsInserted} bills and {importResult.expensesInserted} expenses imported
                  </div>
                </div>
              </div>
            )}
  
            {importStatus === 'error' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-red-600 text-2xl mb-2">✗</div>
                  <div className="text-lg font-semibold text-red-600">Import Failed</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Please check your file and try again
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Imported Data Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Imported Data</DialogTitle>
            </DialogHeader>

            {deleteStatus === 'idle' && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  This will permanently delete ALL imported bills and expenses from everywhere. This action cannot be undone.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={confirmDeleteImportedData}
                    variant="destructive"
                    className="flex-1"
                  >
                    Delete All Imported Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {deleteStatus === 'deleting' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    Deleting Imported Data...
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {deleteProgress}% completed
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${deleteProgress}%` }}
                  ></div>
                </div>

                {/* Phase-specific progress bars */}
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Deleting Bills</span>
                      <span>{deleteBillProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${deleteBillProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Deleting Expenses</span>
                      <span>{deleteExpenseProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${deleteExpenseProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deleteStatus === 'completed' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-600 text-2xl mb-2">✓</div>
                  <div className="text-lg font-semibold text-green-600">Deletion Completed!</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    All imported data has been successfully deleted
                  </div>
                </div>
              </div>
            )}

            {deleteStatus === 'error' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-red-600 text-2xl mb-2">✗</div>
                  <div className="text-lg font-semibold text-red-600">Deletion Failed</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Please try again or contact support
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">₹{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">₹{stats.currentMonth.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${monthlyChange >= 0 ? 'bg-gradient-danger' : 'bg-gradient-success'} rounded-xl flex items-center justify-center`}>
              {monthlyChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-white" />
              ) : (
                <TrendingDown className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Change</p>
              <p className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-danger' : 'text-success'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-secondary rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Per Expense</p>
              <p className="text-2xl font-bold">
                ₹{stats.count > 0 ? Math.round(stats.total / stats.count).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryBreakdown.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.value} className="group relative flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-all duration-200 border border-transparent hover:border-gray-200">
                <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="text-lg font-bold">₹{category.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{category.count} expenses</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {monthFilter !== 'all' && (
                    <>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                        title="Edit category details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.value)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                        title="Delete all expenses in this category for selected month"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {monthFilter === 'all' && (
                    <div className="text-xs text-muted-foreground px-2 py-1 bg-gray-100 rounded">
                      Select specific month to edit
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, vendor, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Expenses List ({filteredExpenses.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {filteredExpenses.map((expense) => {
            const IconComponent = getCategoryIcon(expense.category);
            return (
              <div key={expense.id} className="p-6 hover:bg-muted/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{expense.description}</h3>
                        <Badge variant="outline" className="capitalize">
                          {expense.category}
                        </Badge>
                        {expense.isImported && (
                          <Badge variant="secondary" className="text-xs">
                            <Download className="w-3 h-3 mr-1" />
                            Imported
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{expense.vendor}</span>
                        <span>{expense.month} {expense.year}</span>
                        <span>Created: {expense.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-danger">-₹{expense.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{expense.category}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No expenses found</h3>
            <p className="text-muted-foreground">No expenses match your current search criteria.</p>
          </div>
        )}
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditExpenseDialogOpen} onOpenChange={setIsEditExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className={`w-10 h-10 ${getCategoryColor(editingExpense.category)} rounded-xl flex items-center justify-center`}>
                  {React.createElement(getCategoryIcon(editingExpense.category), {
                    className: "w-5 h-5 text-white"
                  })}
                </div>
                <div>
                  <p className="font-medium">{editingExpense.description || editingExpense.category}</p>
                  <p className="text-sm text-muted-foreground">{editingExpense.vendor} • {editingExpense.month} {editingExpense.year}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-amount">Amount (₹)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    defaultValue={editingExpense.amount}
                    onChange={(e) => {
                      const newAmount = parseFloat(e.target.value);
                      if (!isNaN(newAmount) && newAmount >= 0) {
                        setEditingExpense({...editingExpense, amount: newAmount});
                      }
                    }}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    defaultValue={editingExpense.description || ''}
                    onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    placeholder="Enter expense description"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-vendor">Vendor/Payee</Label>
                  <Input
                    id="edit-vendor"
                    defaultValue={editingExpense.vendor}
                    onChange={(e) => setEditingExpense({...editingExpense, vendor: e.target.value})}
                    placeholder="Enter vendor name"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={async () => {
                    try {
                      await updateExpense(editingExpense.id, {
                        amount: editingExpense.amount,
                        description: editingExpense.description,
                        vendor: editingExpense.vendor
                      });
                      toast({
                        title: "Expense Updated",
                        description: "Expense details have been updated successfully.",
                      });
                      setIsEditExpenseDialogOpen(false);
                      setEditingExpense(null);
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to update expense.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Update Expense
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditExpenseDialogOpen(false);
                    setEditingExpense(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};