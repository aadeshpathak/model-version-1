import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateBill } from '@/lib/firestoreServices';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CreditCard, IndianRupee, Smartphone } from 'lucide-react';
import type { Bill } from '@/lib/firestoreServices';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  memberId: string;
  memberEmail: string;
  onPaymentSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentDialog = ({ open, onOpenChange, bill, memberId, memberEmail, onPaymentSuccess }: PaymentDialogProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!bill) return null;

  const baseAmount = bill.amount || 0;
  const lateFee = bill.lateFee || 0;
  const totalAmount = baseAmount + lateFee;

  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      await updateBill(bill.id, {
        status: 'paid',
        paidDate: today,
        paymentMethod: 'Cash',
        receiptNumber,
        transactionId: `CASH_${Date.now()}`
      });

      // Save transaction in member's data
      const transaction = {
        id: `TXN_CASH_${Date.now()}`,
        billId: bill.id,
        amount: totalAmount,
        method: 'Cash',
        mode: 'Cash Payment',
        date: today,
        receiptNumber,
        status: 'success'
      };

      // Update member's payments array
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        payments: arrayUnion(transaction)
      });

      toast({
        title: "Payment Successful!",
        description: `Bill paid via Cash. Receipt: ${receiptNumber}`,
        variant: "default"
      });

      onPaymentSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Cash payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process cash payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlinePayment = () => {
    if (!window.Razorpay) {
      toast({
        title: "Payment Gateway Not Available",
        description: "Razorpay is not loaded. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: totalAmount * 100, // Razorpay expects amount in paisa
      currency: 'INR',
      name: 'Society Management',
      description: `Bill Payment - ${bill.month || 'Monthly Bill'}`,
      order_id: undefined, // For now, using direct payment
      method: 'upi', // Restrict to UPI only
      handler: async (response: any) => {
        // Payment successful
        const today = new Date().toISOString().split('T')[0];
        const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

        try {
          // First update the basic bill status
          await updateBill(bill.id, {
            status: 'paid',
            paidDate: today,
            paymentMethod: 'UPI',
            receiptNumber,
            transactionId: response.razorpay_payment_id
          });

          // Then try to update transaction details separately (if this fails, basic payment still works)
          try {
            const transactionData: any = {
              transactionPaymentId: response.razorpay_payment_id,
              transactionAmount: totalAmount
            };

            if (response.razorpay_order_id) transactionData.transactionOrderId = response.razorpay_order_id;
            if (response.razorpay_signature) transactionData.transactionSignature = response.razorpay_signature;
            if (response.method) transactionData.transactionMethod = response.method;
            if (response.bank) transactionData.transactionBank = response.bank;
            if (response.wallet) transactionData.transactionWallet = response.wallet;
            if (response.vpa) transactionData.transactionVpa = response.vpa;

            await updateBill(bill.id, transactionData);
          } catch (transactionError) {
            console.warn('Failed to save transaction details, but payment was successful:', transactionError);
            // Payment is still successful even if transaction details fail to save
          }

          // Save transaction details
          const transaction = {
            id: response.razorpay_payment_id,
            billId: bill.id,
            amount: totalAmount,
            method: 'UPI',
            mode: 'UPI Payment',
            bank: response.bank || 'UPI',
            date: today,
            receiptNumber,
            status: 'success',
            razorpayDetails: response
          };

          const userRef = doc(db, 'users', memberId);
          await updateDoc(userRef, {
            payments: arrayUnion(transaction)
          });

          toast({
            title: "Payment Successful!",
            description: `Bill paid via UPI. Receipt: ${receiptNumber}`,
            variant: "default"
          });

          onPaymentSuccess();
          onOpenChange(false);
        } catch (error) {
          console.error('UPI payment update error:', error);
          toast({
            title: "Payment Update Failed",
            description: "Payment was successful but failed to update records. Contact admin.",
            variant: "destructive"
          });
        }
      },
      prefill: {
        email: memberEmail,
        contact: '' // Could add phone if available
      },
      theme: {
        color: '#3b82f6'
      },
      modal: {
        ondismiss: () => {
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the UPI payment process.",
            variant: "default"
          });
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay Bill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Details */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Bill Amount:</span>
              <span className="font-bold">₹{baseAmount.toLocaleString()}</span>
            </div>
            {lateFee > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-red-600">Late Fee:</span>
                <span className="text-sm font-bold text-red-600">₹{lateFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-bold">Total Amount:</span>
              <span className="font-bold text-lg">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="mt-2">
              <Badge variant={bill.status === 'overdue' ? 'destructive' : 'secondary'}>
                {bill.status === 'overdue' ? 'Overdue' : 'Pending'}
              </Badge>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            <Button
              onClick={handleCashPayment}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Pay Cash'}
            </Button>

            <Button
              onClick={handleOnlinePayment}
              variant="outline"
              className="w-full border-blue-200 hover:bg-blue-50"
              size="lg"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Pay Online (UPI)
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Online payments are processed securely via Razorpay
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};