import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  PieChart,
  RefreshCw,
  LineChart,
  BarChart3,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MobileCard from '@/components/ui/MobileCard';
import { motion } from 'framer-motion';
import {
  getSocietyStats,
  getRecentPayments,
  getAllBills,
  getRecentExpenses,
  getAllExpenses,
  getMembers
} from '@/lib/firestoreServices';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Function to convert number to words (Indian system)
const numberToWords = (num: number): string => {
  if (num === 0) return 'zero';

  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const scales = ['', 'thousand', 'lakh', 'crore'];

  const convertHundreds = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += units[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n > 9) {
      str += teens[n - 10] + ' ';
      return str.trim();
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  };

  let result = '';
  let scaleIndex = 0;
  let tempNum = num;

  // Handle crores
  if (tempNum >= 10000000) {
    const crores = Math.floor(tempNum / 10000000);
    result += convertHundreds(crores) + ' crore ';
    tempNum %= 10000000;
  }

  // Handle lakhs
  if (tempNum >= 100000) {
    const lakhs = Math.floor(tempNum / 100000);
    result += convertHundreds(lakhs) + ' lakh ';
    tempNum %= 100000;
  }

  // Handle thousands
  if (tempNum >= 1000) {
    const thousands = Math.floor(tempNum / 1000);
    result += convertHundreds(thousands) + ' thousand ';
    tempNum %= 1000;
  }

  // Handle remaining
  if (tempNum > 0) {
    result += convertHundreds(tempNum);
  }

  return result.trim();
};

export const FinancialReports = () => {
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [statsData, paymentsData, billsData, expensesData, allExpData, membersData] = await Promise.all([
        new Promise(resolve => getSocietyStats(resolve)),
        new Promise(resolve => getRecentPayments(resolve)),
        new Promise(resolve => getAllBills(resolve)),
        new Promise(resolve => getRecentExpenses(resolve)),
        new Promise(resolve => getAllExpenses(resolve)),
        new Promise(resolve => getMembers(resolve))
      ]);

      setStats(statsData);
      setRecentPayments(paymentsData as any[]);
      setRecentBills(billsData as any[]);
      setRecentExpenses(expensesData as any[]);
      setAllExpenses(allExpData as any[]);
      setMembers(membersData as any[]);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial metrics
  const calculateMetrics = () => {
    const totalRevenue = stats?.totalCollection || 0;
    const totalExpenses = stats?.totalExpenses || 0;
    const netIncome = totalRevenue - totalExpenses;
    const collectionRate = stats?.collectionRate || 0;
    const activeMembers = stats?.activeMembers || 0;
    const totalMembers = stats?.totalMembers || 0;

    // Calculate real monthly trend data from bills and expenses
    const monthlyData = calculateMonthlyTrends(selectedPeriod);

    // Expense categories breakdown
    const expenseCategories = allExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    const expenseChartData = Object.entries(expenseCategories).map(([category, amount]) => ({
      name: category,
      value: amount,
      percentage: totalExpenses > 0 ? ((Number(amount) / totalExpenses) * 100).toFixed(1) : '0'
    }));

    // Payment status breakdown
    const paymentStatusData = [
      { name: 'Paid', value: (totalRevenue / (totalRevenue + (stats?.pendingCollection || 0))) * 100, color: '#10b981' },
      { name: 'Pending', value: ((stats?.pendingCollection || 0) / (totalRevenue + (stats?.pendingCollection || 0))) * 100, color: '#f59e0b' },
      { name: 'Overdue', value: 5, color: '#ef4444' }
    ];

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      collectionRate,
      activeMembers,
      totalMembers,
      monthlyData,
      expenseChartData,
      paymentStatusData
    };
  };

  // Calculate monthly trends from real data
  const calculateMonthlyTrends = (period: string = '12months') => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const activeMembers = stats?.activeMembers || 0;

    // Helper to get short month name
    const getShortMonth = (monthStr: string) => {
      const index = fullMonthNames.indexOf(monthStr);
      return index !== -1 ? monthNames[index] : monthStr;
    };

    let months = [];
    if (period === '6months') {
      // Get last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentDate.getMonth() - i, 1);
        months.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
          fullYear: date.getFullYear()
        });
      }
    } else if (period === '12months') {
      // Get last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentDate.getMonth() - i, 1);
        months.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
          fullYear: date.getFullYear()
        });
      }
    } else if (period.startsWith('month-')) {
      // Specific month: month-Sep
      const monthName = period.split('-')[1];
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex !== -1) {
        months = [{
          month: monthName,
          year: currentYear,
          monthIndex,
          fullYear: currentYear
        }];
      }
    }

    // Calculate revenue and expenses per month from bills and expenses data
    const monthlyTrends = months.map(({ month, year, monthIndex, fullYear }) => {
      // Calculate revenue from paid bills for this month
      const monthlyRevenue = recentBills
        .filter(bill => {
          if (!bill.month || !bill.year || bill.status !== 'paid') return false;
          const billMonth = typeof bill.month === 'string' ? getShortMonth(bill.month) : monthNames[bill.month - 1];
          return billMonth === month && bill.year === fullYear;
        })
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);

      // Calculate expenses for this month
      const monthlyExpenses = allExpenses
        .filter(expense => {
          if (!expense.month || !expense.year) return false;
          const expenseMonth = typeof expense.month === 'string' ? getShortMonth(expense.month) : monthNames[expense.month - 1];
          return expenseMonth === month && expense.year === fullYear;
        })
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Estimate member count (this is approximate - in a real app you'd track member join dates)
      const memberCount = Math.max(1, Math.floor(activeMembers * (0.8 + Math.random() * 0.4))); // Random variation around active members

      return {
        month,
        revenue: monthlyRevenue / 1000, // Convert to K for display
        expenses: monthlyExpenses / 1000, // Convert to K for display
        members: memberCount
      };
    });

    // If no data, return with zeros
    if (monthlyTrends.every(m => m.revenue === 0 && m.expenses === 0)) {
      return monthlyTrends.map(item => ({
        ...item,
        revenue: 0,
        expenses: 0,
        members: activeMembers
      }));
    }

    return monthlyTrends;
  };

  const metrics = calculateMetrics();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const handleDownloadReport = () => {
    generatePDF();
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    console.log('Starting PDF generation...');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 295;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to format currency
      const formatCurrency = (amount: number) => {
        return `₹${amount.toFixed(2)}`;
      };

      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title Page
      pdf.setFontSize(24);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Financial Report', pageWidth / 2, 50, { align: 'center' });

      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Society Management System', pageWidth / 2, 70, { align: 'center' });

      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, 90, { align: 'center' });

      // Executive Summary
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 20;

      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);

      const summaryText = `This report provides a comprehensive overview of the society's financial performance for the current period.`;
      yPosition = addWrappedText(summaryText, margin, yPosition, contentWidth);
      yPosition += 10;

      // Key Metrics Section
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Key Financial Metrics', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);

      // Metrics data with proper formatting
      const metricsData = [
        { label: 'Total Revenue', value: formatCurrency(metrics.totalRevenue), color: [34, 197, 94] },
        { label: 'Total Expenses', value: formatCurrency(metrics.totalExpenses), color: [239, 68, 68] },
        { label: 'Net Income', value: formatCurrency(metrics.netIncome), color: [59, 130, 246] },
        { label: 'Collection Rate', value: `${metrics.collectionRate.toFixed(1)}%`, color: [147, 51, 234] },
        { label: 'Active Members', value: `${metrics.activeMembers}/${metrics.totalMembers}`, color: [16, 185, 129] }
      ];

      metricsData.forEach((metric) => {
        if (checkPageBreak(12)) yPosition += 5;

        pdf.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
        pdf.text(`${metric.label}:`, margin, yPosition);
        pdf.setTextColor(40, 40, 40);
        pdf.text(metric.value, margin + 70, yPosition);
        yPosition += 10;
      });

      // Monthly Trends Section
      checkPageBreak(80);
      yPosition += 15;

      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Monthly Financial Trends', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);

      // Simple table for monthly data
      const tableHeaders = ['Month', 'Revenue', 'Expenses', 'Net'];
      const tableData = metrics.monthlyData.slice(0, 6).map(month => [
        month.month,
        formatCurrency(month.revenue),
        formatCurrency(month.expenses),
        formatCurrency(month.revenue - month.expenses)
      ]);

      // Table headers
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 3, contentWidth, 8, 'F');
      pdf.setTextColor(40, 40, 40);
      tableHeaders.forEach((header, index) => {
        const xPos = margin + (index * 45);
        pdf.text(header, xPos, yPosition);
      });
      yPosition += 8;

      // Table rows
      tableData.forEach((row, rowIndex) => {
        if (checkPageBreak(8)) yPosition += 5;

        if (rowIndex % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, contentWidth, 6, 'F');
        }

        row.forEach((cell, cellIndex) => {
          const xPos = margin + (cellIndex * 45);
          pdf.text(cell, xPos, yPosition);
        });
        yPosition += 6;
      });

      // Expense Breakdown Section
      checkPageBreak(60);
      yPosition += 15;

      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Expense Categories', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);

      // Expense categories with proper formatting
      metrics.expenseChartData.slice(0, 5).forEach((category) => {
        if (checkPageBreak(10)) yPosition += 5;

        pdf.text(`${category.name}:`, margin, yPosition);
        pdf.text(`${category.percentage}%`, margin + 80, yPosition);
        pdf.text(formatCurrency(Number(category.value)), margin + 110, yPosition);
        yPosition += 8;
      });

      // Recent Expenses Section
      checkPageBreak(50);
      yPosition += 15;

      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Recent Expenses', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);

      // Recent expenses table
      recentExpenses.slice(0, 6).forEach((expense) => {
        if (checkPageBreak(8)) yPosition += 5;

        const date = expense.createdAt?.toDate().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) || 'N/A';

        pdf.text(expense.category, margin, yPosition);
        pdf.text(expense.vendor, margin + 35, yPosition);
        pdf.text(formatCurrency(expense.amount), margin + 85, yPosition);
        pdf.text(date, margin + 135, yPosition);
        yPosition += 6;
      });

      // Footer
      let pageCount = 1;
      const maxPages = 10;

      for (let i = 1; i <= maxPages; i++) {
        try {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          pdf.text('Society Management System', pageWidth / 2, pageHeight - 5, { align: 'center' });
          pageCount = i;
        } catch (e) {
          break;
        }
      }

      // Update page numbers with correct total
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      const fileName = `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      // Use blob download method
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast({
        title: "✅ PDF Generated Successfully",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "❌ PDF Generation Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrintPreview = () => {
    const element = document.getElementById('report-content');
    if (!element) {
      toast({
        title: "Error",
        description: "Report content not found.",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your popup blocker.",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Report - Print Preview</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 20px;
              color: #333;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
            }
            .print-header h1 {
              color: #1f2937;
              font-size: 28px;
              margin: 0;
            }
            .print-header p {
              color: #6b7280;
              margin: 5px 0 0 0;
            }
            .no-print {
              display: none !important;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Financial Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait a bit for content to load, then show print dialog
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast({
      title: "Print Preview Opened",
      description: "Print dialog will open automatically.",
    });
  };

  const handleShareReport = async () => {
    try {
      const reportData = {
        title: 'Financial Report',
        text: `Financial Report generated on ${new Date().toLocaleDateString()}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(reportData);
        toast({
          title: "Report Shared",
          description: "Report shared successfully.",
        });
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Report link copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Unable to share report. Link copied to clipboard instead.",
        variant: "destructive",
      });
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Report link copied to clipboard.",
        });
      } catch (clipboardError) {
        toast({
          title: "Error",
          description: "Unable to copy link. Please copy the URL manually.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
      </div>
    );
  }

  // Mobile View
  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-white overflow-x-hidden">
        <motion.div
          className="bg-white shadow-sm p-6 border-b"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600">Financial analytics</p>
        </motion.div>

        <div className="p-4 space-y-6 pb-24">
          {/* Key Metrics Cards */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{metrics.totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">Revenue</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-red-600">₹{metrics.totalExpenses.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">Expenses</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-blue-600">₹{Math.abs(metrics.netIncome).toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">{metrics.netIncome >= 0 ? 'Profit' : 'Loss'}</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.collectionRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600 mt-1">Collection</div>
            </MobileCard>
          </motion.div>

          {/* Period Selector */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="month-Jan">January</SelectItem>
                <SelectItem value="month-Feb">February</SelectItem>
                <SelectItem value="month-Mar">March</SelectItem>
                <SelectItem value="month-Apr">April</SelectItem>
                <SelectItem value="month-May">May</SelectItem>
                <SelectItem value="month-Jun">June</SelectItem>
                <SelectItem value="month-Jul">July</SelectItem>
                <SelectItem value="month-Aug">August</SelectItem>
                <SelectItem value="month-Sep">September</SelectItem>
                <SelectItem value="month-Oct">October</SelectItem>
                <SelectItem value="month-Nov">November</SelectItem>
                <SelectItem value="month-Dec">December</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Charts */}
          {metrics.monthlyData && metrics.monthlyData.length > 0 ? (
            <>
              {/* Revenue vs Expenses Chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <MobileCard>
                  <h3 className="text-lg font-semibold mb-4 text-center">Revenue vs Expenses</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value) => [`₹${value}K`, '']} />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </MobileCard>
              </motion.div>

              {/* Payment Status Chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <MobileCard>
                  <h3 className="text-lg font-semibold mb-4 text-center">Payment Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={metrics.paymentStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {metrics.paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </MobileCard>
              </motion.div>

              {/* Expense Categories Chart */}
              {metrics.expenseChartData && metrics.expenseChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <MobileCard>
                    <h3 className="text-lg font-semibold mb-4 text-center">Expense Categories</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={metrics.expenseChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {metrics.expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </MobileCard>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <MobileCard>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No chart data available</p>
                  <p className="text-sm text-gray-400 mt-1">Add financial data to see visualizations</p>
                </div>
              </MobileCard>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Button
              onClick={handleDownloadReport}
              disabled={generatingPDF}
              className="bg-blue-500 text-white py-3 rounded-2xl font-medium"
            >
              {generatingPDF ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {generatingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={loadReportData}
              disabled={loading}
              className="py-3 rounded-2xl font-medium"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden" id="report-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Financial Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Comprehensive financial insights and downloadable reports
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto no-print">
          <Button variant="outline" onClick={loadReportData} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={generatePDF} disabled={generatingPDF} className="bg-gradient-primary w-full sm:w-auto">
            {generatingPDF ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {generatingPDF ? 'Generating PDF...' : 'Download PDF Report'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-green-700">Total Revenue</p>
               <p className="text-3xl font-bold text-green-900">
                 ₹{metrics.totalRevenue.toLocaleString('en-IN')}
               </p>
               <p className="text-xs text-green-600 mt-1">
                 {numberToWords(Math.floor(metrics.totalRevenue))} rupees only
               </p>
              <p className="text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                {metrics.monthlyData.length > 1 ?
                  (() => {
                    const recent = metrics.monthlyData.slice(-2);
                    const growth = recent.length === 2 ?
                      ((recent[1].revenue - recent[0].revenue) / Math.max(1, recent[0].revenue)) * 100 : 0;
                    return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '% from last month';
                  })() : 'No trend data'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-red-700">Total Expenses</p>
               <p className="text-3xl font-bold text-red-900">
                 ₹{metrics.totalExpenses.toLocaleString('en-IN')}
               </p>
               <p className="text-xs text-red-600 mt-1">
                 {numberToWords(Math.floor(metrics.totalExpenses))} rupees only
               </p>
              <p className="text-xs text-red-600 mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                {metrics.monthlyData.length > 1 ?
                  (() => {
                    const recent = metrics.monthlyData.slice(-2);
                    const growth = recent.length === 2 ?
                      ((recent[1].expenses - recent[0].expenses) / Math.max(1, recent[0].expenses)) * 100 : 0;
                    return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '% from last month';
                  })() : 'No trend data'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-blue-700">Net Income</p>
               <p className="text-3xl font-bold text-blue-900">
                 ₹{Math.abs(metrics.netIncome).toLocaleString('en-IN')}
               </p>
               <p className="text-xs text-blue-600 mt-1">
                 {numberToWords(Math.floor(Math.abs(metrics.netIncome)))} rupees only
               </p>
              <p className="text-xs text-blue-600 mt-1">
                <Target className="w-3 h-3 inline mr-1" />
                {metrics.netIncome >= 0 ? 'Profit' : 'Loss'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Collection Rate</p>
              <p className="text-3xl font-bold text-purple-900">{metrics.collectionRate.toFixed(1)}%</p>
              <p className="text-xs text-purple-600 mt-1">
                <Users className="w-3 h-3 inline mr-1" />
                {metrics.activeMembers}/{metrics.totalMembers} active members
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="visualizations" className="text-xs sm:text-sm hidden sm:block">Visualizations</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Financial Overview</h2>
                <p className="text-gray-600">Key metrics and trends at a glance</p>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="month-Jan">January</SelectItem>
                  <SelectItem value="month-Feb">February</SelectItem>
                  <SelectItem value="month-Mar">March</SelectItem>
                  <SelectItem value="month-Apr">April</SelectItem>
                  <SelectItem value="month-May">May</SelectItem>
                  <SelectItem value="month-Jun">June</SelectItem>
                  <SelectItem value="month-Jul">July</SelectItem>
                  <SelectItem value="month-Aug">August</SelectItem>
                  <SelectItem value="month-Sep">September</SelectItem>
                  <SelectItem value="month-Oct">October</SelectItem>
                  <SelectItem value="month-Nov">November</SelectItem>
                  <SelectItem value="month-Dec">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {metrics.monthlyData && metrics.monthlyData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Expenses Trend */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Revenue vs Expenses Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}K`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="Expenses" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card>

                {/* Payment Status Distribution */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Payment Status Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={metrics.paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Member Growth Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Member Growth & Activity
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="members" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Chart Data Available</p>
                <p className="text-sm">Charts will appear once financial data is available.</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visualizations" className="space-y-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Financial Visualizations</h2>
                <p className="text-gray-600">Comprehensive charts and graphs for financial analysis</p>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="month-Jan">January</SelectItem>
                  <SelectItem value="month-Feb">February</SelectItem>
                  <SelectItem value="month-Mar">March</SelectItem>
                  <SelectItem value="month-Apr">April</SelectItem>
                  <SelectItem value="month-May">May</SelectItem>
                  <SelectItem value="month-Jun">June</SelectItem>
                  <SelectItem value="month-Jul">July</SelectItem>
                  <SelectItem value="month-Aug">August</SelectItem>
                  <SelectItem value="month-Sep">September</SelectItem>
                  <SelectItem value="month-Oct">October</SelectItem>
                  <SelectItem value="month-Nov">November</SelectItem>
                  <SelectItem value="month-Dec">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {metrics.monthlyData && metrics.monthlyData.length > 0 ? (
            <>
              {/* Revenue vs Expenses Trend */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Revenue vs Expenses Trend (6 Months)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}K`, '']} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="Expenses" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Status Distribution */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Payment Status Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={metrics.paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Expense Categories */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-red-600" />
                    Expense Categories Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={metrics.expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Member Growth Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Member Growth & Activity Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="members" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Monthly Revenue and Expenses Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Monthly Revenue Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}K`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-orange-600" />
                    Monthly Expenses Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}K`, 'Expenses']} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Visualization Data Available</h3>
                <p className="text-lg">Charts and graphs will appear once financial data is available.</p>
                <p className="text-sm mt-2">Add some bills, expenses, and member data to see visualizations.</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {metrics.monthlyData && metrics.monthlyData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Monthly Revenue Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}K`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Insights</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Highest Revenue Month</span>
                    <Badge variant="secondary">
                      {metrics.monthlyData.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, metrics.monthlyData[0])?.month || 'N/A'} (₹{Math.max(...metrics.monthlyData.map(d => d.revenue))}K)
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Average Monthly Revenue</span>
                    <Badge variant="secondary">₹{Math.round(metrics.totalRevenue / metrics.monthlyData.length).toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue Growth Rate</span>
                    <Badge variant="secondary">
                      {metrics.monthlyData.length > 1 ?
                        (() => {
                          const recent = metrics.monthlyData.slice(-2);
                          const growth = recent.length === 2 ?
                            ((recent[1].revenue - recent[0].revenue) / Math.max(1, recent[0].revenue)) * 100 : 0;
                          return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
                        })() : 'N/A'
                      }
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Revenue Data Available</p>
                <p className="text-sm">Revenue charts will appear once billing data is available.</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {metrics.expenseChartData && metrics.expenseChartData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-red-600" />
                    Expense Categories
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={metrics.expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-orange-600" />
                    Monthly Expenses Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}K`, 'Expenses']} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Recent Expenses Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Recent Expenses
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Category</th>
                        <th className="text-left p-2 font-semibold">Vendor</th>
                        <th className="text-left p-2 font-semibold">Amount</th>
                        <th className="text-left p-2 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExpenses.slice(0, 5).map((expense, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2">{expense.category}</td>
                          <td className="p-2">{expense.vendor}</td>
                          <td className="p-2 font-semibold text-red-600">₹{expense.amount.toFixed(2)}</td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {expense.createdAt?.toDate().toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Expense Data Available</p>
                <p className="text-sm">Expense charts will appear once expense data is recorded.</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h4 className="font-semibold text-green-800">Positive Trends</h4>
              </div>
              <ul className="space-y-2 text-sm text-green-700">
                <li>• Collection rate: {metrics.collectionRate.toFixed(1)}%</li>
                <li>• {metrics.activeMembers} active members</li>
                <li>• Net income: ₹{metrics.netIncome.toFixed(2)}</li>
              </ul>
            </Card>

            <Card className="p-6 border-yellow-200 bg-yellow-50">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Areas of Attention</h4>
              </div>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Total expenses: ₹{metrics.totalExpenses.toFixed(2)}</li>
                <li>• Pending collection: ₹{((stats?.totalCollection || 0) - (stats?.totalCollection || 0) * (metrics.collectionRate / 100)).toFixed(2)}</li>
                <li>• {recentBills.filter(b => b.status === 'overdue').length} overdue bills</li>
              </ul>
            </Card>

            <Card className="p-6 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-6 h-6 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Key Insights</h4>
              </div>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Revenue: ₹{metrics.totalRevenue.toFixed(2)}</li>
                <li>• {allExpenses.length} expense transactions</li>
                <li>• {recentBills.length} recent bills processed</li>
              </ul>
            </Card>
          </div>

          {/* Financial Health Score */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Health Score</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`w-24 h-24 bg-gradient-to-br rounded-full flex items-center justify-center mb-2 ${
                  metrics.collectionRate >= 90 ? 'from-green-400 to-green-600' :
                  metrics.collectionRate >= 75 ? 'from-yellow-400 to-yellow-600' :
                  'from-red-400 to-red-600'
                }`}>
                  <span className="text-2xl font-bold text-white">{Math.round(metrics.collectionRate)}</span>
                </div>
                <p className="text-sm font-medium">Overall Score</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.collectionRate >= 90 ? 'Excellent' :
                   metrics.collectionRate >= 75 ? 'Good' :
                   metrics.collectionRate >= 60 ? 'Fair' : 'Needs Attention'}
                </p>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Revenue Stability</span>
                    <span>{Math.min(100, Math.round(metrics.collectionRate + 5))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.round(metrics.collectionRate + 5))}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Expense Control</span>
                    <span>{Math.max(0, Math.min(100, Math.round(100 - (metrics.totalExpenses / Math.max(1, metrics.totalRevenue)) * 50)))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${
                      metrics.totalExpenses / Math.max(1, metrics.totalRevenue) < 0.3 ? 'bg-green-500' :
                      metrics.totalExpenses / Math.max(1, metrics.totalRevenue) < 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.max(0, Math.min(100, Math.round(100 - (metrics.totalExpenses / Math.max(1, metrics.totalRevenue)) * 50)))}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cash Flow</span>
                    <span>{Math.round(metrics.netIncome >= 0 ? 85 + (metrics.collectionRate / 20) : 45 + (metrics.collectionRate / 4))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${
                      metrics.netIncome >= 0 ? 'bg-blue-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.round(metrics.netIncome >= 0 ? 85 + (metrics.collectionRate / 20) : 45 + (metrics.collectionRate / 4))}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Footer */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Report Summary</h3>
            <p className="text-sm text-gray-600 mt-1">
              Generated on {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex gap-3 no-print">
            <Button variant="outline" size="sm" onClick={handlePrintPreview}>
              <Printer className="w-4 h-4 mr-2" />
              Print Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareReport}>
              <Eye className="w-4 h-4 mr-2" />
              Share Report
            </Button>
          </div>
        </div>
      </Card>
    </div>
    </div>
    </>
  );
};