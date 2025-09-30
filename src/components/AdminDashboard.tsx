import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus, Eye, ArrowRight, Building2, Wallet, Bell, Activity, BarChart3, PieChart, Settings, FileText } from 'lucide-react';
import { FinanceChart } from './FinanceChart';
import { useEffect, useState } from 'react';
import { getSocietyStats, getRecentPayments, getOverdueMembers, generateMonthlyBills, addExpense, addNotice, getMembers, getRecentBills, getRecentExpenses, deleteBill } from '@/lib/firestoreServices';
import { Timestamp } from 'firebase/firestore';
import { useSocietySettings } from '@/hooks/use-society-settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export const AdminDashboard = () => {
  const { toast } = useToast();
  const { settings: societySettings } = useSocietySettings();
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [overdueMembers, setOverdueMembers] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '', vendor: '', month: '', year: '', target: 'all', selectedMembers: [] as string[] });
  const [billForm, setBillForm] = useState({ month: '', year: '', amount: '2500' });
  const [noticeForm, setNoticeForm] = useState({ title: '', message: '', target: 'all', selectedMembers: [] as string[] });

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
    return () => {
      unsubscribeMembers();
      unsubscribeBills();
      unsubscribeExpenses();
    };
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
      const target = expenseForm.target === 'all' ? 'all' : expenseForm.selectedMembers;
      await addExpense({ amount, category: expenseForm.category, vendor: expenseForm.vendor, month: expenseForm.month, year: parseInt(expenseForm.year), target });
      setIsExpenseDialogOpen(false);
      setExpenseForm({ amount: '', category: '', vendor: '', month: '', year: '', target: 'all', selectedMembers: [] });
      toast({ title: "Success", description: `Expense info sent to ${expenseForm.target === 'all' ? 'all members' : 'selected members'}.` });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 w-full overflow-x-hidden">
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

      {/* Action Buttons */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 lg:mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center lg:justify-start">
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
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
                    <Input
                      id="month"
                      value={expenseForm.month}
                      onChange={(e) => setExpenseForm({...expenseForm, month: e.target.value})}
                      placeholder="e.g., January"
                    />
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
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Users className="w-4 h-4 mr-2" />
                Generate Bills
              </Button>
            </DialogTrigger>
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
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Bell className="w-4 h-4 mr-2" />
                Send Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={noticeForm.message}
                    onChange={(e) => setNoticeForm({...noticeForm, message: e.target.value})}
                    placeholder="Notice content"
                  />
                </div>
                <div>
                  <Label htmlFor="noticeTarget">Send to</Label>
                  <Select value={noticeForm.target} onValueChange={(value) => setNoticeForm({...noticeForm, target: value})}>
                    <SelectTrigger>
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
                          <Label htmlFor={`notice-member-${member.id}`}>{member.fullName} (Flat {member.flatNumber})</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleSendNotice} className="w-full">Send Notice</Button>
              </div>
            </DialogContent>
          </Dialog>
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
    </div>
  );
};
