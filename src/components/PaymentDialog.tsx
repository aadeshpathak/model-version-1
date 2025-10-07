import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateBill } from '@/lib/firestoreServices';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { frinextService } from '@/lib/frinextServices';
import { CreditCard, IndianRupee, Smartphone, Loader2, X, Clock, ExternalLink } from 'lucide-react';
import type { Bill } from '@/lib/firestoreServices';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  memberId: string;
  memberEmail: string;
  onPaymentSuccess: () => void;
}

export const PaymentDialog = ({ open, onOpenChange, bill, memberId, memberEmail, onPaymentSuccess }: PaymentDialogProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [frinextOrderData, setFrinextOrderData] = useState<any>(null);
  const [showPaymentWaiting, setShowPaymentWaiting] = useState(false);
  const [paymentTimeout, setPaymentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showPaymentWaiting && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Timeout reached
            setShowPaymentWaiting(false);
            if (paymentTimeout) {
              clearInterval(paymentTimeout);
              setPaymentTimeout(null);
            }
            toast({
              title: "Payment Timeout",
              description: "Payment session expired. Please try again.",
              variant: "destructive"
            });
            return 300; // Reset countdown
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showPaymentWaiting, countdown, paymentTimeout, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentTimeout) {
        clearInterval(paymentTimeout);
      }
    };
  }, [paymentTimeout]);

  if (!bill) return null;

  const baseAmount = bill.amount || 0;
  const lateFee = bill.lateFee || 0;
  const totalAmount = baseAmount + lateFee;

  // Function to check Frinext payment status
  const checkFrinextPaymentStatus = async (orderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/frinext/check-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        console.error('Failed to check payment status');
        return;
      }

      const result = await response.json();

      if (result.status === 'COMPLETED' || result.status === 'SUCCESS') {
        // Payment successful
        toast({
          title: "Payment Successful!",
          description: "Your bill has been paid successfully.",
          variant: "default"
        });

        // Stop polling and countdown
        if (paymentTimeout) {
          clearInterval(paymentTimeout);
          setPaymentTimeout(null);
        }

        // Close dialogs
        setShowPaymentWaiting(false);
        onOpenChange(false);

        // Trigger success callback
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Start polling for Frinext payment status
  const startFrinextPolling = (orderId: string) => {
    // Check immediately
    checkFrinextPaymentStatus(orderId);

    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkFrinextPaymentStatus(orderId);
    }, 5000);

    setPaymentTimeout(interval);
  };


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

  const handleOnlinePayment = async () => {
    if (!customerMobile.trim()) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter your mobile number for payment verification",
        variant: "destructive"
      });
      return;
    }

    if (customerMobile.length !== 10 || !/^[6-9]/.test(customerMobile)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number starting with 6-9",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting Frinext payment process:', { billId: bill.id });

      // Generate unique order ID for Frinext
      const orderId = frinextService.generateOrderId(bill.id);
      const redirectUrl = `${window.location.origin}/payment/callback?orderId=${orderId}`;

      const serverResponse = await fetch('http://localhost:3001/api/frinext/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          orderId,
          customerMobile: customerMobile.trim(),
          redirectUrl,
          remark1: `Society Bill Payment - ${bill.month || 'Monthly Bill'}`,
          remark2: `Bill ID: ${bill.id}`
        })
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        throw new Error(errorData.error || 'Server error');
      }

      const orderResponse = await serverResponse.json();

      if (orderResponse.status && orderResponse.result) {
        // Store order data
        setFrinextOrderData(orderResponse.result);

        // Start polling for payment status
        startFrinextPolling(orderId);

        // Close main dialog and show waiting screen
        onOpenChange(false);
        setShowPaymentWaiting(true);
        setCountdown(300); // 5 minutes

        toast({
          title: "Opening Payment Page",
          description: "Complete your payment on the secure Frinext page",
          variant: "default"
        });

        // Automatically open Frinext payment page in new tab
        setTimeout(() => {
          window.open(orderResponse.result.payment_url, '_blank');
        }, 1000);

      } else {
        throw new Error(orderResponse.message || 'Order creation failed');
      }
    } catch (error) {
      console.error('Frinext payment setup error:', error);
      toast({
        title: "Payment Setup Failed",
        description: error instanceof Error ? error.message : "Unable to setup payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelPayment = () => {
    // Stop polling and countdown
    if (paymentTimeout) {
      clearInterval(paymentTimeout);
      setPaymentTimeout(null);
    }

    // Reset state
    setShowPaymentWaiting(false);
    setFrinextOrderData(null);
    setCountdown(300);

    toast({
      title: "Payment Cancelled",
      description: "You can try again anytime.",
      variant: "default"
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
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
            <div className="space-y-4">
              <Button
                onClick={handleCashPayment}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <IndianRupee className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Pay Cash'}
              </Button>

              {/* Online Payment */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number (for UPI verification)</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="text-center text-lg"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Required for secure UPI payment verification
                  </p>
                </div>

                <Button
                  onClick={handleOnlinePayment}
                  disabled={isProcessing || !customerMobile.trim()}
                  variant="outline"
                  className="w-full border-blue-200 hover:bg-blue-50"
                  size="lg"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up payment...
                    </>
                  ) : (
                    'Pay Online (UPI) via Frinext'
                  )}
                </Button>
              </div>

            </div>

            <p className="text-xs text-muted-foreground text-center">
              Cash payments are processed instantly. Online payments use secure UPI gateways.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Waiting Screen */}
      <Dialog open={showPaymentWaiting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Complete Your Payment
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelPayment}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click the payment link below to open Frinext secure payment page
              </p>
            </div>

            {/* Payment Link Button - Prominent */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
              <Button
                onClick={() => {
                  if (frinextOrderData?.payment_url) {
                    window.open(frinextOrderData.payment_url, '_blank');
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 text-base"
                size="lg"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Open Frinext Payment Page
              </Button>
              <p className="text-xs text-center text-blue-600 mt-2 font-medium">
                Secure UPI Payment • ₹{totalAmount.toLocaleString()}
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-800">Time Remaining:</span>
                <span className="text-sm font-mono font-bold text-amber-700">
                  {formatTime(countdown)}
                </span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / 300) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Complete payment before timer expires
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Payment status will be checked automatically every 5 seconds
              </p>

              {/* Close Button - Positioned Below */}
              <Button
                variant="destructive"
                onClick={cancelPayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                Close & Cancel Payment
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This window will close automatically when payment is completed successfully
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};