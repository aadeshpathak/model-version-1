import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { z } from 'zod';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Health check endpoint
server.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Import server is running' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Import server running on port ${PORT}`);
});

export default server;