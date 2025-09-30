import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllExpenses, getSocietyStats } from '@/lib/firestoreServices';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface SocietySettingsData {
  societyName: string;
  address: string;
  maintenanceFee: number;
  lateFee: number;
  dueDay: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentGateway: string;
}

export const SocietySettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SocietySettingsData>({
    societyName: 'Green Valley Society',
    address: '',
    maintenanceFee: 2500,
    lateFee: 100,
    dueDay: 15,
    emailNotifications: true,
    smsNotifications: false,
    paymentGateway: 'Razorpay'
  });
  const [loading, setLoading] = useState(false);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeMembers, setActiveMembers] = useState(0);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load settings from Firestore on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'society');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            societyName: data.societyName || 'Green Valley Society',
            address: data.address || '',
            maintenanceFee: data.maintenanceFee || 2500,
            lateFee: data.lateFee || 100,
            dueDay: data.dueDay || 15,
            emailNotifications: data.emailNotifications ?? true,
            smsNotifications: data.smsNotifications ?? false,
            paymentGateway: data.paymentGateway || 'Razorpay'
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();

    // Set up real-time listener for settings changes
    const unsubscribe = onSnapshot(doc(db, 'settings', 'society'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          societyName: data.societyName || 'Green Valley Society',
          address: data.address || '',
          maintenanceFee: data.maintenanceFee || 2500,
          lateFee: data.lateFee || 100,
          dueDay: data.dueDay || 15,
          emailNotifications: data.emailNotifications ?? true,
          smsNotifications: data.smsNotifications ?? false,
          paymentGateway: data.paymentGateway || 'Razorpay'
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = getSocietyStats((stats) => {
      setActiveMembers(stats.activeMembers || 0);
    });
    return unsubscribe;
  }, []);


  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'society');
      await setDoc(docRef, {
        ...settings,
        lastUpdated: new Date().toISOString()
      });

      setIsEditingGeneral(false);
      toast({
        title: "✅ General Information Saved",
        description: "Society name and address have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "❌ Save Failed",
        description: error.message || "Unable to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
      const selectedMonthName = monthNames[parseInt(selectedMonth) - 1];
      const filteredExpenses = expenses.filter(expense =>
        expense.month === selectedMonthName && parseInt(expense.year) === parseInt(selectedYear)
      );

      if (filteredExpenses.length === 0) {
        toast({
          title: "No Expenses Found",
          description: `No expenses found for ${selectedMonthName}/${selectedYear}.`,
          variant: "destructive",
        });
        return;
      }

      const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Divide by active members (excluding admins)
      const calculatedFee = activeMembers > 0 ? Math.round((totalExpenses / activeMembers) * 100) / 100 : 0;

      setSettings({ ...settings, maintenanceFee: calculatedFee });

      toast({
        title: "Maintenance Fee Calculated",
        description: `Calculated ₹${calculatedFee} per member based on ${selectedMonthName}/${selectedYear} expenses divided by ${activeMembers} members.`,
      });
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate maintenance fee.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async () => {
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

      toast({ title: "Password Updated", description: "Admin password has been changed successfully." });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password.", variant: "destructive" });
    }
  };

  const saveAllSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'society');
      await setDoc(docRef, {
        ...settings,
        lastUpdated: new Date().toISOString()
      });

      toast({
        title: "✅ All Settings Saved",
        description: "All society settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "❌ Save Failed",
        description: error.message || "Unable to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-hero p-6 rounded-2xl text-white shadow-primary">
        <h1 className="text-2xl font-bold">Society Settings</h1>
        <p className="text-white/80 mt-1">Configure society information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">General Information</h2>
            {!isEditingGeneral ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditingGeneral(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditingGeneral(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveGeneralSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="societyName">Society Name</Label>
              {isEditingGeneral ? (
                <Input
                  id="societyName"
                  value={settings.societyName}
                  onChange={(e) => setSettings({...settings, societyName: e.target.value})}
                  placeholder="Enter society name"
                  className="mt-2"
                />
              ) : (
                <p className="text-lg font-medium mt-2">{settings.societyName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              {isEditingGeneral ? (
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  placeholder="Enter society address"
                  className="mt-2"
                />
              ) : (
                <p className="text-lg font-medium mt-2">{settings.address || 'Not set'}</p>
              )}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="w-full border-red-300 hover:bg-red-50 text-red-600"
              >
                🔒 Update Password
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Financial Settings</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="selectedMonth">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
                <Label htmlFor="selectedYear">Year</Label>
                <Input
                  id="selectedYear"
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="maintenanceFee">Monthly Maintenance Fee (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="maintenanceFee"
                  type="number"
                  value={settings.maintenanceFee}
                  onChange={(e) => setSettings({...settings, maintenanceFee: parseFloat(e.target.value) || 0})}
                  placeholder="2500"
                />
                <Button type="button" variant="outline" onClick={calculateMaintenanceFee}>
                  Calculate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Calculate" to set fee based on selected month's expenses
              </p>
            </div>
            <div>
              <Label htmlFor="lateFee">Late Payment Fee (₹)</Label>
              <Input
                id="lateFee"
                type="number"
                value={settings.lateFee}
                onChange={(e) => setSettings({...settings, lateFee: parseFloat(e.target.value) || 0})}
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="dueDay">Due Day of Month</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={settings.dueDay}
                onChange={(e) => setSettings({...settings, dueDay: parseInt(e.target.value) || 15})}
                placeholder="15"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
              <Switch
                id="smsNotifications"
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Payment Gateway</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentGateway">Payment Provider</Label>
              <Input
                id="paymentGateway"
                value={settings.paymentGateway}
                onChange={(e) => setSettings({...settings, paymentGateway: e.target.value})}
                placeholder="Razorpay, Stripe, etc."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Configure your payment gateway settings for bill payments.</p>
              <p>Future: Integration with {settings.paymentGateway} for seamless payments.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAllSettings} disabled={loading} className="bg-gradient-primary">
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Password Update Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Update your admin password</p>

            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdatePassword} className="flex-1">
                Update Password
              </Button>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};