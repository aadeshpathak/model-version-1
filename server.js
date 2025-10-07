import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { z } from 'zod';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (hardcoded for server)
const firebaseConfig = {
  apiKey: "AIzaSyCwrDjn6ip4LDgnmKN2WuEyRaONuiGskDk",
  authDomain: "my-society-app-1100.firebaseapp.com",
  projectId: "my-society-app-1100",
  storageBucket: "my-society-app-1100.firebasestorage.app",
  messagingSenderId: "452166557157",
  appId: "1:452166557157:web:b53bbba8dd7970b290e30c",
  measurementId: "G-ML88GKEYMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Express
const server = express();
server.use(cors());
server.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'), false);
    }
  }
});

// Validation schema - removed category restriction to allow any category
const expenseSchema = z.object({
  expense_category: z.string().min(1, 'Expense category is required'),
  amount: z.number().positive('Amount must be positive'),
  month: z.string().min(1, 'Month is required'),
  year: z.number().int().min(2020).max(2030, 'Year must be between 2020 and 2030')
});

// Predefined categories for reference (not enforced)
const predefinedCategories = [
  'electricity', 'security', 'water', 'maintenance', 'cleaning',
  'garbage', 'staff', 'other'
];

// Helper function to parse CSV
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Helper function to parse Excel
const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

// Helper function to parse JSON
const parseJSON = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
};

// Helper function to validate and transform data
const validateAndTransformData = (data) => {
  const validRecords = [];
  const errors = [];

  data.forEach((record, index) => {
    try {
      // Map different field names to standard schema
      const transformedRecord = {
        expense_category: record.expense_category || record.category || record.Expense_Category || record.Category,
        amount: parseFloat(record.amount || record.Amount || record.expense_amount || record.Expense_Amount || 0),
        month: record.month || record.Month || record.expense_month || record.Expense_Month,
        year: parseInt(record.year || record.Year || record.expense_year || record.Expense_Year || new Date().getFullYear())
      };

      // Validate the record
      const validatedRecord = expenseSchema.parse(transformedRecord);
      validRecords.push(validatedRecord);
    } catch (error) {
      errors.push({
        row: index + 1,
        error: error.errors?.[0]?.message || error.message
      });
    }
  });

  return { validRecords, errors };
};

// Import dataset endpoint
server.post('/api/import-dataset', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { status = 'paid' } = req.body; // Default to 'paid' if not specified

    const filePath = req.file.path;
    let rawData = [];

    // Parse file based on type
    try {
      if (req.file.originalname.endsWith('.csv')) {
        rawData = await parseCSV(filePath);
      } else if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
        rawData = parseExcel(filePath);
      } else if (req.file.originalname.endsWith('.json')) {
        rawData = parseJSON(filePath);
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse file. Please ensure the file format is correct.'
      });
    }

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data found in file'
      });
    }

    // Validate and transform data
    const { validRecords, errors } = validateAndTransformData(rawData);

    if (validRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid records found in file',
        details: errors
      });
    }

    // Check for duplicates and save to Firestore
    let inserted = 0;
    let skipped = 0;
    const importBatchId = `import_${Date.now()}`;

    // Process records in batches to avoid overwhelming Firestore
    const batchSize = 10;
    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      const batchPromises = batch.map(async (record) => {
        try {
          // Minimal data structure to test Firebase connection
          const expenseData = {
            category: String(record.expense_category || 'other'),
            amount: Number(record.amount) || 0,
            month: String(record.month || 'January'),
            year: Number(record.year) || new Date().getFullYear(),
            vendor: 'Imported Dataset',
            description: `Imported from ${req.file.originalname}`,
            target: 'all',
            status: status || 'paid',
            isImported: true,
            importBatchId: importBatchId
          };

          await addDoc(collection(db, 'expenses'), expenseData);
          return { success: true };
        } catch (error) {
          console.error('Error processing record:', error, record);
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Count results - all successful inserts are counted
      batchResults.forEach(result => {
        if (result.success) {
          inserted++;
        }
        // Errors are logged but don't increment counters
      });

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Import completed. ${inserted} records inserted, ${skipped} duplicates skipped.`,
      inserted,
      skipped,
      importBatchId: inserted > 0 ? importBatchId : null,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import error:', error);

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during import'
    });
  }
});


// Frinext check status endpoint
server.post('/api/frinext/check-status', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log('Checking Frinext payment status for order:', orderId);

    // Import frinext service (we'll need to make it work server-side)
    const frinextApiToken = '9f8bece0a67e98e7ccf71778e60cf43f';
    const frinextBaseUrl = 'https://frinext.com/api';

    const payload = new URLSearchParams({
      user_token: frinextApiToken,
      order_id: orderId
    });

    const response = await fetch(`${frinextBaseUrl}/check-order-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Frinext API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Frinext status response:', result);

    // If payment is completed, process it
    // Check both overall status and transaction status
    if ((result.status === 'COMPLETED' || result.status === 'SUCCESS') &&
        (result.result?.txnStatus === 'SUCCESS' || result.result?.status === 'SUCCESS' ||
         result.result?.txnStatus === 'COMPLETED' || result.result?.status === 'COMPLETED')) {
      // Extract bill ID from order ID (format: BILL_{billId}_{timestamp}_{random})
      const orderParts = orderId.split('_');
      if (orderParts.length >= 2 && orderParts[0] === 'BILL') {
        const billId = orderParts[1];

        // Get bill details
        const billRef = doc(db, 'bills', billId);
        const billSnap = await getDoc(billRef);

        if (billSnap.exists()) {
          const billData = billSnap.data();

          // Check if bill is already paid
          if (billData.status !== 'paid') {
            const today = new Date().toISOString().split('T')[0];
            const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

            // Update bill status
            await updateDoc(billRef, {
              status: 'paid',
              paidDate: today,
              paymentMethod: 'UPI',
              receiptNumber,
              transactionId: result.result?.utr || result.result?.transactionId || orderId,
              frinextDetails: {
                orderId,
                status: result.status,
                amount: parseFloat(result.result?.amount || '0'),
                transactionId: result.result?.utr || result.result?.transactionId || null,
                date: result.result?.date,
                processedAt: new Date().toISOString()
              }
            });

            // Find member and add transaction to their payments array
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('email', '==', billData.memberEmail));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              const transaction = {
                id: `TXN_FRINEXT_${Date.now()}`,
                billId: billId,
                amount: parseFloat(result.result?.amount || '0'),
                method: 'UPI',
                mode: 'UPI Payment via Frinext',
                bank: 'UPI',
                date: today,
                receiptNumber,
                status: 'success',
                frinextDetails: {
                  orderId,
                  transactionId: result.result?.utr,
                  date: result.result?.date
                }
              };

              await updateDoc(userDoc.ref, {
                payments: arrayUnion(transaction)
              });
            }

            console.log('Frinext payment processed successfully via polling:', {
              billId,
              orderId,
              transactionId: result.result?.utr,
              amount: result.result?.amount
            });
          }
        }
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Frinext check status error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Frinext create order endpoint (server-side API call to avoid CORS)
server.post('/api/frinext/create-order', async (req, res) => {
  console.log('Frinext create order called:', req.body);
  try {
    const { amount, orderId, customerMobile, redirectUrl, remark1, remark2 } = req.body;

    if (!amount || !orderId || !customerMobile || !redirectUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Import frinext service (we'll need to make it work server-side)
    const frinextApiToken = '9f8bece0a67e98e7ccf71778e60cf43f';
    const frinextBaseUrl = 'https://frinext.com/api';

    const payload = new URLSearchParams({
      customer_mobile: customerMobile,
      user_token: frinextApiToken,
      amount: amount.toString(),
      order_id: orderId,
      redirect_url: redirectUrl,
      ...(remark1 && { remark1 }),
      ...(remark2 && { remark2 })
    });

    const response = await fetch(`${frinextBaseUrl}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Frinext API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.json(result);

  } catch (error) {
    console.error('Frinext create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


// Frinext webhook endpoint for payment confirmations
server.post('/api/webhook/frinext', async (req, res) => {
  try {
    console.log('=== FRINEXT WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Raw body:', req.rawBody || 'Not available');

    // Frinext webhook payload structure (based on documentation)
    const {
      orderId,
      status,
      amount,
      transactionId,
      paymentMethod,
      customerDetails
    } = req.body;

    if (!orderId || !status) {
      console.error('Missing required fields in Frinext webhook');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract bill ID from order ID (format: BILL_{billId}_{timestamp}_{random})
    const orderParts = orderId.split('_');
    if (orderParts.length < 3 || orderParts[0] !== 'BILL') {
      console.error('Invalid order ID format:', orderId);
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const billId = orderParts[1];

    // Get bill details
    const billRef = doc(db, 'bills', billId);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) {
      console.error('Bill not found:', billId);
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billData = billSnap.data();

    // Check if bill is already paid
    if (billData.status === 'paid') {
      console.log('Bill already paid:', billId);
      return res.status(200).json({ message: 'Bill already processed' });
    }

    // Process successful payment
    // Check both webhook status and ensure it's actually completed
    if ((status === 'COMPLETED' || status === 'SUCCESS') &&
        (!req.body.txnStatus || req.body.txnStatus === 'SUCCESS' || req.body.txnStatus === 'COMPLETED')) {
      const today = new Date().toISOString().split('T')[0];
      const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // Update bill status
      await updateDoc(billRef, {
        status: 'paid',
        paidDate: today,
        paymentMethod: 'UPI',
        receiptNumber,
        transactionId: transactionId || orderId,
        frinextDetails: {
          orderId,
          status,
          amount: parseFloat(amount),
          transactionId: transactionId || null,
          paymentMethod,
          customerDetails,
          processedAt: new Date().toISOString()
        }
      });

      // Find member and add transaction to their payments array
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', billData.memberEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const transaction = {
          id: `TXN_FRINEXT_${Date.now()}`,
          billId: billId,
          amount: parseFloat(amount),
          method: 'UPI',
          mode: 'UPI Payment via Frinext',
          bank: paymentMethod || 'UPI',
          date: today,
          receiptNumber,
          status: 'success',
          frinextDetails: {
            orderId,
            transactionId,
            paymentMethod,
            customerDetails
          }
        };

        await updateDoc(userDoc.ref, {
          payments: arrayUnion(transaction)
        });
      }

      console.log('Frinext payment processed successfully:', {
        billId,
        orderId,
        transactionId,
        amount
      });
    } else {
      console.log('Frinext payment not completed:', { orderId, status });
    }

    // Return 200 OK to acknowledge receipt
    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Frinext webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint for Frinext integration
server.post('/api/test/frinext-webhook', async (req, res) => {
  try {
    console.log('Frinext test webhook received:', req.body);

    // Simulate webhook processing
    const testResponse = {
      message: 'Frinext webhook test successful',
      received: req.body,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(testResponse);
  } catch (error) {
    console.error('Frinext test webhook error:', error);
    res.status(500).json({ error: 'Test webhook failed' });
  }
});

// Manual webhook test endpoint
server.post('/api/test/process-frinext-payment', async (req, res) => {
  try {
    const { orderId, status, amount, transactionId } = req.body;

    console.log('Manual Frinext payment processing:', { orderId, status, amount, transactionId });

    // Extract bill ID from order ID (format: BILL_{billId}_{timestamp}_{random})
    const orderParts = orderId.split('_');
    if (orderParts.length < 3 || orderParts[0] !== 'BILL') {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const billId = orderParts[1];

    // Get bill details
    const billRef = doc(db, 'bills', billId);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billData = billSnap.data();

    // Check if bill is already paid
    if (billData.status === 'paid') {
      return res.status(200).json({ message: 'Bill already processed' });
    }

    // Process successful payment
    // Check both status and transaction status for completion
    if ((status === 'COMPLETED' || status === 'SUCCESS') &&
        (!req.body.txnStatus || req.body.txnStatus === 'SUCCESS' || req.body.txnStatus === 'COMPLETED')) {
      const today = new Date().toISOString().split('T')[0];
      const receiptNumber = `RC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // Update bill status
      await updateDoc(billRef, {
        status: 'paid',
        paidDate: today,
        paymentMethod: 'UPI',
        receiptNumber,
        transactionId: transactionId || orderId,
        frinextDetails: {
          orderId,
          status,
          amount: parseFloat(amount),
          transactionId: transactionId || null,
          processedAt: new Date().toISOString()
        }
      });

      // Find member and add transaction to their payments array
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', billData.memberEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const transaction = {
          id: `TXN_FRINEXT_${Date.now()}`,
          billId: billId,
          amount: parseFloat(amount),
          method: 'UPI',
          mode: 'UPI Payment via Frinext',
          bank: 'UPI',
          date: today,
          receiptNumber,
          status: 'success',
          frinextDetails: {
            orderId,
            transactionId,
            paymentMethod: 'UPI'
          }
        };

        await updateDoc(userDoc.ref, {
          payments: arrayUnion(transaction)
        });
      }

      console.log('Frinext payment processed successfully:', {
        billId,
        orderId,
        transactionId,
        amount
      });

      res.status(200).json({
        message: 'Payment processed successfully',
        billId,
        orderId,
        amount
      });
    } else {
      res.status(200).json({ message: 'Payment not completed', status });
    }

  } catch (error) {
    console.error('Manual payment processing error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Health check endpoint
server.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Import server is running' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Import server running on port ${PORT}`);
});

export default server;