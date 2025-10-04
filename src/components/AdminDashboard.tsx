import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus, Eye, ArrowRight, Building2, Wallet, Bell, Activity, BarChart3, PieChart, Settings, FileText, Trash2, MoreVertical, Download } from 'lucide-react';
import { FinanceChart } from './FinanceChart';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getSocietyStats, getRecentPayments, getOverdueMembers, generateMonthlyBills, addExpense, addNotice, getMembers, getRecentBills, getRecentExpenses, deleteBill, getAllNotices, getAllExpenses } from '@/lib/firestoreServices';
import { BillReceipt } from '@/components/BillReceipt';
import { doc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { useSocietySettings } from '@/hooks/use-society-settings';
import { useUser } from '@/context/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MobileCard from '@/components/ui/MobileCard';

export const AdminDashboard = () => {
  const { toast } = useToast();
  const { settings: societySettings } = useSocietySettings();
  const { setCurrentView } = useUser();
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [overdueMembers, setOverdueMembers] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '', vendor: '', month: '', year: '', target: 'all', selectedMembers: [] as string[] });
  const [billForm, setBillForm] = useState({ month: '', year: '', amount: '2500' });
  const [noticeForm, setNoticeForm] = useState({ title: '', message: '', target: 'all', selectedMembers: [] as string[] });
  const [settingsForm, setSettingsForm] = useState({
    societyName: societySettings.societyName || '',
    maintenanceFee: societySettings.maintenanceFee || 2500,
    lateFee: societySettings.lateFee || 100,
    dueDay: societySettings.dueDay || 15
  });
  const [selectedVisualization, setSelectedVisualization] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedMonthCalc, setSelectedMonthCalc] = useState((new Date().getMonth() + 1).toString());
  const [selectedYearCalc, setSelectedYearCalc] = useState(new Date().getFullYear().toString());
  const [readersDialogOpen, setReadersDialogOpen] = useState(false);
  const [selectedNoticeReaders, setSelectedNoticeReaders] = useState<{ notice: any; readers: any[] } | null>(null);
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    bill: any;
    member: any;
  }>({ open: false, bill: null, member: null });
  const [allExpenses, setAllExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'society'), {
        ...settingsForm,
        emailNotifications: societySettings.emailNotifications,
        smsNotifications: societySettings.smsNotifications,
        paymentGateway: societySettings.paymentGateway,
        address: societySettings.address
      });
      toast({ title: "Settings Saved", description: "Society settings have been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const calculateMaintenanceFee = async () => {
    try {
      const expenses = await new Promise<any[]>((resolve) => getAllExpenses(resolve));
      if (expenses.length === 0) {
        toast({
          title: "No Expenses Found",
          description: "Cannot calculate maintenance fee without expense data.",
          variant: "destructive",
        });
        return;
      }

      // Filter expenses for selected month and year
      const selectedMonthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(selectedMonthCalc) - 1];
      const filteredExpenses = expenses.filter(expense =>
        expense.month === selectedMonthName && parseInt(expense.year) === parseInt(selectedYearCalc)
      );

      if (filteredExpenses.length === 0) {
        toast({
          title: "No Expenses Found",
          description: `No expenses found for ${selectedMonthName}/${selectedYearCalc}.`,
          variant: "destructive",
        });
        return;
      }

      const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const activeMembers = stats?.activeMembers || 0;

      // Divide by active members and round to nearest whole number
      const calculatedFee = activeMembers > 0 ? Math.round(totalExpenses / activeMembers) : 0;

      setSettingsForm({ ...settingsForm, maintenanceFee: calculatedFee });

      toast({
        title: "Maintenance Fee Calculated",
        description: `Calculated ₹${calculatedFee} per member based on ${selectedMonthName}/${selectedYearCalc} expenses divided by ${activeMembers} members.`,
      });
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate maintenance fee.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribeMembers = getMembers((users) => {
      setApprovedMembers(users.filter(u => u.approved));
    });
    const unsubscribeBills = getRecentBills(setRecentBills);
    const unsubscribeExpenses = getRecentExpenses(setRecentExpenses);
    const unsubscribeNotices = getAllNotices(setNotices);
    return () => {
      unsubscribeMembers();
      unsubscribeBills();
      unsubscribeExpenses();
      unsubscribeNotices();
    };
  }, []);

  // Update settingsForm when societySettings changes
  useEffect(() => {
    setSettingsForm({
      societyName: societySettings.societyName || '',
      maintenanceFee: societySettings.maintenanceFee || 2500,
      lateFee: societySettings.lateFee || 100,
      dueDay: societySettings.dueDay || 15
    });
  }, [societySettings]);

  useEffect(() => {
    setExpensesLoading(true);
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expenses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllExpenses(expenses);
      setExpensesLoading(false);
    }, (error) => {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error Loading Expenses",
        description: "Failed to load expense data. Please try again.",
        variant: "destructive",
      });
      setExpensesLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadData = () => {
    getSocietyStats((s) => setStats(s));
    getOverdueMembers((o) => setOverdueMembers(o));
  };

  const handleGenerateBills = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (!billForm.month || !billForm.year || !billForm.amount) {
        toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
        return;
      }
      const amount = parseFloat(billForm.amount);
      if (amount <= 0) {
        toast({ title: "Error", description: "Amount must be greater than 0.", variant: "destructive" });
        return;
      }
      await generateMonthlyBills(billForm.month, parseInt(billForm.year), 'all', amount);
      setIsBillDialogOpen(false);
      setBillForm({ month: '', year: '', amount: '2500' });
      toast({ title: "Success", description: `Bills of ₹${amount} generated for all members for ${billForm.month} ${billForm.year}.` });
    } catch (error) {
      console.error('Bill generation error:', error);
      toast({ title: "Error", description: "Failed to generate bills.", variant: "destructive" });
    }
  };

  const handleAddExpense = async () => {
    try {
      const amount = parseFloat(expenseForm.amount);
      if (!amount || !expenseForm.category || !expenseForm.vendor || !expenseForm.month || !expenseForm.year) {
        toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
        return;
      }

      // Validate month selection
      if (expenseForm.month !== 'ALL' && !['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].includes(expenseForm.month)) {
        toast({ title: "Error", description: "Please select a valid month.", variant: "destructive" });
        return;
      }

      const target = expenseForm.target === 'all' ? 'all' : expenseForm.selectedMembers;

      if (expenseForm.month === 'ALL') {
        // Add expense for all months
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const expensePromises = months.map(month =>
          addExpense({ amount, category: expenseForm.category, vendor: expenseForm.vendor, month, year: parseInt(expenseForm.year), target })
        );
        await Promise.all(expensePromises);
        toast({ title: "Success", description: `Expense added for all 12 months and sent to ${expenseForm.target === 'all' ? 'all members' : 'selected members'}.` });
      } else {
        // Add expense for single month
        await addExpense({ amount, category: expenseForm.category, vendor: expenseForm.vendor, month: expenseForm.month, year: parseInt(expenseForm.year), target });
        toast({ title: "Success", description: `Expense info sent to ${expenseForm.target === 'all' ? 'all members' : 'selected members'}.` });
      }

      setIsExpenseDialogOpen(false);
      setExpenseForm({ amount: '', category: '', vendor: '', month: '', year: '', target: 'all', selectedMembers: [] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
    }
  };

  const handleSendNotice = async () => {
    try {
      if (!noticeForm.title || !noticeForm.message) {
        toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
        return;
      }
      const target = noticeForm.target === 'all' ? 'all' : noticeForm.selectedMembers;
      await addNotice({ title: noticeForm.title, message: noticeForm.message, target, sentBy: 'admin', sentAt: Timestamp.now() });
      setIsNoticeDialogOpen(false);
      setNoticeForm({ title: '', message: '', target: 'all', selectedMembers: [] });
      toast({ title: "Success", description: `Notice sent to ${noticeForm.target === 'all' ? 'all members' : 'selected members'}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send notice.", variant: "destructive" });
    }
  };

  // Mobile Dashboard - Modern App Design with Tabs
  return (
    <>
      {/* Dialogs - Available for both mobile and desktop */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                  placeholder="e.g., Maintenance, Utilities"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <Label htmlFor="month">Month</Label>
                <select
                  id="month"
                  value={expenseForm.month}
                  onChange={(e) => setExpenseForm({...expenseForm, month: e.target.value})}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select month</option>
                  <option value="ALL">ALL Months</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={expenseForm.year}
                  onChange={(e) => setExpenseForm({...expenseForm, year: e.target.value})}
                  placeholder="e.g., 2024"
                />
              </div>
              <div>
                <Label htmlFor="expenseTarget">Send to</Label>
                <Select value={expenseForm.target} onValueChange={(value) => setExpenseForm({...expenseForm, target: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="specific">Specific Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {expenseForm.target === 'specific' && (
              <div>
                <Label>Select Members</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                  {approvedMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`expense-member-${member.id}`}
                        checked={expenseForm.selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExpenseForm({...expenseForm, selectedMembers: [...expenseForm.selectedMembers, member.id]});
                          } else {
                            setExpenseForm({...expenseForm, selectedMembers: expenseForm.selectedMembers.filter(id => id !== member.id)});
                          }
                        }}
                      />
                      <Label htmlFor={`expense-member-${member.id}`}>{member.fullName} (Flat {member.flatNumber})</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleAddExpense} className="w-full">Add Expense</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Monthly Bills</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate monthly bills for society members with a fixed amount.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bill-month">Month</Label>
                  <Input
                    id="bill-month"
                    value={billForm.month}
                    onChange={(e) => setBillForm({...billForm, month: e.target.value})}
                    placeholder="e.g., January"
                  />
                </div>
                <div>
                  <Label htmlFor="bill-year">Year</Label>
                  <Input
                    id="bill-year"
                    type="number"
                    value={billForm.year}
                    onChange={(e) => setBillForm({...billForm, year: e.target.value})}
                    placeholder="e.g., 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="bill-amount">Amount (₹)</Label>
                  <Input
                    id="bill-amount"
                    type="number"
                    value={billForm.amount}
                    onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                    placeholder="2500"
                    min="1"
                  />
                </div>
              </div>

            </div>

            <Button onClick={handleGenerateBills} className="w-full" disabled={!billForm.month || !billForm.year || !billForm.amount}>
              Generate Bills
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNoticeDialogOpen} onOpenChange={setIsNoticeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Notice to Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})}
                placeholder="Notice title"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={noticeForm.message}
                onChange={(e) => setNoticeForm({...noticeForm, message: e.target.value})}
                placeholder="Notice content"
                rows={4}
                className="w-full resize-none"
              />
            </div>
            <div>
              <Label htmlFor="noticeTarget">Send to</Label>
              <Select value={noticeForm.target} onValueChange={(value) => setNoticeForm({...noticeForm, target: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="specific">Specific Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {noticeForm.target === 'specific' && (
              <div>
                <Label>Select Members</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                  {approvedMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`notice-member-${member.id}`}
                        checked={noticeForm.selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNoticeForm({...noticeForm, selectedMembers: [...noticeForm.selectedMembers, member.id]});
                          } else {
                            setNoticeForm({...noticeForm, selectedMembers: noticeForm.selectedMembers.filter(id => id !== member.id)});
                          }
                        }}
                      />
                      <Label htmlFor={`notice-member-${member.id}`} className="text-sm break-words">{member.fullName} (Flat {member.flatNumber})</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleSendNotice} className="w-full">Send Notice</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Dashboard */}
      <div className="md:hidden">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-md border-b border-gray-200 rounded-none h-12 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="dashboard" className="text-xs px-1 min-w-0 flex-1 truncate">Home</TabsTrigger>
            <TabsTrigger value="bills" className="text-xs px-1 min-w-0 flex-1 truncate">Bills</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs px-1 min-w-0 flex-1 truncate">Expenses</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs px-1 min-w-0 flex-1 truncate">Reports</TabsTrigger>
            <TabsTrigger value="notices" className="text-xs px-1 min-w-0 flex-1 truncate">Notices</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-1 min-w-0 flex-1 truncate">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            {/* Hero Header */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-6 pt-12 pb-8 rounded-b-3xl shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
                    <p className="text-indigo-100 text-sm">{societySettings.societyName || 'Society'} Management</p>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm">Active Members</p>
                        <p className="text-xl font-bold">{stats?.activeMembers || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm">Monthly Revenue</p>
                        <p className="text-xl font-bold">₹{(stats ? (stats.totalCollection / 1000).toFixed(0) : 0)}K</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="px-2 pb-24 pt-6 space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsBillDialogOpen(true)}
                  >
                    <Plus className="w-6 h-6 mb-2 mx-auto" />
                    <div className="text-sm font-semibold">Generate Bills</div>
                  </motion.button>

                  <motion.button
                    className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExpenseDialogOpen(true)}
                  >
                    <Wallet className="w-6 h-6 mb-2 mx-auto" />
                    <div className="text-sm font-semibold">Add Expense</div>
                  </motion.button>

                  <motion.button
                    className="bg-gradient-to-br from-green-500 to-teal-500 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsNoticeDialogOpen(true)}
                  >
                    <Bell className="w-6 h-6 mb-2 mx-auto" />
                    <div className="text-sm font-semibold">Send Notice</div>
                  </motion.button>

                  <motion.button
                    className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentView('reports')}
                  >
                    <BarChart3 className="w-6 h-6 mb-2 mx-auto" />
                    <div className="text-sm font-semibold">View Reports</div>
                  </motion.button>
                </div>
              </motion.div>

              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Total Members</p>
                        <p className="text-2xl font-bold text-blue-900">{stats?.activeMembers || 0}</p>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600">Active members in society</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-3xl border border-green-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                        <IndianRupee className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-700 font-medium">Monthly Collection</p>
                        <p className="text-2xl font-bold text-green-900">₹{(stats ? (stats.totalCollection / 1000).toFixed(0) : 0)}K</p>
                      </div>
                    </div>
                    <div className="text-xs text-green-600">{stats?.collectionRate || 0}% collection rate</div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-3xl border border-yellow-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-700 font-medium">Total Expenses</p>
                        <p className="text-2xl font-bold text-orange-900">₹{(stats ? (stats.totalExpenses / 1000).toFixed(0) : 0)}K</p>
                      </div>
                    </div>
                    <div className="text-xs text-orange-600">This month's expenses</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-3xl border border-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Net Balance</p>
                        <p className="text-2xl font-bold text-purple-900">₹{(stats ? (stats.netBalance / 1000).toFixed(0) : 0)}K</p>
                      </div>
                    </div>
                    <div className={`text-xs ${stats?.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.netBalance >= 0 ? 'Positive balance' : 'Negative balance'}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentBills.slice(0, 3).map((bill, index) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{bill.month} {bill.year} Bills</p>
                          <p className="text-sm text-gray-600">₹{bill.amount?.toLocaleString()} • {bill.target === 'all' ? 'All Members' : 'Specific'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">{bill.createdAt?.toDate().toLocaleDateString()}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <motion.button
                                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                                whileTap={{ scale: 0.9 }}
                                aria-label="More options"
                              >
                                <MoreVertical size={16} />
                              </motion.button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (window.confirm('Delete this bill permanently? This will remove it from all member dashboards.')) {
                                    try {
                                      await deleteBill(bill.id);
                                      toast({ title: "Bill Deleted", description: "Bill has been removed from all member dashboards." });
                                    } catch (error) {
                                      toast({ title: "Error", description: "Failed to delete bill.", variant: "destructive" });
                                    }
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Bill
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {recentExpenses.slice(0, 2).map((expense, index) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{expense.category}</p>
                          <p className="text-sm text-gray-600">{expense.vendor} • ₹{expense.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{expense.month} {expense.year}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Overdue Payments Alert */}
              {overdueMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-3xl border border-red-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900">Payment Reminders Needed</h3>
                      <p className="text-sm text-red-700">{overdueMembers.length} members have overdue payments</p>
                    </div>
                  </div>
                  <motion.button
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-2xl font-semibold shadow-lg"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      overdueMembers.forEach(async (item) => {
                        try {
                          const overdueAmount = item.bills.reduce((sum, b) => sum + b.amount, 0);
                          await addNotice({
                            title: 'Payment Reminder',
                            message: `Dear ${item.member.fullName},\n\nThis is a reminder that you have ${item.bills.length} overdue bill(s) totaling ₹${overdueAmount.toLocaleString()}. Please make the payment at your earliest convenience.\n\nThank you,\n${societySettings.societyName || 'Society'} Management`,
                            target: [item.member.id],
                            sentBy: 'admin',
                            sentAt: Timestamp.now()
                          });
                        } catch (error) {
                          console.error('Notice send error:', error);
                        }
                      });
                      toast({ title: "Reminders Sent", description: `Payment reminders sent to ${overdueMembers.length} members.` });
                    }}
                  >
                    Send Payment Reminders
                  </motion.button>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bills" className="mt-0 px-2 pb-24 pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Bill Management</h2>
                <Button onClick={() => setIsBillDialogOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Bills
                </Button>
              </div>

              <div className="space-y-4">
                {recentBills.length > 0 ? recentBills.map((bill) => (
                  <MobileCard key={bill.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{bill.month} {bill.year} Bills</p>
                        <p className="text-sm text-gray-600">₹{bill.amount?.toLocaleString()} • {bill.target === 'all' ? 'All Members' : 'Specific'}</p>
                        <p className="text-xs text-gray-500">{bill.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Find the member for this bill
                            const member = approvedMembers.find(m => m.id === bill.memberId);
                            setReceiptDialog({
                              open: true,
                              bill,
                              member: member ? {
                                fullName: member.fullName,
                                flatNumber: member.flatNumber
                              } : { fullName: 'Unknown Member', flatNumber: 'N/A' }
                            });
                          }}
                          className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (window.confirm('Delete this bill permanently? This will remove it from all member dashboards.')) {
                              try {
                                await deleteBill(bill.id);
                                toast({ title: "Bill Deleted", description: "Bill has been removed from all member dashboards." });
                              } catch (error) {
                                toast({ title: "Error", description: "Failed to delete bill.", variant: "destructive" });
                              }
                            }
                          }}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </MobileCard>
                )) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bills Generated</h3>
                    <p className="text-gray-500">Generate your first bill to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="mt-0 px-2 pb-24 pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Expense Management</h2>
                <Button onClick={() => setIsExpenseDialogOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>

              <div className="space-y-4">
                {recentExpenses.length > 0 ? recentExpenses.map((expense) => (
                  <MobileCard key={expense.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{expense.category}</p>
                        <p className="text-sm text-gray-600">{expense.vendor}</p>
                        <p className="text-xs text-gray-500">{expense.month} {expense.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">₹{expense.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </MobileCard>
                )) : (
                  <div className="text-center py-12">
                    <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Expenses Recorded</h3>
                    <p className="text-gray-500">Add your first expense to track spending</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0 px-2 pb-24 pt-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Reports & Visualizations</h2>

              <div className="space-y-4">
                {/* Mobile-friendly dropdown layout */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="w-full">
                    <Label className="text-sm font-medium text-gray-700">Visualization Type</Label>
                    <Select value={selectedVisualization} onValueChange={setSelectedVisualization}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Overview</SelectItem>
                        <SelectItem value="visualizations">Expense Breakdown</SelectItem>
                        <SelectItem value="revenue">Revenue Trends</SelectItem>
                        <SelectItem value="expenses">Expense Trends</SelectItem>
                        <SelectItem value="insight">Member Status</SelectItem>
                        <SelectItem value="trends">Financial Trends</SelectItem>
                        <SelectItem value="comparison">Income vs Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label className="text-sm font-medium text-gray-700">Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="January">January</SelectItem>
                        <SelectItem value="February">February</SelectItem>
                        <SelectItem value="March">March</SelectItem>
                        <SelectItem value="April">April</SelectItem>
                        <SelectItem value="May">May</SelectItem>
                        <SelectItem value="June">June</SelectItem>
                        <SelectItem value="July">July</SelectItem>
                        <SelectItem value="August">August</SelectItem>
                        <SelectItem value="September">September</SelectItem>
                        <SelectItem value="October">October</SelectItem>
                        <SelectItem value="November">November</SelectItem>
                        <SelectItem value="December">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mobile-responsive chart container */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="w-full h-64 sm:h-80 overflow-hidden">
                    <FinanceChart visualizationType={selectedVisualization} selectedMonth={selectedMonth} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notices" className="mt-0 px-2 pb-24 pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Notice Management</h2>
                <Button onClick={() => setIsNoticeDialogOpen(true)} size="sm" className="text-xs px-3">
                  <Plus className="w-3 h-3 mr-1" />
                  Send Notice
                </Button>
              </div>

              <div className="space-y-3">
                {notices.length > 0 ? notices.slice(0, 10).map((notice) => (
                  <MobileCard key={notice.id}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-semibold text-gray-900 text-base leading-tight break-words overflow-wrap-anywhere">{notice.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words overflow-wrap-anywhere">{notice.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span className="whitespace-nowrap flex-shrink-0">{notice.sentAt?.toDate().toLocaleDateString()}</span>
                              <span className="flex-shrink-0">•</span>
                              <span className="whitespace-nowrap flex-shrink-0">Read by {notice.readBy?.length || 0}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const readers = notice.readBy?.map((readerId: string) => {
                                  return approvedMembers.find(member => member.id === readerId);
                                }).filter(Boolean) || [];
                                setSelectedNoticeReaders({ notice, readers });
                                setReadersDialogOpen(true);
                              }}
                              className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                )) : (
                  <MobileCard>
                    <div className="text-center py-6">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Notices Sent</h3>
                      <p className="text-gray-500 text-sm">Send your first notice to keep members informed</p>
                    </div>
                  </MobileCard>
                )}
              </div>


              {/* Notice Readers Dialog */}
              <Dialog open={readersDialogOpen} onOpenChange={setReadersDialogOpen}>
                <DialogContent className="max-w-md z-[1000]">
                  <DialogHeader>
                    <DialogTitle>Notice Readers</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      "{selectedNoticeReaders?.notice?.title}"
                    </p>
                  </DialogHeader>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedNoticeReaders?.readers && selectedNoticeReaders.readers.length > 0 ? (
                      selectedNoticeReaders.readers.map((reader) => (
                        <div key={reader.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{reader.fullName}</p>
                            <p className="text-sm text-gray-600">Flat {reader.flatNumber}</p>
                          </div>
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No one has read this notice yet</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      Total readers: {selectedNoticeReaders?.readers?.length || 0}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReadersDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 px-2 pb-24 pt-6">
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Society Settings</h2>

              <MobileCard>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="societyName">Society Name</Label>
                    <Input
                      id="societyName"
                      value={settingsForm.societyName}
                      onChange={(e) => setSettingsForm({...settingsForm, societyName: e.target.value})}
                      placeholder="Enter society name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="selectedMonthCalc">Month</Label>
                      <Select value={selectedMonthCalc} onValueChange={setSelectedMonthCalc}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="selectedYearCalc">Year</Label>
                      <Input
                        id="selectedYearCalc"
                        type="number"
                        value={selectedYearCalc}
                        onChange={(e) => setSelectedYearCalc(e.target.value)}
                        min="2020"
                        max="2030"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="maintenanceFee">Monthly Maintenance (₹)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="maintenanceFee"
                        type="number"
                        value={settingsForm.maintenanceFee}
                        onChange={(e) => setSettingsForm({...settingsForm, maintenanceFee: parseInt(e.target.value) || 0})}
                        placeholder="2500"
                      />
                      <Button type="button" variant="outline" onClick={calculateMaintenanceFee} className="px-3">
                        Calculate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Calculate" to set fee based on selected month's expenses
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="lateFee">Late Fee (₹)</Label>
                    <Input
                      id="lateFee"
                      type="number"
                      value={settingsForm.lateFee}
                      onChange={(e) => setSettingsForm({...settingsForm, lateFee: parseInt(e.target.value) || 0})}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dueDay">Due Day</Label>
                    <Input
                      id="dueDay"
                      type="number"
                      value={settingsForm.dueDay}
                      onChange={(e) => setSettingsForm({...settingsForm, dueDay: parseInt(e.target.value) || 15})}
                      placeholder="15"
                      min="1"
                      max="31"
                    />
                  </div>

                  <Button className="w-full" onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </div>
              </MobileCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 w-full overflow-x-hidden">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-purple-800 to-slate-800 p-4 sm:p-6 lg:p-12 rounded-b-3xl shadow-2xl mx-2 sm:mx-4 lg:mx-0">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated background elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-purple-200 text-lg lg:text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    {societySettings.societyName || 'Society'} Management
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 lg:gap-6 mt-6">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">System Online</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 text-purple-200" />
                  <span className="text-purple-200 text-sm">Last updated: Just now</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-green-200 text-sm">All systems operational</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Active Members</p>
                    <p className="text-xl font-bold">{stats?.activeMembers || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Monthly Revenue</p>
                    <p className="text-xl font-bold">₹{(stats ? (stats.totalCollection / 1000).toFixed(0) : 0)}K</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Enhanced Stats Cards */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-900">{stats?.activeMembers || 0}</div>
                  <div className="text-sm text-blue-700 font-medium">Total Members</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800 font-medium">Active Members</div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                  {stats?.activeMembers || 0}
                </div>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-emerald-200 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <IndianRupee className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-900">₹{(stats ? (stats.totalCollection / 1000).toFixed(0) : 0)}K</div>
                  <div className="text-sm text-green-700 font-medium">Monthly Collection</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-800 font-medium">Collection Rate</div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                  {stats?.collectionRate || 0}%
                </div>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-100 to-yellow-200 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-orange-900">₹{(stats ? (stats.totalExpenses / 1000).toFixed(0) : 0)}K</div>
                  <div className="text-sm text-orange-700 font-medium">Total Expenses</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-orange-800 font-medium">This Month</div>
                <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                  Active
                </div>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-100 to-purple-200 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-900">₹{(stats ? (stats.netBalance / 1000).toFixed(0) : 0)}K</div>
                  <div className="text-sm text-purple-700 font-medium">Net Balance</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-purple-800 font-medium">Current Status</div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  (stats?.netBalance || 0) >= 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {(stats?.netBalance || 0) >= 0 ? 'Positive' : 'Negative'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="hover-lift">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Monthly Income vs Expenses
              </h2>
            </div>
            <div className="p-6">
              <FinanceChart />
            </div>
          </Card>

          <Card className="hover-lift">
            <div className="p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Overdue Payments
                </h2>
                <Badge variant="destructive">{overdueMembers.length} Members</Badge>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {overdueMembers.length > 0 ? (
                overdueMembers.map((item) => (
                  <div key={item.member.id} className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.member.fullName}</h3>
                        <p className="text-sm text-gray-600">Flat {item.member.flatNumber} • {item.bills.length} bills overdue</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">₹{item.bills.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            const overdueAmount = item.bills.reduce((sum, b) => sum + b.amount, 0);
                            await addNotice({
                              title: 'Payment Reminder',
                              message: `Dear ${item.member.fullName},\n\nThis is a reminder that you have ${item.bills.length} overdue bill(s) totaling ₹${overdueAmount.toLocaleString()}. Please make the payment at your earliest convenience.\n\nThank you,\n${societySettings.societyName || 'Society'} Management`,
                              target: [item.member.id],
                              sentBy: 'admin',
                              sentAt: Timestamp.now()
                            });
                            toast({
                              title: "Notice Sent",
                              description: `Payment reminder sent to ${item.member.fullName}`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to send notice.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Send Notice
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No overdue payments currently.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Bills Section */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <Card className="hover-lift">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Recent Bills Generated
                </h2>
                <p className="text-sm text-gray-600 mt-1">Latest billing activities</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {recentBills.length} Bills
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {recentBills.length > 0 ? recentBills.map((bill) => (
                <Card key={bill.id} className="p-4 bg-gradient-to-r from-white to-blue-50 border border-blue-100 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{bill.month || 'N/A'} {bill.year || ''}</h3>
                        <p className="text-sm text-gray-600">
                          Amount: ₹{bill.amount?.toLocaleString() || 'N/A'} •
                          Target: {bill.target === 'all' ? 'All Members' : `${Array.isArray(bill.target) ? bill.target.length : 1} Member${Array.isArray(bill.target) && bill.target.length > 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Generated: {bill.createdAt?.toDate().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('Delete this bill permanently? This will remove it from all member dashboards.')) {
                          try {
                            await deleteBill(bill.id);
                            toast({ title: "Bill Deleted", description: "Bill has been removed from all member dashboards." });
                          } catch (error) {
                            toast({ title: "Error", description: "Failed to delete bill.", variant: "destructive" });
                          }
                        }
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bills Generated Yet</h3>
                  <p className="text-gray-500">Generate your first bill to see it here</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <Card className="hover-lift">
          <div className="p-6 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-600" />
                Recent Expenses
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpenseDialogOpen(true)}
                className="text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Expense
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <Card key={expense.id} className="p-4 bg-gradient-to-r from-white to-yellow-50 border border-yellow-100 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{expense.category}</h3>
                        <p className="text-sm text-gray-600">{expense.vendor} • {expense.month} {expense.year}</p>
                        <p className="text-xs text-gray-500">Target: {expense.target === 'all' ? 'All Members' : `${Array.isArray(expense.target) ? expense.target.length : 1} Member${Array.isArray(expense.target) && expense.target.length > 1 ? 's' : ''}`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-lg">-₹{expense.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Expense</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Expenses Recorded</h3>
                <p className="text-gray-500">Add your first expense to track spending</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* All Expenses Table */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <Card className="hover-lift">
          <div className="p-6 border-b bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  All Expenses
                </h2>
                <p className="text-sm text-gray-600 mt-1">Complete expense history ordered by creation date</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {allExpenses.length} Total
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            {expensesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-3 text-gray-600">Loading expenses...</span>
              </div>
            ) : allExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Expense Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Month</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Year</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="font-medium text-gray-800 capitalize">{expense.category}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-600">₹{expense.amount?.toLocaleString() || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">{expense.month || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">{expense.year || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={expense.status === 'paid' ? 'default' : expense.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                              {expense.status || 'N/A'}
                            </Badge>
                            {expense.isImported && (
                              <Badge variant="secondary" className="text-xs">
                                <Download className="w-3 h-3 mr-1" />
                                Imported
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-600 text-sm">
                            {expense.createdAt?.toDate().toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Expenses Found</h3>
                <p className="text-gray-500">No expense records available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog({ open, bill: null, member: null })}>
        <DialogContent className="max-w-sm sm:max-w-md p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            {receiptDialog.bill && receiptDialog.member && (
              <BillReceipt
                bill={receiptDialog.bill}
                member={receiptDialog.member}
                societyName={societySettings.societyName || 'Society'}
                onClose={() => setReceiptDialog({ open: false, bill: null, member: null })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};
