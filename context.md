# Society Management App Context

## Current Setup
- **Tech Stack**: React (TypeScript), Vite, shadcn/ui, Tailwind CSS, Firebase (Auth + Firestore), Framer Motion, Razorpay (Test Mode).
- **Auth**: Firebase Email/Password. Role-based (admin/member) with approval workflow.
- **Database**: Firestore with collections: users (role, approved, dismissed, bannedUntil, fullName, phone, flatNumber, lastLogin, payments), bills (status, payment tracking, lateFee), expenses, notices (target, readBy).
- **Real-time**: onSnapshot for live data sync across all components with instant updates.
- **Mobile Responsive**: Complete mobile-first refactoring with dedicated mobile components, bottom navigation, header with hamburger menu, neumorphism-style cards, and app-like UX.
- **UI Enhancements**: Advanced animations, hover effects, gradient shifts, smooth transitions, professional styling, and mobile-optimized typography.
- **Payment Gateway**: Razorpay test mode integration with Cash/Online payment options, transaction tracking, late fee calculation, and receipt generation.
- **Recent Updates**: Full mobile UI overhaul with separate mobile layouts, charts responsiveness, safe area padding, touch-friendly interactions, enhanced expense management with real-time editing, year filtering, advanced category operations, AI insights integration, comprehensive Import Dataset feature with Firebase integration, smart categorization, multi-month bill creation, progress tracking, and complete payment gateway implementation with Razorpay test mode.
- **Files Modified**:
  - src/components/LoginForm.tsx: Dual-mode login ("Login" vs "Request to Join") with approval workflow and mobile variant.
  - src/lib/firebase.ts: Firebase config with environment variables.
  - src/context/UserContext.tsx: Enhanced state management with real-time approval/dismissal tracking.
  - src/lib/firestoreServices.ts: Complete CRUD operations with real-time listeners, added updateExpense and deleteExpense functions, added payments field to User interface.
  - src/components/admin/MembersManagement.tsx: Member management with approve/dismiss functionality.
  - src/components/AdminDashboard.tsx: Reorganized dashboard with square action cards, live stats, mobile view, reports tab with visualizations dropdown, functional settings save button, responsive notices page, and logout in hamburger menu.
  - src/components/admin/BillManagement.tsx: Bill generation and management (target removed, sends to all).
  - src/components/admin/ExpenseManagement.tsx: Real-time expense tracking with advanced filtering (search, category, month, year), category-wise editing/deletion with month-specific operations, functional year dropdown (2020-current year), comprehensive Import Dataset feature with smart categorization, multi-month bill creation, progress bars, and mobile-responsive import/delete functionality.
  - src/components/admin/SocietySettings.tsx: Admin settings with password update functionality.
  - src/components/Navigation.tsx: Responsive navigation (desktop sidebar + mobile bottom navbar + hamburger menu), removed AI Insights from admin menu.
  - src/pages/Index.tsx: Main router with mobile-responsive layout, approval flow, and properly sized receipt dialogs.
  - src/components/MemberDashboard.tsx: Real data dashboard with payment processing, profile management, mobile view, and integrated PaymentDialog.
  - src/components/PendingApproval.tsx: Enhanced approval waiting page with real-time status updates.
  - src/components/mobile/MobileLayout.tsx: Mobile app wrapper with safe area padding.
  - src/components/mobile/MobileBottomNav.tsx: Bottom navigation for mobile with 5 tabs, removed AI Insights from member navigation.
  - src/components/mobile/MobileHeader.tsx: Simplified top header for mobile (hamburger menu removed).
  - src/components/ui/MobileCard.tsx: Neumorphism-style cards for mobile.
  - src/index.css: Custom CSS utilities for animations, mobile responsiveness, and enhanced styling.
  - src/App.css: Mobile-specific overflow-x hidden rules.
  - src/components/admin/FinancialReports.tsx: Fixed mobile reports visualizations to respect applied period filters, ensuring all charts and metrics update according to selected time period.
  - src/components/Navigation.tsx: Added Brain icon import and AI insights menu item to admin menu, integrated into desktop sidebar navigation and mobile bottom navbar (5 main tabs with horizontal scroll support), with hamburger menu for remaining items.
  - src/pages/Index.tsx: Added MLInsights component import and routing for 'aiInsights' view in admin dashboard, including title handling for mobile header.
  - src/context/UserContext.tsx: Added unreadNoticesCount state and setUnreadNoticesCount function for tracking unread notices.
  - src/components/MemberDashboard.tsx: Implemented unread notices count display and read tracking functionality with click-to-mark-as-read.
  - src/components/mobile/MobileBottomNav.tsx: Added red badge on notices tab showing unread count.
  - src/lib/ml-utils.ts: Created comprehensive machine learning utilities including data preprocessing, expense forecasting, anomaly detection, payment behavior analysis, budget recommendations, and member engagement scoring.
  - src/lib/ml-insights.ts: Implemented ML insights service layer that integrates ML algorithms with existing Firebase data streams.
  - src/lib/ml-advanced.ts: Advanced TensorFlow.js integration with neural networks, autoencoders, time series decomposition, and deep learning models for enhanced prediction accuracy.
  - src/hooks/use-ml-insights.ts: Created React hook for ML insights integration with automatic data processing and real-time updates.
  - src/components/admin/MLInsights.tsx: Enhanced ML-powered analytics dashboard with 12 functional real-time ML components including expense forecasting, anomaly detection, member engagement analysis, payment behavior tracking, maintenance predictions, seasonal trends, cost analysis, risk assessment, ML configuration, real-time metrics, and predictive analytics.
  - src/components/AdminDashboard.tsx: Added "AI Insights" tab to admin dashboard for accessing ML-powered analytics.
  - server.js: Express.js server with Multer file upload, CSV/Excel/JSON parsing, Zod validation, Firebase integration, and comprehensive error handling for Import Dataset feature.
  - index.html: Added Razorpay checkout script for payment gateway integration.
  - .env: Added Razorpay test API keys (VITE_RAZORPAY_KEY_ID and VITE_RAZORPAY_KEY_SECRET).
  - src/components/PaymentDialog.tsx: New component for payment processing with Cash/Online options, Razorpay integration, late fee calculation, and transaction storage.
- **UI Features**: Mobile-responsive design, smooth animations, professional styling, no horizontal scroll, touch-friendly interface, neumorphism cards, bottom navigation, advanced filtering with year dropdown, real-time expense editing.

## What's Working
- **Authentication**: Login as admin (admin@gmail.com / admin@1234) or member. New members use "Request to Join" with approval workflow.
- **Role-based Access**: Admin and member dashboards with appropriate permissions and real-time updates.
- **Mobile Responsive**: Professional mobile-first design with adaptive navigation (sidebar → navbar), hamburger menu, and touch-optimized interface.
- **Real-time Updates**: All data syncs instantly across the app (members, bills, notices, expenses) with live notifications.
- **Enhanced UI**: Smooth animations, hover effects, gradient transitions, and professional styling throughout.
- **Admin Features**:
  - Dashboard with live stats (members, collections, expenses) and reorganized square action cards.
  - Members Management: Approve/dismiss new requests, manage existing members with real-time updates.
  - Bills Management: Generate bills for all members, track payments, mark as paid with success notifications.
  - Notices Management: Send announcements to all or specific members.
  - Expense Management: Real-time expense tracking with advanced filtering (search, category, month, year), category-wise editing/deletion with month-specific operations, functional year dropdown (2020-current year), and comprehensive Import Dataset feature with smart categorization, multi-month bill creation, and progress tracking.
  - Financial Reports: Generate comprehensive reports with visualizations dropdown and month filtering.
  - **Import Dataset Feature**: Complete data import system supporting CSV, Excel, and JSON files with Firebase integration, smart categorization, dual import (bills + expenses), multi-month support, progress bars, and mobile responsiveness.
  - **Enhanced AI-Powered Analytics** (12 Functional ML Components):
    - **Expense Forecasting**: Real-time prediction with confidence scoring and trend analysis
    - **Anomaly Detection**: Live anomaly identification with severity scoring and detailed breakdowns
    - **Smart Budgeting**: AI-driven budget recommendations with efficiency scoring and savings opportunities
    - **Member Engagement**: Multi-factor engagement analysis with visual progress indicators
    - **Payment Behavior**: Risk assessment dashboard with reliability tracking and early warning system
    - **Maintenance Predictions**: Predictive scheduling with cost forecasting and budget recommendations
    - **Seasonal Trends**: Visual analysis of expense patterns across different time periods
    - **Cost Trend Analysis**: Long-term trend identification with actionable insights
    - **Risk Assessment**: High-risk member identification with intervention recommendations
    - **ML Configuration**: Interactive parameter tuning for forecasting and anomaly detection
    - **Real-time Metrics**: Live dashboard with key performance indicators
    - **Predictive Analytics**: Comprehensive forecasting for expenses and maintenance schedules
- **Member Features**:
  - Dashboard with personal bills, notices, expenses, and profile management.
  - **Payment Gateway**: Complete Razorpay test mode integration with Cash/Online payment options.
  - **Pay Now Dialog**: Opens payment dialog with Cash (instant) and Online (UPI) options.
  - **Late Fee Calculation**: Automatic inclusion of late fees in bill amounts.
  - **Transaction Tracking**: Saves detailed payment information in member profiles.
  - **Receipt Generation**: Automatic receipt creation with transaction details.
  - Real-time bill and notice updates.
  - Profile editing with success confirmations.
- **Approval Workflow**: New members request to join → Real-time pending screen → Admin approves/dismisses → Instant member notifications.
- **Mobile Experience**: Bottom navigation bar, slide-up hamburger menu, no horizontal scroll, professional app-like interface.

## Issues & Fixes in History
- **Syntax Error in LoginForm.tsx**: Fixed missing closing div tags causing "Unexpected eof" error.
- Symphony errors from undefined fields (fixed with null checks).
- White pages on click: Fixed by adding null checks and proper state initialization.
- Layout distortion: Fixed by using standard Tailwind classes (bg-blue-500 instead of custom 'gradient-primary').
- Import/export errors: Fixed by adding missing imports (lucide-react icons, arrayUnion).
- Timestamp issues: Used Timestamp.now() for bans, fixed client-side date handling.
- Payment failed toast showing instead of success: Fixed with proper success/error handling and user feedback.
- Profile update showing error toast: Fixed with proper success confirmation messages.
- Target option in bill generation: Removed to simplify workflow (bills now send to all members).
- Admin dashboard layout: Reorganized with better visual hierarchy (stats → action cards → charts → expenses).
- Mobile responsiveness: Implemented professional mobile design with sidebar-to-navbar conversion.
- Navigation issues: Added responsive navigation with hamburger menu and bottom navbar for mobile.
- UI animations and styling: Enhanced with smooth transitions, hover effects, and professional styling.
- Real-time approval updates: Implemented instant notifications for member approval/dismissal status.
- **LoginForm.tsx Card Structure**: Fixed improper JSX structure with missing closing div tags.
- **Mobile Admin Dashboard Issues**: Fixed multiple mobile view issues including blurred dropdowns, missing functionality, and responsive layout problems.
- **Bills Dropdown Blur**: Replaced problematic dropdown menus with modal dialogs to ensure proper visibility on mobile.
- **Reports Tab Functionality**: Added functional visualizations dropdown with month/type filtering in mobile reports tab.
- **Settings Save Button**: Connected save settings functionality in mobile financial settings.
- **Notices Page Layout**: Improved responsive layout and added actual notice management content for mobile.
- **Navigation Improvements**: Added logout to bottom hamburger menu and removed redundant top hamburger.
- **Expense Management Enhancements**: Added real-time expense editing with month-specific operations, year filtering dropdown (2020-current), and advanced category management with conditional edit/delete based on filter selections.
- **Mobile Reports Visualizations Filter Issue**: Fixed visualizations in mobile reports not updating according to applied period filters. Modified calculateMetrics to filter bills and expenses by selected period before calculating chart data and metrics, ensuring expense categories, payment status, and revenue charts respect the selected time period (6 months, 12 months, or specific month).
- **Unread Notices Badge**: Added red-colored unread notices count badge on the notices tab in member dashboard for all device views. Implemented read tracking with readBy array in notices, and count updates dynamically when notices are marked as read by clicking on them.
- **Enhanced AI Insights Dashboard**: Completely redesigned AI Insights page with 12 functional real-time ML components:
  - **Expense Forecasting**: Real-time expense prediction with confidence levels and trend indicators
  - **Anomaly Detection**: Live anomaly detection with scoring and detailed expense analysis
  - **Smart Budgeting**: AI-powered budget recommendations with efficiency scoring and savings opportunities
  - **Member Engagement**: Multi-factor engagement scoring with visual progress indicators
  - **Payment Behavior Analysis**: Risk assessment and payment reliability tracking
  - **Maintenance Predictions**: Predictive maintenance scheduling with cost forecasting
  - **Seasonal Trends**: Visual analysis of seasonal expense patterns
  - **Cost Trend Analysis**: Long-term cost trend identification (increasing/decreasing/stable)
  - **Risk Assessment**: High-risk member identification with reliability scoring
  - **ML Configuration**: Interactive ML parameter settings for forecasting and anomaly detection
  - **Real-time Metrics**: Live dashboard metrics with category counts and engagement levels
  - **Predictive Analytics**: Comprehensive predictive insights for expenses and maintenance
  - **Interactive UI**: Uses existing CSS styling with gradient cards, progress bars, and responsive design
- **Import Dataset Feature**: Comprehensive data import system with Firebase integration:
  - **Multi-Format Support**: CSV, Excel (.xlsx/.xls), and JSON file imports
  - **Smart Categorization**: Fuzzy matching for expense categories (electricity, security, water, maintenance, cleaning, garbage, staff, other)
  - **Dual Import System**: Creates both bills AND expenses for complete financial tracking
  - **Multi-Month Support**: Handles datasets spanning multiple months with per-month bill calculation
  - **Progress Tracking**: Real-time progress bars for both import and delete operations
  - **Mobile Responsive**: Full import functionality available on both desktop and mobile devices
  - **Data Validation**: Zod schema validation with comprehensive error handling
  - **Batch Tracking**: Import batch IDs for data management and deletion
  - **Status Options**: Mark imported data as "paid" (increments collections) or "pending" (future bills)
  - **Server-Side Processing**: Express.js backend with Multer file upload and Firebase integration
  - **Visual Feedback**: Progress bars, success/error states, and imported data badges
  - **Complete Cleanup**: Delete imported data from both bills and expenses collections

## Your Actions Taken
- Enabled Firebase Auth (Email/Password) with user registration and approval workflow.
- Created Firestore database in test mode with collections: users, bills, expenses, notices.
- Added admin user in Authentication (admin@gmail.com / admin@1234).
- Added admin document in Firestore users collection with role 'admin', approved: true.
- Implemented real-time listeners for instant data synchronization.
- Built responsive mobile-first design with professional UI/UX.
- Added comprehensive error handling and user feedback systems.
- (Indexes created automatically by Firestore as needed for queries).

## Pending
- **Payment Gateway**: Currently in Razorpay test mode - will be switched to live mode soon.
- Advanced reporting features (currently has interface, needs backend implementation).
- Email/SMS notifications (currently in-app only).
- File upload for receipts/documents.
- Advanced member analytics and insights.

## Next Steps
1. Run `npm run dev` to start the development server.
2. **Test Admin Login**: Use admin@gmail.com / admin@1234 to access admin dashboard.
3. **Test Mobile Responsiveness**: Resize browser or use mobile device to see responsive design.
4. **Test Member Registration**: Click "Request to Join" tab, create new member account.
5. **Test Approval Workflow**: As admin, go to Members → Pending Members → Approve the new member.
6. **Test Real-time Updates**: Notice instant updates when approval status changes.
7. **Test Mobile Navigation**: On mobile, use bottom navbar and hamburger menu for navigation.
8. **Test Payment Gateway**: As a member, click "Pay Now" on pending bills, test both Cash and Online (UPI) payment options, verify transaction details in receipts.
9. **Test Enhanced ML Features**: As admin, go to "AI Insights" tab to see 12 comprehensive ML-powered analytics including expense forecasting, anomaly detection, member engagement analysis, payment behavior tracking, maintenance predictions, and smart budgeting recommendations.
10. **Test Import Dataset Feature**: As admin, go to Expense Management → Import Dataset to upload CSV/Excel/JSON files, test smart categorization, multi-month bill creation, progress bars, and delete functionality on both desktop and mobile.

## Installation Instructions for First-Time Setup

If you're cloning this repository from GitHub for the first time, follow these steps to set up and run the application locally:

### Prerequisites
- **Node.js**: Version 18.0.0 or higher (recommended: 20.x LTS)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version` and `npm --version`
- **Git**: For cloning the repository
  - Download from: https://git-scm.com/
- **Code Editor**: VS Code recommended with TypeScript and React extensions

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/aadeshpathak/model-version-1.git
   cd model-version-1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   This will install all required packages including React, Vite, Firebase, Tailwind CSS, shadcn/ui, Framer Motion, etc.

3. **Set Up Firebase Project**
   - Go to https://console.firebase.google.com/
   - Create a new project (or use existing)
   - Enable Authentication with Email/Password provider
   - Enable Firestore Database
   - Go to Project Settings > General > Your apps > Add Web App
   - Copy the Firebase config object

4. **Create Environment Variables**
   - Create a `.env` file in the root directory
   - Add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

5. **Set Up Firestore Security Rules**
   - In Firebase Console > Firestore Database > Rules
   - Replace with the content from `firestore.rules` in the project

6. **Create Admin User**
   - In Firebase Console > Authentication > Users
   - Add user: admin@gmail.com with password: admin@1234
   - In Firestore > users collection, add document with ID matching the admin's UID:
   ```json
   {
     "email": "admin@gmail.com",
     "role": "admin",
     "approved": true,
     "dismissed": false,
     "createdAt": "current_timestamp"
   }
   ```

7. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Server will start on http://localhost:5173 (default Vite port)
   - Open in browser and test with admin@gmail.com / admin@1234

### Troubleshooting Common Issues

- **Port 5173 already in use**: Change port with `npm run dev -- --port 3000`
- **Firebase connection errors**: Check .env file and Firebase project settings
- **Build errors**: Ensure Node.js version is 18+ and run `npm install` again
- **TypeScript errors**: Install VS Code TypeScript extension
- **Mobile testing**: Use browser dev tools or ngrok for mobile device testing

### Required Dependencies (Auto-installed via npm install)
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19
- Firebase 12.3.0
- Tailwind CSS 3.4.17
- shadcn/ui components
- Framer Motion 12.23.22
- Lucide React icons
- React Router DOM 6.30.1
- React Hook Form 7.61.1
- TanStack Query 5.83.0
- Recharts 2.15.4
- Chart.js 4.5.0
- **Razorpay**: Payment gateway integration (checkout.js loaded via CDN)
- **ML Libraries**:
  - TensorFlow.js (@tensorflow/tfjs) - Browser-based machine learning
  - TensorFlow.js Visualization (@tensorflow/tfjs-vis) - ML model visualization
  - ML Matrix (ml-matrix) - Matrix operations for ML algorithms
  - Simple Statistics (simple-statistics) - Statistical functions
  - D3 Time Format (d3-time-format) - Time series data formatting
  - Brain.js (brain.js) - Neural network library
- **Server Libraries** (for Import Dataset feature):
  - Express.js - Web server framework
  - Multer - File upload middleware
  - CSV Parser - CSV file processing
  - XLSX - Excel file processing
  - Zod - Data validation and schema definition
  - CORS - Cross-origin resource sharing
  - UUID - Unique identifier generation

## Current Status
The app is fully functional with professional UI/UX, complete mobile refactoring, real-time updates, complete approval workflow, and **Razorpay test mode payment gateway integration**. All syntax errors have been resolved and the development server runs successfully. Desktop views remain unchanged while mobile has been completely redesigned with modern app-like interface. Payment gateway is currently in test mode with full Cash/Online payment functionality - will be switched to live mode soon.
