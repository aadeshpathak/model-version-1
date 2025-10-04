import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BillReceiptProps {
  bill: {
    id: string;
    month?: string;
    year?: number;
    amount: number;
    lateFee?: number;
    receiptNumber?: string;
    paidDate?: string;
    status: string;
    paymentMethod?: string;
    transactionId?: string;
    transactionPaymentId?: string;
    transactionOrderId?: string;
    transactionSignature?: string;
    transactionMethod?: string;
    transactionBank?: string;
    transactionWallet?: string;
    transactionVpa?: string;
    transactionAmount?: number;
  };
  member: {
    fullName: string;
    flatNumber: string;
  };
  societyName: string;
  onClose?: () => void;
}

declare global {
  interface Window {
    html2pdf: any;
  }
}

export const BillReceipt: React.FC<BillReceiptProps> = ({ bill, member, societyName, onClose }) => {
  const handleDownloadPDF = () => {
    const element = document.getElementById('receipt-content');
    if (element && window.html2pdf) {
      const opt = {
        margin: 1,
        filename: `receipt-${bill.receiptNumber || bill.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(element).save();
    }
  };

  const lineItems = [
    { description: 'Maintenance Fee', amount: bill.amount - (bill.lateFee || 0) },
    ...(bill.lateFee && bill.lateFee > 0 ? [{ description: 'Late Fee', amount: bill.lateFee }] : [])
  ];

  const totalAmount = bill.amount + (bill.lateFee || 0);

  return (
    <div className="max-w-md mx-auto">
      {/* Action Buttons */}
      <div className="mb-4 flex gap-3 justify-center">
        <Button
          onClick={handleDownloadPDF}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg"
        >
          📄 Download
        </Button>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="px-4 py-2 rounded-lg font-medium border-gray-300 hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        )}
      </div>

      {/* Receipt Content */}
      <div
        id="receipt-content"
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 font-sans text-sm"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center border-b border-gray-300 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{societyName}</h1>
          <p className="text-gray-600 text-sm">Society Management System</p>
          <p className="text-gray-500 text-xs mt-1">Payment Receipt</p>
        </div>

        {/* Receipt Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Receipt No:</span>
            <span className="text-gray-900">{bill.receiptNumber || `RC${bill.id.slice(-6).toUpperCase()}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Member Name:</span>
            <span className="text-gray-900">{member.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Flat Number:</span>
            <span className="text-gray-900">{member.flatNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Billing Period:</span>
            <span className="text-gray-900">{bill.month || 'N/A'} {bill.year || ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Payment Date:</span>
            <span className="text-gray-900">
              {bill.paidDate ? new Date(bill.paidDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Payment Mode:</span>
            <span className="text-gray-900">{bill.paymentMethod || 'Cash'}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="border-t border-gray-300 pt-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-center">Payment Details</h3>
          <div className="space-y-2">
            {lineItems.map((item, index) => (
              <div key={index} className="flex justify-between py-1">
                <span className="text-gray-700">{item.description}</span>
                <span className="text-gray-900 font-medium">₹{item.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Details for Online Payments */}
        {(bill.paymentMethod === 'UPI' || bill.paymentMethod === 'Online') && bill.transactionId && (
          <div className="border-t border-gray-300 pt-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-center">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Transaction ID:</span>
                <span className="text-gray-900 font-mono text-xs">{bill.transactionId}</span>
              </div>
              {bill.transactionOrderId && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Order ID:</span>
                  <span className="text-gray-900 font-mono text-xs">{bill.transactionOrderId}</span>
                </div>
              )}
              {bill.transactionMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Payment Method:</span>
                  <span className="text-gray-900">{bill.transactionMethod}</span>
                </div>
              )}
              {bill.transactionBank && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Bank:</span>
                  <span className="text-gray-900">{bill.transactionBank}</span>
                </div>
              )}
              {bill.transactionWallet && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Wallet:</span>
                  <span className="text-gray-900">{bill.transactionWallet}</span>
                </div>
              )}
              {bill.transactionVpa && (
                <div className="flex justify-between">
                  <span className="text-gray-700">UPI ID:</span>
                  <span className="text-gray-900 font-mono text-xs">{bill.transactionVpa}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="border-t-2 border-gray-400 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">Total Amount:</span>
            <span className="text-xl font-bold text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-gray-300">
          <p className="text-gray-600 italic">Thank you for your payment.</p>
          <p className="text-xs text-gray-500 mt-2">This is a computer-generated receipt.</p>
        </div>
      </div>
    </div>
  );
};