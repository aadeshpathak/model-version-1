import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Download,
  Send
} from 'lucide-react';
import { getMembers, getAllBills, generateMonthlyBills, updateBill, addNotice, type User as Member, type Bill } from '@/lib/firestoreServices';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export const BillManagement = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const { toast } = useToast();

  const [generateForm, setGenerateForm] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    amount: '2500',
    target: 'all',
    selectedMember: ''
  });

  useEffect(() => {
    const unsubscribeMembers = getMembers((users) => {
      setMembers(users.filter(u => u.approved));
    });
    const unsubscribeBills = getAllBills(setBills);

    // Load settings for default amount
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'society');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGenerateForm(prev => ({ ...prev, amount: data.maintenanceFee?.toString() || '2500' }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();

    return () => {
      unsubscribeMembers();
      unsubscribeBills();
    };
  }, []);

  // Get member name by ID
  const getMemberById = (memberId: string): Member | undefined => {
    return members.find(m => m.id === memberId);
  };

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const member = getMemberById(bill.memberId);
    const memberName = member?.fullName || '';
    const flatNumber = member?.flatNumber || '';

    const matchesSearch = memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (bill.month || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || (bill.month || '') === monthFilter;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const handleGenerateBills = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!generateForm.amount || parseFloat(generateForm.amount) <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }

      const monthName = months[parseInt(generateForm.month) - 1];
      const amount = parseFloat(generateForm.amount);
      const target = generateForm.target === 'all' ? 'all' : [generateForm.selectedMember];
      await generateMonthlyBills(monthName, parseInt(generateForm.year), target, amount);

      toast({
        title: "Bills Generated",
        description: `Bills of ₹${amount} have been generated for all approved members for ${monthName} ${generateForm.year}.`,
      });

      setIsGenerateDialogOpen(false);
      setGenerateForm({ month: (new Date().getMonth() + 1).toString(), year: new Date().getFullYear().toString(), amount: '2500', target: 'all', selectedMember: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while generating bills.",
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (billId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    try {
      await updateBill(billId, {
        status: 'paid',
        paidDate: today,
        paymentMethod: 'Manual',
        receiptNumber
      });

      toast({
        title: "Payment Recorded",
        description: "Bill has been marked as paid successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bill status.",
        variant: "destructive",
      });
    }
  };

  const markAsUnpaid = async (billId: string) => {
    try {
      await updateBill(billId, {
        status: 'pending',
        paidDate: null,
        paymentMethod: null,
        receiptNumber: null
      });

      toast({
        title: "Bill Updated",
        description: "Bill has been marked as unpaid.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bill status.",
        variant: "destructive",
      });
    }
  };

  const addLateFee = async (billId: string) => {
    try {
      // Get late fee from settings
      const docRef = doc(db, 'settings', 'society');
      const docSnap = await getDoc(docRef);
      const lateFee = docSnap.exists() ? docSnap.data().lateFee || 0 : 0;

      await updateBill(billId, {
        lateFee: (await getDoc(doc(db, 'bills', billId))).data()?.lateFee || 0 + lateFee
      });

      toast({
        title: "Late Fee Added",
        description: `Late fee of ₹${lateFee} has been added to the bill.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add late fee.",
        variant: "destructive",
      });
    }
  };

  const sendReminder = async (bill: Bill) => {
    try {
      const member = getMemberById(bill.memberId);
      if (!member) return;

      await addNotice({
        title: `Payment Reminder: ${bill.month} ${bill.year}`,
        message: `Dear ${member.fullName}, your maintenance bill of ₹${bill.amount + (bill.lateFee || 0)} for ${bill.month} ${bill.year} is due on ${bill.dueDate?.toDate().toLocaleDateString()}. Please pay on time to avoid late fees.`,
        target: [member.id],
        sentBy: 'admin',
        sentAt: Timestamp.now()
      });

      toast({
        title: "Reminder Sent",
        description: `Payment reminder sent to ${member.fullName}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-danger" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'overdue': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  // Calculate stats
  const stats = {
    total: filteredBills.length,
    paid: filteredBills.filter(b => b.status === 'paid').length,
    pending: filteredBills.filter(b => b.status === 'pending').length,
    overdue: filteredBills.filter(b => b.status === 'overdue').length,
    totalAmount: filteredBills.reduce((sum, bill) => sum + bill.amount + (bill.lateFee || 0), 0),
    collectedAmount: filteredBills.filter(b => b.status === 'paid').reduce((sum, bill) => sum + bill.amount + (bill.lateFee || 0), 0)
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bill Management</h1>
          <p className="text-muted-foreground">Generate and manage maintenance bills</p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Generate Bills
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Monthly Bills</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerateBills} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select value={generateForm.month} onValueChange={(value) => setGenerateForm({...generateForm, month: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>
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
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm({...generateForm, year: e.target.value})}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="target">Generate for</Label>
                <Select value={generateForm.target} onValueChange={(value) => setGenerateForm({...generateForm, target: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="specific">Specific Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {generateForm.target === 'specific' && (
                <div>
                  <Label htmlFor="member">Select Member</Label>
                  <Select value={generateForm.selectedMember} onValueChange={(value) => setGenerateForm({...generateForm, selectedMember: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName} (Flat {member.flatNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="amount">Bill Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={generateForm.amount}
                  onChange={(e) => setGenerateForm({...generateForm, amount: e.target.value})}
                  placeholder="2500"
                  min="1"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-primary">
                  Generate Bills
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bills</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-success rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-success">{stats.paid}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-danger rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-danger">{stats.overdue}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Collection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Collection Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Billed</span>
              <span className="font-semibold">₹{stats.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Collected</span>
              <span className="font-semibold text-success">₹{stats.collectedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-semibold text-danger">₹{(stats.totalAmount - stats.collectedAmount).toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="font-semibold">Collection Rate</span>
                <span className="font-bold text-primary">
                  {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Send className="w-4 h-4 mr-2" />
              Send Payment Reminders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Bills Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              View Defaulters List
            </Button>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by member name, flat number, or month..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
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
        </div>
      </Card>

      {/* Bills List */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Bills List ({filteredBills.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {filteredBills.map((bill) => {
            const member = getMemberById(bill.memberId);
            return (
              <div key={bill.id} className="p-6 hover:bg-muted/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold">{member?.fullName?.charAt(0) || '?'}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{member?.fullName || 'Unknown Member'}</h3>
                        <Badge className={getStatusColor(bill.status)}>
                          {getStatusIcon(bill.status)}
                          <span className="ml-1 capitalize">{bill.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Flat {member?.flatNumber}</span>
                        <span>{bill.month || 'N/A'} {bill.year || ''}</span>
                        <span>Due: {bill.dueDate?.toDate().toLocaleDateString()}</span>
                        {bill.paidDate && <span>Paid: {new Date(bill.paidDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-xl">₹{(bill.amount + (bill.lateFee || 0)).toLocaleString()}</p>
                      {bill.lateFee && bill.lateFee > 0 && (
                        <p className="text-xs text-orange-600">+₹{bill.lateFee} late fee</p>
                      )}
                      {bill.receiptNumber && (
                        <p className="text-xs text-muted-foreground">{bill.receiptNumber}</p>
                      )}
                    </div>
                    {bill.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="bg-gradient-success"
                        onClick={() => markAsPaid(bill.id)}
                      >
                        Mark Paid
                      </Button>
                    )}
                    {bill.status === 'paid' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markAsUnpaid(bill.id)}>
                          Unpaid
                        </Button>
                      </div>
                    )}
                    {bill.status !== 'paid' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => addLateFee(bill.id)}>
                          +Late Fee
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendReminder(bill)}>
                          Reminder
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredBills.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No bills found</h3>
            <p className="text-muted-foreground">No bills match your current search criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};