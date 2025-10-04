import { useUser } from '@/context/UserContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getMemberBills, getMemberNotices, updateBill, addNotice, markNoticeAsRead, type Bill, type Notice } from '@/lib/firestoreServices';
import { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useSocietySettings } from '@/hooks/use-society-settings';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { BillReceipt } from '@/components/BillReceipt';
import { LoginForm } from '@/components/LoginForm';
import { Navigation } from '@/components/Navigation';
import { MobileNavbar } from '@/components/MobileNavbar';
import { MemberDashboard } from '@/components/MemberDashboard';
import { MemberProfile } from '@/components/MemberProfile';
import { AdminDashboard } from '@/components/AdminDashboard';
import { PendingApproval } from '@/components/PendingApproval';
import { MembersManagement } from '@/components/admin/MembersManagement';
import { BillManagement } from '@/components/admin/BillManagement';
import { ExpenseManagement } from '@/components/admin/ExpenseManagement';
import { FinancialReports } from '@/components/admin/FinancialReports';
import { SocietySettings } from '@/components/admin/SocietySettings';
import { NoticesManagement } from '@/components/admin/NoticesManagement';
import { MLInsights } from '@/components/admin/MLInsights';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';

type UserType = 'member' | 'admin' | null;

// Session Timeout Warning Component
const SessionTimeoutWarning = () => {
  const { currentUser, handleLogout } = useUser();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem('society_app_last_activity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity);
        const now = Date.now();
        const timeSinceActivity = now - lastActivityTime;
        const timeLeftMs = 20 * 60 * 1000 - timeSinceActivity; // 20 minutes

        if (timeLeftMs <= 5 * 60 * 1000 && timeLeftMs > 0) { // Show warning in last 5 minutes
          setShowWarning(true);
          setTimeLeft(Math.ceil(timeLeftMs / 1000 / 60)); // minutes
        } else if (timeLeftMs <= 0) {
          handleLogout();
        } else {
          setShowWarning(false);
        }
      }
    };

    const interval = setInterval(checkTimeout, 30000); // Check every 30 seconds
    checkTimeout(); // Check immediately

    return () => clearInterval(interval);
  }, [currentUser, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="p-4 bg-yellow-50 border-yellow-200 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">⏰</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-800">Session Expiring</h4>
            <p className="text-sm text-yellow-700">
              Your session will expire in {timeLeft} minute{timeLeft !== 1 ? 's' : ''}.
              Please save your work.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              localStorage.setItem('society_app_last_activity', Date.now().toString());
              setShowWarning(false);
            }}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Stay Logged In
          </Button>
        </div>
      </Card>
    </div>
  );
};

const Index = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings: societySettings } = useSocietySettings();
  const {
    currentUser,
    currentView,
    userEmail,
    memberName,
    approved,
    uid,
    userData,
    isInitializing,
    updateUserData,
    handleLogin,
    handleLogout,
    setCurrentView
  } = useUser();

  const [bills, setBills] = useState<Bill[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [markedNotices, setMarkedNotices] = useState<Set<string>>(new Set());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: '',
    flatNumber: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    bill: Bill | null;
  }>({ open: false, bill: null });

  // Mark notices as read when current view is notices
  useEffect(() => {
    if (currentView === 'notices') {
      notices.forEach(notice => {
        if (!notice.readBy?.includes(uid) && !markedNotices.has(notice.id)) {
          markNoticeAsRead(notice.id, uid);
          setMarkedNotices(prev => new Set(prev).add(notice.id));
        }
      });
    }
  }, [currentView, notices, uid, markedNotices]);

  useEffect(() => {
    if (uid) {
      const unsubscribeBills = getMemberBills(uid, setBills);
      const unsubscribeNotices = getMemberNotices(uid, setNotices);
      return () => {
        unsubscribeBills();
        unsubscribeNotices();
      };
    }
  }, [uid]);

  useEffect(() => {
    if (userData) {
      setProfileForm({
        phone: userData.phone || '',
        flatNumber: userData.flatNumber || ''
      });
    }
  }, [userData]);

  const handleSaveProfile = async () => {
    try {
      await updateUserData(profileForm);
      setIsEditingProfile(false);
      toast({ title: "Profile Updated", description: "Your profile has been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("User not authenticated");

      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password.", variant: "destructive" });
    }
  };

  const getMemberName = () => memberName;

  const getTitle = () => {
    if (currentUser === 'admin') {
      switch (currentView) {
        case 'dashboard': return 'Admin Dashboard';
        case 'members': return 'Members';
        case 'bills': return 'Bills';
        case 'expenses': return 'Expenses';
        case 'notices': return 'Notices';
        case 'reports': return 'Reports';
        case 'aiInsights': return 'AI Insights';
        case 'settings': return 'Settings';
        default: return 'Admin Dashboard';
      }
    } else {
      switch (currentView) {
        case 'dashboard': return 'Dashboard';
        case 'myBills': return 'My Bills';
        case 'payments': return 'Payments';
        case 'notices': return 'Notices';
        case 'profile': return 'Profile';
        default: return 'Dashboard';
      }
    }
  };

  const renderView = () => {
    if (currentUser === 'admin') {
      switch (currentView) {
        case 'dashboard': return <AdminDashboard />;
        case 'members': return <MembersManagement />;
        case 'bills': return <BillManagement />;
        case 'expenses': return <ExpenseManagement />;
        case 'notices': return <NoticesManagement />;
        case 'reports': return <FinancialReports />;
        case 'aiInsights': return <MLInsights />;
        case 'settings':
          return <SocietySettings />;
        default: return <AdminDashboard />;
      }
    } else {
      // Member views - using real data

      if (currentView === 'dashboard') {
        return <MemberDashboard />;
      } else if (currentView === 'myBills') {
        return (
          <div className="space-y-6">
            {/* Modern Hero Header */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 pt-16 pb-8 rounded-b-3xl shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -top-20 -right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

              <div className="relative z-10">
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">💳</span>
                  </div>
                  <span className="text-white/90 text-sm font-medium">Your Bills</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📄</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">My Bills</h1>
                    <p className="text-blue-100 text-sm">Manage your society bills</p>
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{bills.filter(b => b.status === 'paid').length}</div>
                    <div className="text-xs text-white/80">Paid</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{bills.filter(b => b.status !== 'paid').length}</div>
                    <div className="text-xs text-white/80">Pending</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">₹{bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}</div>
                    <div className="text-xs text-white/80">Due</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <div className="px-6 space-y-4">
              {bills.length > 0 ? bills.map((bill: Bill, index) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-blue-50 shadow-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            bill.status === 'paid'
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                              : bill.status === 'overdue'
                              ? 'bg-gradient-to-br from-red-500 to-orange-500'
                              : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                          }`}>
                            <span className="text-white text-lg">
                              {bill.status === 'paid' ? '✓' : bill.status === 'overdue' ? '⚠' : '⏰'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{bill.month || 'N/A'} {bill.year || ''}</h3>
                            <p className="text-sm text-gray-600">Due: {bill.dueDate?.toDate().toLocaleDateString()}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={bill.status === 'paid' ? "default" : bill.status === 'overdue' ? "destructive" : "secondary"} className="text-xs">
                                {bill.status}
                              </Badge>
                              {bill.status === 'paid' && bill.receiptNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {bill.receiptNumber}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">₹{(bill.amount + (bill.lateFee || 0)).toLocaleString()}</p>
                          {bill.lateFee && bill.lateFee > 0 && (
                            <p className="text-xs text-orange-600">+₹{bill.lateFee} late fee</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            {bill.status === 'paid' && bill.receiptNumber && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toast({ title: "Downloading receipt...", description: `Receipt ${bill.receiptNumber}` })}
                                className="text-xs"
                              >
                                <span className="mr-1">📄</span>
                                Receipt
                              </Button>
                            )}
                            {bill.status !== 'paid' && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs"
                                onClick={async () => {
                                  try {
                                    const today = new Date().toISOString().split('T')[0];
                                    const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
                                    await updateBill(bill.id, {
                                      status: 'paid',
                                      paidDate: today,
                                      paymentMethod: 'Online',
                                      receiptNumber
                                    });
                                    await addNotice({
                                      title: `Bill Payment Received`,
                                      message: `${userEmail} has paid ₹${bill.amount} for ${bill.month} ${bill.year}. Receipt: ${receiptNumber}`,
                                      target: 'all',
                                      sentBy: 'system',
                                      sentAt: Timestamp.now()
                                    });
                                    toast({ title: "Payment Successful", description: `Bill paid successfully. Receipt: ${receiptNumber}` });
                                  } catch (error) {
                                    toast({ title: "Payment Failed", description: "Please try again.", variant: "destructive" });
                                  }
                                }}
                              >
                                <span className="mr-1">💳</span>
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📄</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Bills Yet</h3>
                  <p className="text-gray-500">Your bills will appear here when they're generated.</p>
                </motion.div>
              )}
            </div>
          </div>
        );
      } else if (currentView === 'payments') {
        const paidBills = bills.filter(b => b.status === 'paid');
        const totalPaid = paidBills.reduce((sum, b) => sum + (b.amount || 0) + (b.lateFee || 0), 0);

        return (
          <div className="space-y-6">
            {/* Modern Hero Header */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 px-6 pt-16 pb-8 rounded-b-3xl shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -top-20 -right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

              <div className="relative z-10">
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">💰</span>
                  </div>
                  <span className="text-white/90 text-sm font-medium">Payment History</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Payment History</h1>
                    <p className="text-green-100 text-sm">Your successful transactions</p>
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{paidBills.length}</div>
                    <div className="text-xs text-white/80">Payments</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">₹{(totalPaid / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-white/80">Total Paid</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{paidBills.length > 0 ? '100%' : '0%'}</div>
                    <div className="text-xs text-white/80">Success Rate</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <div className="px-6 space-y-4">
              {paidBills.length > 0 ? paidBills.map((bill: Bill, index) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-green-50 shadow-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <span className="text-white text-lg">✓</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{bill.month || 'N/A'} {bill.year || ''}</h3>
                            <p className="text-sm text-gray-600">
                              Paid on {bill.paidDate || bill.dueDate?.toDate().toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                Paid
                              </Badge>
                              {bill.receiptNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {bill.receiptNumber}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">₹{(bill.amount + (bill.lateFee || 0)).toLocaleString()}</p>
                          {bill.lateFee && bill.lateFee > 0 && (
                            <p className="text-xs text-orange-600">+₹{bill.lateFee} late fee</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReceiptDialog({ open: true, bill })}
                              className="text-xs bg-white hover:bg-green-50 border-green-200"
                            >
                              <span className="mr-1">📄</span>
                              Receipt
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💳</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Payments Yet</h3>
                  <p className="text-gray-500">Your payment history will appear here after you make payments.</p>
                </motion.div>
              )}
            </div>

            {/* Receipt Dialog */}
            <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog({ open, bill: null })}>
              <DialogContent className="max-w-lg p-0">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle>Payment Receipt</DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6">
                  {receiptDialog.bill && (
                    <BillReceipt
                      bill={receiptDialog.bill}
                      member={{
                        fullName: userData?.fullName || 'Member',
                        flatNumber: userData?.flatNumber || 'N/A'
                      }}
                      societyName={societySettings.societyName || 'Society'}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      } else if (currentView === 'notices') {
        // Sort notices by sentAt date (most recent first)
        const sortedNotices = [...notices].sort((a, b) => {
          const dateA = a.sentAt?.toDate?.() || new Date(0);
          const dateB = b.sentAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        return (
          <div className="space-y-6">
            {/* Modern Hero Header */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 pt-16 pb-8 rounded-b-3xl shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -top-20 -right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

              <div className="relative z-10">
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">📢</span>
                  </div>
                  <span className="text-white/90 text-sm font-medium">Society Notices</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Notices</h1>
                    <p className="text-blue-100 text-sm">Stay updated with announcements</p>
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{sortedNotices.length}</div>
                    <div className="text-xs text-white/80">Total</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">{sortedNotices.filter(n => !n.readBy?.includes(uid)).length}</div>
                    <div className="text-xs text-white/80">Unread</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">This Month</div>
                    <div className="text-xs text-white/80">Latest</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <div className="px-6 space-y-4">
              {sortedNotices.length > 0 ? sortedNotices.map((notice: Notice, index) => {
                const isRead = notice.readBy?.includes(uid);
                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${
                      !isRead ? 'bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-blue-200' : 'bg-gradient-to-r from-white to-gray-50'
                    }`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${!isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-gray-900 text-lg">{notice.title}</h3>
                              {!isRead && (
                                <Badge variant="default" className="text-xs bg-blue-500">New</Badge>
                              )}
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-3">{notice.message}</p>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <span>By {notice.sentBy}</span>
                                <span>•</span>
                                <span>{notice.sentAt?.toDate().toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              }) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📭</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Notices Yet</h3>
                  <p className="text-gray-500">Important announcements and updates will appear here.</p>
                </motion.div>
              )}
            </div>
          </div>
        );
      } else if (currentView === 'profile') {
        return (
          <div className="space-y-6">
            {/* Modern Hero Header */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 px-6 pt-16 pb-8 rounded-b-3xl shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -top-20 -right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

              <div className="relative z-10">
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">👤</span>
                  </div>
                  <span className="text-white/90 text-sm font-medium">My Profile</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Profile</h1>
                    <p className="text-purple-100 text-sm">Manage your information</p>
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">Active</div>
                    <div className="text-xs text-white/80">Status</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">2024</div>
                    <div className="text-xs text-white/80">Member Since</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-white text-center">
                    <div className="text-lg font-bold">Complete</div>
                    <div className="text-xs text-white/80">Profile</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <div className="px-6 space-y-6">
              {/* Profile Avatar Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4">
                    <span className="text-4xl text-white">👤</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{userData?.fullName || 'Society Member'}</h2>
                <p className="text-gray-600 text-sm">Flat {userData?.flatNumber || 'N/A'} • Active Member</p>
              </motion.div>

              {/* Profile Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-purple-50 shadow-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-xl">👤</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Personal Information</h3>
                          <p className="text-gray-600 text-sm">Your account details</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        variant="outline"
                        size="sm"
                        className="border-purple-200 hover:bg-purple-50"
                      >
                        {isEditingProfile ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <motion.div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-white">📧</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Email Address</p>
                            <p className="font-semibold text-gray-900">{userEmail}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-sm">🔒</span>
                        </div>
                      </motion.div>

                      <motion.div
                        className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                              <span className="text-white">📱</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Phone Number</p>
                              {!isEditingProfile ? (
                                <p className="font-semibold text-gray-900">{userData?.phone || 'Not provided'}</p>
                              ) : (
                                <Input
                                  value={profileForm.phone}
                                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                  placeholder="Enter phone number"
                                  className="mt-1 bg-white border-green-200 focus:border-green-400"
                                />
                              )}
                            </div>
                          </div>
                          {!isEditingProfile && (
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                            >
                              <span className="text-blue-600 text-sm">✏️</span>
                            </button>
                          )}
                        </div>
                      </motion.div>

                      <motion.div
                        className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                              <span className="text-white">🏠</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Flat Number</p>
                              {!isEditingProfile ? (
                                <p className="font-semibold text-gray-900">Flat {userData?.flatNumber || 'Not set'}</p>
                              ) : (
                                <Input
                                  value={profileForm.flatNumber}
                                  onChange={(e) => setProfileForm({...profileForm, flatNumber: e.target.value})}
                                  placeholder="e.g., A-201"
                                  className="mt-1 bg-white border-orange-200 focus:border-orange-400"
                                />
                              )}
                            </div>
                          </div>
                          {!isEditingProfile && (
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                            >
                              <span className="text-blue-600 text-sm">✏️</span>
                            </button>
                          )}
                        </div>
                      </motion.div>

                      {isEditingProfile && (
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={handleSaveProfile}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                          >
                            Save Changes
                          </Button>
                          <Button
                            onClick={() => setIsEditingProfile(false)}
                            variant="outline"
                            className="flex-1 border-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Society Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-indigo-50 shadow-lg">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">🏢</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Society Membership</h3>
                        <p className="text-gray-600 text-sm">Your society details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <motion.div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <span className="text-white">🏢</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Society Name</p>
                            <p className="font-semibold text-gray-900">{societySettings.societyName || 'Green Valley Society'}</p>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <span className="text-white">📅</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Member Since</p>
                            <p className="font-semibold text-gray-900">January 2024</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Security Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-red-50 shadow-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-xl">🔒</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Security Settings</h3>
                          <p className="text-gray-600 text-sm">Manage your password</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50"
                      >
                        {isChangingPassword ? 'Cancel' : 'Change Password'}
                      </Button>
                    </div>

                    {isChangingPassword && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                          <Input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                            placeholder="Enter current password"
                            className="bg-white border-red-200 focus:border-red-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                          <Input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                            placeholder="Enter new password"
                            className="bg-white border-red-200 focus:border-red-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                          <Input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            placeholder="Confirm new password"
                            className="bg-white border-red-200 focus:border-red-400"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={handleChangePassword}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                          >
                            Update Password
                          </Button>
                          <Button
                            onClick={() => setIsChangingPassword(false)}
                            variant="outline"
                            className="flex-1 border-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Account Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-pink-50 shadow-lg">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">📊</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Account Overview</h3>
                        <p className="text-gray-600 text-sm">Your activity summary</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold text-blue-600 mb-1">{bills.filter(b => b.status === 'paid').length}</div>
                        <div className="text-sm text-blue-700 font-medium">Bills Paid</div>
                      </motion.div>

                      <motion.div
                        className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold text-green-600 mb-1">{notices.length}</div>
                        <div className="text-sm text-green-700 font-medium">Notices</div>
                      </motion.div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-3xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentView('myBills')}
                  >
                    <span className="text-3xl mb-2 block">💳</span>
                    <div className="text-sm font-semibold">View Bills</div>
                  </motion.button>
                  <motion.button
                    className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-5 rounded-3xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentView('payments')}
                  >
                    <span className="text-3xl mb-2 block">💰</span>
                    <div className="text-sm font-semibold">Payments</div>
                  </motion.button>
                  <motion.button
                    className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-5 rounded-3xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentView('notices')}
                  >
                    <span className="text-3xl mb-2 block">📢</span>
                    <div className="text-sm font-semibold">Notices</div>
                  </motion.button>
                  <motion.button
                    className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-5 rounded-3xl font-medium text-center shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLogout()}
                  >
                    <span className="text-3xl mb-2 block">🚪</span>
                    <div className="text-sm font-semibold">Logout</div>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        );
      } else {
        return <MemberDashboard />;
      }
    }
  };

  // Show loading screen while checking for existing sessions
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading...</h2>
          <p className="text-gray-500">Checking your session</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  if (!approved) {
    return <PendingApproval />;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileLayout title={getTitle()}>
        <div
          key={currentView}
          className="animate-in fade-in-50 slide-in-from-right-4 duration-500 w-full"
        >
          {renderView()}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <Navigation />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <main className="h-full overflow-auto p-3 sm:p-4 lg:p-8 pb-20 lg:pb-8 max-w-full">
          <div
            key={currentView}
            className="animate-in fade-in-50 slide-in-from-right-4 duration-500 w-full"
          >
            {renderView()}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Navigation />
      </div>

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning />
    </div>
  );
};

export default Index;
