import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SocietySettings {
  societyName: string;
  address: string;
  maintenanceFee: number;
  lateFee: number;
  dueDay: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentGateway: string;
}

const defaultSettings: SocietySettings = {
  societyName: 'Green Valley Society',
  address: '',
  maintenanceFee: 2500,
  lateFee: 100,
  dueDay: 15,
  emailNotifications: true,
  smsNotifications: false,
  paymentGateway: 'Razorpay'
};

export const useSocietySettings = () => {
  const [settings, setSettings] = useState<SocietySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'society');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            societyName: data.societyName || defaultSettings.societyName,
            address: data.address || defaultSettings.address,
            maintenanceFee: data.maintenanceFee || defaultSettings.maintenanceFee,
            lateFee: data.lateFee || defaultSettings.lateFee,
            dueDay: data.dueDay || defaultSettings.dueDay,
            emailNotifications: data.emailNotifications ?? defaultSettings.emailNotifications,
            smsNotifications: data.smsNotifications ?? defaultSettings.smsNotifications,
            paymentGateway: data.paymentGateway || defaultSettings.paymentGateway
          });
        }
      } catch (error) {
        console.error('Error loading society settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Real-time listener
    const unsubscribe = onSnapshot(doc(db, 'settings', 'society'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          societyName: data.societyName || defaultSettings.societyName,
          address: data.address || defaultSettings.address,
          maintenanceFee: data.maintenanceFee || defaultSettings.maintenanceFee,
          lateFee: data.lateFee || defaultSettings.lateFee,
          dueDay: data.dueDay || defaultSettings.dueDay,
          emailNotifications: data.emailNotifications ?? defaultSettings.emailNotifications,
          smsNotifications: data.smsNotifications ?? defaultSettings.smsNotifications,
          paymentGateway: data.paymentGateway || defaultSettings.paymentGateway
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { settings, loading };
};