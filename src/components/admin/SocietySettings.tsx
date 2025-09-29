import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Financial Settings</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="maintenanceFee">Monthly Maintenance Fee (₹)</Label>
              <Input
                id="maintenanceFee"
                type="number"
                value={settings.maintenanceFee}
                onChange={(e) => setSettings({...settings, maintenanceFee: parseFloat(e.target.value) || 0})}
                placeholder="2500"
              />
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
    </div>
  );
};