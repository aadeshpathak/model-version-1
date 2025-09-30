import { useUser } from '@/context/UserContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMemberBills, getMemberNotices, updateBill, addNotice, markNoticeAsRead, type Bill, type Notice } from '@/lib/firestoreServices';
import { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
            <div className="p-6">
              <h1 className="text-2xl font-bold">My Bills</h1>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                {bills.map((bill: Bill) => (
                  <div key={bill.id} className="flex justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{bill.month || 'N/A'} {bill.year || ''}</h3>
                      <p>Due: {bill.dueDate?.toDate().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p>₹{(bill.amount + (bill.lateFee || 0)).toLocaleString()}</p>
                      {bill.lateFee && bill.lateFee > 0 && (
                        <p className="text-xs text-orange-600">+₹{bill.lateFee} late fee</p>
                      )}
                      <Badge variant={bill.status === 'paid' ? "default" : "destructive"}>{bill.status}</Badge>
                      {bill.status !== 'paid' && (
                        <Button
                          size="sm"
                          className="mt-2 bg-gradient-primary"
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
                              // Create notice for admin
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
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      } else if (currentView === 'payments') {
        return (
          <div className="space-y-6">
            <div className="p-6">
              <h1 className="text-2xl font-bold">Payment History</h1>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                {bills
                  .filter(b => b.status === 'paid')
                  .map((bill: Bill) => (
                    <div key={bill.id} className="flex justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{bill.month || 'N/A'} {bill.year || ''}</h3>
                        <p>Paid</p>
                      </div>
                      <div className="text-right">
                        <p>₹{(bill.amount + (bill.lateFee || 0)).toLocaleString()}</p>
                        {bill.lateFee && bill.lateFee > 0 && (
                          <p className="text-xs text-orange-600">+₹{bill.lateFee} late fee</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        );
      } else if (currentView === 'notices') {

        return (
          <div className="space-y-6">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 rounded-3xl text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">📢 Society Notices</h1>
                  <p className="text-blue-100 text-lg">Stay updated with the latest announcements</p>
                </div>
                <div className="hidden md:block">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold">{notices.length}</div>
                    <div className="text-sm text-blue-100">Total Notices</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xl">📋</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Notices</p>
                    <p className="text-2xl font-bold text-blue-900">{notices.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Enhanced Notices List */}
            <div className="space-y-4">
              {notices.length > 0 ? notices.map((notice: Notice) => (
                <Card key={notice.id} className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-r from-white to-blue-50 shadow-lg ring-2 ring-blue-100">
                  <div className="p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-muted-foreground">
                          {notice.sentAt?.toDate().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-gray-900">
                        {notice.title}
                      </h3>
                      <p className="text-base leading-relaxed text-gray-800">
                        {notice.message}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📅 Sent by: {notice.sentBy}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )) : (
                <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📭</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Notices Yet</h3>
                  <p className="text-gray-500">You'll see important announcements and updates here when they're posted.</p>
                </Card>
              )}
            </div>
          </div>
        );
      } else if (currentView === 'profile') {
        return <MemberProfile />;
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
