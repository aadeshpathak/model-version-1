import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MobileCard from '@/components/ui/MobileCard';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { getMemberBills, getMemberNotices, getMemberExpenses, updateBill, addNotice, getSocietySettings, markNoticeAsRead, markOverdueBills } from '@/lib/firestoreServices';
import { BillReceipt } from '@/components/BillReceipt';
import { PaymentDialog } from '@/components/PaymentDialog';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Bell,
  Calendar,
  IndianRupee,
  ArrowRight,
  Edit3,
  Save,
  X,
  User,
  Home,
  Receipt,
  TrendingUp,
  Activity,
  Zap,
  Sun,
  Moon,
  Star,
  Award,
  Target,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Bill, Notice } from '@/lib/firestoreServices';

export const MemberDashboard = () => {
  const { uid, userEmail, userData, updateUserData, setCurrentView, setUnreadNoticesCount } = useUser();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [societySettings, setSocietySettings] = useState<any>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    flatNumber: ''
  });
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    bill: any;
  }>({ open: false, bill: null });

  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    bill: any;
  }>({ open: false, bill: null });

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      // Mark overdue bills when dashboard loads
      markOverdueBills();

      const unsubscribeBills = getMemberBills(uid, (b) => {
        setBills(b);
        setIsLoading(false);
      });
      const unsubscribeNotices = getMemberNotices(uid, setNotices);
      const unsubscribeExpenses = getMemberExpenses(uid, setExpenses);
      const unsubscribeSettings = getSocietySettings(setSocietySettings);
      return () => {
        unsubscribeBills();
        unsubscribeNotices();
        unsubscribeExpenses();
        unsubscribeSettings();
      };
    }
  }, [uid]);

  useEffect(() => {
    if (userData) {
      setProfileForm({
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        flatNumber: userData.flatNumber || ''
      });
    }
  }, [userData]);

  useEffect(() => {
    if (notices.length > 0 && uid) {
      const unread = notices.filter(notice => !notice.readBy || !notice.readBy.includes(uid)).length;
      setUnreadNoticesCount(unread);
    }
  }, [notices, uid, setUnreadNoticesCount]);

  const handleProfileUpdate = async () => {
    try {
      await updateUserData(profileForm);
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated Successfully!",
        description: "Your profile information has been saved.",
        variant: "default",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Unable to save profile changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNoticeClick = async (noticeId: string) => {
    if (uid) {
      try {
        await markNoticeAsRead(noticeId, uid);
        // The notices will update via the listener, and unread count will recalculate
      } catch (error) {
        console.error('Error marking notice as read:', error);
      }
    }
  };

  const unreadCount = notices.filter(n => !n.readBy || !n.readBy.includes(uid)).length;

  const memberData = {
    name: userData?.fullName || userEmail.split('@')[0],
    flatNumber: userData?.flatNumber || "Not set",
    pendingAmount: bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0),
    nextDueDate: (() => {
      const pendingBill = bills.find(b => b.status === 'pending');
      if (pendingBill && pendingBill.dueDate) {
        return pendingBill.dueDate.toDate ? pendingBill.dueDate.toDate().toISOString().split('T')[0] : String(pendingBill.dueDate);
      }
      return "N/A";
    })(),
    recentPayments: bills.filter(b => b.status === 'paid').slice(0, 3).map(b => ({
      id: b.id,
      month: b.dueDate?.toDate ? b.dueDate.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A',
      amount: b.amount || 0,
      status: b.status,
      date: b.dueDate?.toDate ? b.dueDate.toDate().toISOString().split('T')[0] : 'N/A',
      receipt: `#RC${b.id.slice(-3)}`
    })),
    currentBills: bills.slice(0, 2).map(b => ({
      id: b.id,
      month: b.dueDate?.toDate ? b.dueDate.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A',
      amount: (b.amount || 0) + (b.lateFee || 0),
      dueDate: b.dueDate?.toDate ? b.dueDate.toDate().toISOString().split('T')[0] : 'N/A',
      status: b.status
    })),
    notices: notices.slice(0, 3).map(n => ({
      id: n.id,
      title: n.title,
      date: n.sentAt?.toDate ? n.sentAt.toDate().toISOString().split('T')[0] : 'N/A',
      type: "announcement"
    }))
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-gradient-success';
      case 'pending': return 'bg-gradient-warning';
      case 'overdue': return 'bg-gradient-danger';
      case 'upcoming': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: 'Good morning', icon: Sun, color: 'text-yellow-500' };
    if (hour < 17) return { greeting: 'Good afternoon', icon: Sun, color: 'text-orange-500' };
    return { greeting: 'Good evening', icon: Moon, color: 'text-indigo-500' };
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Mobile Dashboard
  return (
    <>
      {/* Mobile Dashboard */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
        {/* Modern Hero Header */}
        <motion.div
          className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-6 pt-16 pb-8 rounded-b-3xl shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -top-20 -right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>

          <div className="relative z-10">
            {/* Time-based Greeting */}
            <motion.div
              className="flex items-center gap-2 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {(() => {
                const { greeting, icon: Icon, color } = getTimeBasedGreeting();
                return (
                  <>
                    <div className={`w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ${color}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/90 text-sm font-medium">{greeting}!</span>
                  </>
                );
              })()}
            </motion.div>

            {/* User Info */}
            <motion.div
              className="flex items-center gap-4 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Welcome back,</h1>
                <p className="text-lg font-semibold text-white">{memberData.name}</p>
                <p className="text-indigo-100 text-sm flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  Flat {memberData.flatNumber}
                </p>
              </div>
            </motion.div>

            {/* Quick Stats in Header */}
            <motion.div
              className="grid grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                <div className="text-lg font-bold">₹{(bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0) / 1000).toFixed(0)}K</div>
                <div className="text-xs text-white/80">Paid</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                <div className="text-lg font-bold">{memberData.pendingAmount > 0 ? 'Due' : 'Clear'}</div>
                <div className="text-xs text-white/80">Status</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                <div className="text-lg font-bold">{unreadCount}</div>
                <div className="text-xs text-white/80">Unread Notices</div>
              </div>
            </motion.div>

            {/* Achievement Badges */}
            <motion.div
              className="flex items-center gap-2 mt-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <Star className="w-3 h-3 text-yellow-300" />
                <span className="text-xs text-white font-medium">12 Month Streak</span>
              </div>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <Award className="w-3 h-3 text-green-300" />
                <span className="text-xs text-white font-medium">Top Payer</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="px-6 pb-24 pt-6 space-y-6">
          {/* Enhanced Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-2xl border border-red-100"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-700 font-medium">Pending Amount</p>
                    <p className="text-xl font-bold text-red-900">₹{bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-red-600">Requires immediate attention</div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Paid This Year</p>
                    <p className="text-xl font-bold text-green-900">₹{(bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
                <div className="text-xs text-green-600">Excellent payment record</div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Next Due Date</p>
                    <p className="text-lg font-bold text-blue-900">{memberData.nextDueDate}</p>
                  </div>
                </div>
                <div className="text-xs text-blue-600">Payment deadline</div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Unread Notices</p>
                    <p className="text-xl font-bold text-purple-900">{unreadCount}</p>
                  </div>
                </div>
                <div className="text-xs text-purple-600">Unread announcements</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Enhanced Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('myBills')}
              >
                <Receipt className="w-6 h-6 mx-auto mb-2" />
                <div className="text-xs font-semibold">View Bills</div>
              </motion.button>
              <motion.button
                className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-2xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('payments')}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-2" />
                <div className="text-xs font-semibold">Payments</div>
              </motion.button>
              <motion.button
                className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-4 rounded-2xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('notices')}
              >
                <Bell className="w-6 h-6 mx-auto mb-2" />
                <div className="text-xs font-semibold">Notices</div>
              </motion.button>
            </div>
          </motion.div>

          {/* Payment Progress & Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Your Progress
            </h2>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Payment Streak</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-bold text-green-900">12 Months</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">This Year's Progress</span>
                  <span className="text-green-900 font-medium">85%</span>
                </div>
                <div className="bg-green-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full h-3"
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <p className="text-xs text-green-600">3 more payments to reach 100% completion</p>
              </div>
            </div>
          </motion.div>

          {/* Current Bills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Bills</h2>
            <div className="max-h-64 overflow-y-auto space-y-3 pb-20">
              {memberData.currentBills.map((bill, index) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                >
                  <MobileCard>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{bill.month}</h3>
                        <p className="text-sm text-gray-600">Due: {bill.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{bill.amount.toLocaleString()}</p>
                        {bill.status === 'pending' && (
                          <motion.button
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm mt-2"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPaymentDialog({ open: true, bill })}
                          >
                            Pay Now
                          </motion.button>
                        )}
                        {bill.status === 'paid' && (
                          <motion.button
                            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm mt-2"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const updatedBill = bills.find(b => b.id === bill.id) || bill;
                              setReceiptDialog({ open: true, bill: updatedBill });
                            }}
                          >
                            View Receipt
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </MobileCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Notices */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Notices</h2>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {memberData.notices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                  onClick={() => handleNoticeClick(notice.id)}
                  className="cursor-pointer"
                >
                  <MobileCard>
                    <h3 className="font-semibold text-sm">{notice.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{notice.date}</p>
                  </MobileCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Enhanced Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 lg:p-8 rounded-b-3xl shadow-2xl mb-8">
        <div className="absolute inset-0 bg-black/10"></div>
        {/* Animated background elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                    Welcome back, {memberData.name}!
                  </h1>
                  <p className="text-indigo-100 text-base lg:text-lg flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Flat {memberData.flatNumber} • {societySettings.societyName || 'Green Valley Society'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 lg:gap-6 mt-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">Account Active</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                  <Activity className="w-4 h-4 text-indigo-200" />
                  <span className="text-indigo-100 text-sm">Member since 2024</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-green-200 text-sm">Payment Streak: 12 months</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-white shadow-xl hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Outstanding Amount</p>
                    <p className="text-3xl font-bold">₹{bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Payment Progress</span>
                    <span className="text-white font-medium">
                      {bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0) > 0 ? '75%' : '100%'}
                    </span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 rounded-full h-2 transition-all duration-1000 ease-out"
                      style={{ width: bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0) > 0 ? '75%' : '100%' }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/70">
                    {bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0) > 0 ? '3 bills remaining' : 'All caught up!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {/* Pending Amount Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <IndianRupee className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-900">₹{memberData.pendingAmount.toLocaleString()}</div>
                  <div className="text-sm text-red-700 font-medium">Pending Amount</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-800 font-medium">Status</div>
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {memberData.pendingAmount > 0 ? 'Due Soon' : 'Paid'}
                </div>
              </div>
            </div>
          </Card>

          {/* Paid Amount Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-900">
                    ₹{bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + ((b.amount || 0) + (b.lateFee || 0)), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700 font-medium">Paid This Year</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-800 font-medium">Performance</div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Excellent
                </div>
              </div>
            </div>
          </Card>

          {/* Next Due Date Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">{memberData.nextDueDate}</div>
                  <div className="text-sm text-blue-700 font-medium">Next Due Date</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800 font-medium">Reminder</div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  15 Days
                </div>
              </div>
            </div>
          </Card>

          {/* Notices Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-0 shadow-xl hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-900">{memberData.notices.length}</div>
                  <div className="text-sm text-purple-700 font-medium">New Notices</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-purple-800 font-medium">Status</div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${
                  memberData.notices.length > 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {memberData.notices.length > 0 ? (
                    <>
                      <Zap className="w-3 h-3" />
                      Unread
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      All Read
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-8">
        <Card className="shadow-card-elegant">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">My Profile</h2>
              {!isEditingProfile ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="hover-lift">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleProfileUpdate} className="hover-lift">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)} className="hover-lift">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                {isEditingProfile ? (
                  <Input
                    id="fullName"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                    placeholder="Enter your full name"
                    className="mt-2"
                  />
                ) : (
                  <p className="text-lg font-medium mt-2">{profileForm.fullName || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditingProfile ? (
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    placeholder="Enter your phone number"
                    className="mt-2"
                  />
                ) : (
                  <p className="text-lg font-medium mt-2">{profileForm.phone || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="flatNumber">Flat Number</Label>
                <p className="text-lg font-medium mt-2">{profileForm.flatNumber || 'Not set'}</p>
                <p className="text-sm text-muted-foreground mt-1">Contact admin to change flat number</p>
              </div>
            </div>
            <div className="mt-6">
              <Label>Email</Label>
              <p className="text-lg font-medium mt-2">{userEmail}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Bills */}
          <Card className="shadow-card-elegant">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Current Bills</h2>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "Redirecting to all bills..." })}>
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            <div className="p-6">
              <div className="space-y-4">
                {memberData.currentBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-smooth">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{bill.month}</h3>
                        <p className="text-sm text-muted-foreground">Due: {bill.dueDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{bill.amount.toLocaleString()}</p>
                      {bill.status === 'pending' && (
                        <Button
                          size="sm"
                          className="mt-2 bg-gradient-primary"
                          onClick={() => setPaymentDialog({ open: true, bill })}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pay Now
                        </Button>
                      )}
                      {bill.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setReceiptDialog({ open: true, bill })}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Notices */}
          <Card className="shadow-card-elegant">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Recent Notices</h2>
                <Badge variant="destructive">{unreadCount} Unread</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {memberData.notices.map((notice) => (
                  <div key={notice.id} className="flex items-start gap-3 p-4 rounded-xl hover:bg-muted/50 transition-smooth cursor-pointer" onClick={() => handleNoticeClick(notice.id)}>
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{notice.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{notice.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {notice.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>


      {/* Payment History */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Card className="shadow-card-elegant">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Recent Payment History</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {memberData.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-success rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{payment.month}</h3>
                      <p className="text-sm text-muted-foreground">Paid on {payment.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-success">{payment.receipt}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReceiptDialog({ open: true, bill: bills.find(b => b.id === payment.id) })}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      View Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog({ open, bill: null })}>
        <DialogContent className="max-w-sm sm:max-w-md p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            {receiptDialog.bill && (
              <BillReceipt
                bill={receiptDialog.bill}
                member={{
                  fullName: userData?.fullName || userEmail.split('@')[0],
                  flatNumber: userData?.flatNumber || 'Not set'
                }}
                societyName={societySettings.societyName || 'Society'}
                onClose={() => setReceiptDialog({ open: false, bill: null })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ open, bill: null })}
        bill={paymentDialog.bill}
        memberId={uid || ''}
        memberEmail={userEmail}
        onPaymentSuccess={() => {
          // Bills will update via listener
          setPaymentDialog({ open: false, bill: null });
        }}
      />
    </div>
    </>
  );
};
