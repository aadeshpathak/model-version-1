import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  DollarSign,
  Target,
  Activity,
  Settings,
  RefreshCw,
  Brain,
  Zap,
  Shield,
  Calendar,
  Award,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getAllExpenses,
  getAllBills,
  getMembers,
  getAllNotices
} from '@/lib/firestoreServices';
import {
  MLDataProcessor,
  ExpenseForecaster,
  AnomalyDetector,
  PaymentBehaviorAnalyzer,
  BudgetRecommendationEngine,
  EngagementScorer,
  MaintenancePredictor,
  type MLExpenseData,
  type MLPredictionResult
} from '@/lib/ml-utils';
import { motion } from 'framer-motion';

export const MLInsights = () => {
  const [mlData, setMlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMLData();
  }, []);

  const loadMLData = async () => {
    setLoading(true);
    try {
      const [expenses, bills, members, notices] = await Promise.all([
        new Promise(resolve => getAllExpenses(resolve)),
        new Promise(resolve => getAllBills(resolve)),
        new Promise(resolve => getMembers(resolve)),
        new Promise(resolve => getAllNotices(resolve))
      ]);

      // Convert expenses to ML format
      const mlExpenses: MLExpenseData[] = expenses.map(expense => ({
        id: expense.id,
        amount: expense.amount || 0,
        category: expense.category || 'Other',
        month: typeof expense.month === 'string' ?
          getMonthNumber(expense.month) :
          expense.month || 1,
        year: expense.year || new Date().getFullYear(),
        timestamp: expense.createdAt?.toDate?.()?.getTime() || Date.now()
      }));

      // Generate ML insights using individual utilities
      const insights = generateMLInsights(mlExpenses, bills, members, notices);
      setMlData(insights);
    } catch (error) {
      console.error('Error loading ML data:', error);
      toast({
        title: "Error",
        description: "Failed to load AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthNumber = (monthName: string): number => {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return months.indexOf(monthName.toLowerCase()) + 1;
  };

  const generateMLInsights = (expenses: MLExpenseData[], bills: any[], members: any[], notices: any[]) => {
    // Expense Forecasting
    const expenseForecast = generateExpenseForecast(expenses);

    // Anomaly Detection
    const anomalyDetection = detectAnomalies(expenses);

    // Budget Recommendations
    const budgetRecommendations = generateBudgetRecommendations(expenses);

    // Member Engagement
    const memberEngagement = analyzeMemberEngagement(members, bills, notices);

    // Payment Behavior
    const paymentBehavior = analyzePaymentBehavior(members, bills);

    // Maintenance Predictions
    const maintenancePrediction = generateMaintenancePredictions(expenses);

    return {
      expenseForecast,
      anomalyDetection,
      budgetRecommendations,
      memberEngagement,
      paymentBehavior,
      maintenancePrediction
    };
  };

  const safeProgressValue = (value: number): number => {
    return Math.max(0, Math.min(100, value || 0));
  };

  const generateExpenseForecast = (expenses: MLExpenseData[]): MLPredictionResult => {
    if (expenses.length < 3) {
      return { predicted: 0, confidence: 0, trend: 'stable' };
    }

    const sortedExpenses = expenses.sort((a, b) => a.timestamp - b.timestamp);
    const recent = sortedExpenses.slice(-3);
    const older = sortedExpenses.slice(-6, -3);

    const recentAvg = recent.reduce((sum, exp) => sum + exp.amount, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, exp) => sum + exp.amount, 0) / older.length : recentAvg;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

    const predicted = Math.round(recentAvg * 1.1); // 10% increase prediction
    const confidence = Math.min(0.9, expenses.length / 20); // Higher confidence with more data

    return { predicted, confidence, trend };
  };

  const detectAnomalies = (expenses: MLExpenseData[]) => {
    if (expenses.length < 5) {
      return { anomalies: [], totalAnomalies: 0 };
    }

    const amounts = expenses.map(exp => exp.amount);
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = expenses
      .map(expense => ({
        expense,
        score: Math.abs((expense.amount - mean) / stdDev),
        isAnomaly: Math.abs((expense.amount - mean) / stdDev) > 2
      }))
      .filter(item => item.isAnomaly);

    return {
      anomalies,
      totalAnomalies: anomalies.length
    };
  };

  const generateBudgetRecommendations = (expenses: MLExpenseData[]) => {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as { [category: string]: number });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const efficiencyScore = totalExpenses > 0 ? Math.min(1, 50000 / totalExpenses) : 0;

    const categoryBudgets = Object.entries(categoryTotals).reduce((acc, [category, amount]) => {
      acc[category] = Math.round((amount / totalExpenses) * 50000);
      return acc;
    }, {} as { [category: string]: number });

    const savingsOpportunities = [];
    if (efficiencyScore > 0.9) {
      savingsOpportunities.push('Excellent budget adherence! Consider increasing savings goals.');
    } else if (efficiencyScore < 0.7) {
      savingsOpportunities.push('Budget overrun detected. Review and adjust spending patterns.');
    }

    return {
      categoryBudgets,
      savingsOpportunities,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100
    };
  };

  const analyzeMemberEngagement = (members: any[], bills: any[], notices: any[]) => {
    const scorer = new EngagementScorer();
    const scores = members.map(member => {
      const memberBills = bills.filter(bill => bill.memberId === member.id);
      const memberNotices = notices.filter(notice =>
        notice.target === 'all' ||
        (Array.isArray(notice.target) && notice.target.includes(member.id))
      );

      const score = scorer.calculateEngagementScore(member, memberBills, memberNotices);
      const level = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';

      return {
        memberId: member.id,
        score,
        level
      };
    });

    const averageScore = scores.length > 0 ?
      scores.reduce((sum, item) => sum + item.score, 0) / scores.length : 0;

    return {
      scores,
      averageScore: Math.round(averageScore * 100) / 100
    };
  };

  const analyzePaymentBehavior = (members: any[], bills: any[]) => {
    const analyzer = new PaymentBehaviorAnalyzer();

    const riskMembers = members.map(member => {
      const memberBills = bills.filter(bill => bill.memberId === member.id);
      const behavior = analyzer.analyzePaymentPatterns(memberBills);

      return {
        memberId: member.id,
        riskScore: behavior.riskScore,
        reliability: behavior.reliability
      };
    }).filter(member => member.riskScore > 0.3)
      .sort((a, b) => b.riskScore - a.riskScore);

    const overallHealth = members.length > 0 ?
      1 - (riskMembers.length / members.length) : 1;

    return {
      riskMembers,
      overallHealth: Math.round(overallHealth * 100) / 100
    };
  };

  const generateMaintenancePredictions = (expenses: MLExpenseData[]) => {
    const predictor = new MaintenancePredictor();

    expenses.forEach(expense => {
      const date = new Date(expense.timestamp);
      predictor.addMaintenanceRecord(date, expense.amount, expense.category);
    });

    const prediction = predictor.predictNextMaintenance();
    const patterns = predictor.analyzeMaintenancePatterns();

    return {
      predictedAmount: prediction.predictedAmount,
      confidence: prediction.confidence,
      nextMaintenanceDate: prediction.nextMaintenanceDate,
      recommendedBudget: prediction.recommendedBudget,
      patterns
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMLData();
    setRefreshing(false);
    toast({
      title: "AI Insights Updated",
      description: "Machine learning analysis has been refreshed.",
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Analyzing data with AI...</p>
        </div>
      </div>
    );
  }

  if (!mlData) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-muted-foreground">Unable to generate AI insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI-Powered Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Machine learning insights for smarter society management
          </p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="6months">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} className="bg-gradient-primary">
            {refreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Refresh AI
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Expense Forecast</p>
              <p className="text-2xl font-bold text-blue-900">
                ₹{mlData.expenseForecast.predicted.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {mlData.expenseForecast.confidence * 100}% confidence
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Anomalies Detected</p>
              <p className="text-2xl font-bold text-red-900">{mlData.anomalyDetection.totalAnomalies}</p>
              <p className="text-xs text-red-600 mt-1">Unusual patterns found</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Member Engagement</p>
              <p className="text-2xl font-bold text-green-900">{mlData.memberEngagement.averageScore}/100</p>
              <p className="text-xs text-green-600 mt-1">Average score</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Payment Health</p>
              <p className="text-2xl font-bold text-purple-900">{Math.round(mlData.paymentBehavior.overallHealth * 100)}%</p>
              <p className="text-xs text-purple-600 mt-1">Overall reliability</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* ML Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Expense Forecasting */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Expense Forecasting
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Month Prediction</span>
              <Badge variant={mlData.expenseForecast.trend === 'increasing' ? 'destructive' : 'default'}>
                {mlData.expenseForecast.trend}
              </Badge>
            </div>
            <div className="text-2xl font-bold">₹{mlData.expenseForecast.predicted.toLocaleString()}</div>
            <Progress value={safeProgressValue(mlData.expenseForecast.confidence * 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {mlData.expenseForecast.confidence * 100}% confidence level
            </p>
          </div>
        </Card>

        {/* 2. Anomaly Detection */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Anomaly Detection
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unusual Expenses</span>
              <Badge variant="destructive">{mlData.anomalyDetection.totalAnomalies}</Badge>
            </div>
            {mlData.anomalyDetection.anomalies.slice(0, 3).map((anomaly, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">{anomaly.expense.category}</p>
                  <p className="text-sm text-muted-foreground">₹{anomaly.expense.amount.toLocaleString()}</p>
                </div>
                <Badge variant="outline">Score: {anomaly.score.toFixed(1)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* 3. Budget Recommendations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Smart Budgeting
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Efficiency Score</span>
              <Badge variant={mlData.budgetRecommendations.efficiencyScore > 0.8 ? 'default' : 'destructive'}>
                {Math.round(mlData.budgetRecommendations.efficiencyScore * 100)}%
              </Badge>
            </div>
            <Progress value={safeProgressValue(mlData.budgetRecommendations.efficiencyScore * 100)} className="h-3" />
            <div className="space-y-2">
              {mlData.budgetRecommendations.savingsOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800">{opportunity}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 4. Member Engagement */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Member Engagement
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Score</span>
              <Badge variant="secondary">{mlData.memberEngagement.averageScore}/100</Badge>
            </div>
            <div className="space-y-2">
              {mlData.memberEngagement.scores.slice(0, 3).map((member) => (
                <div key={member.memberId} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Member {member.memberId.slice(-4)}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={member.score} className="w-16 h-2" />
                    <Badge variant={member.level === 'High' ? 'default' : 'secondary'}>
                      {member.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 5. Payment Behavior Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            Payment Behavior
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Health</span>
              <Badge variant={mlData.paymentBehavior.overallHealth > 0.7 ? 'default' : 'destructive'}>
                {Math.round(mlData.paymentBehavior.overallHealth * 100)}%
              </Badge>
            </div>
            <div className="space-y-2">
              {mlData.paymentBehavior.riskMembers.slice(0, 3).map((member) => (
                <div key={member.memberId} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Member {member.memberId.slice(-4)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Risk: {Math.round(member.riskScore * 100)}%</Badge>
                    <Badge variant="secondary">{Math.round(member.reliability * 100)}% reliable</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 6. Maintenance Predictions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Maintenance Predictions
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Next Amount</p>
                <p className="text-lg font-bold text-indigo-900">₹{mlData.maintenancePrediction.predictedAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-bold text-indigo-900">{Math.round(mlData.maintenancePrediction.confidence * 100)}%</p>
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Recommended Budget</p>
              <p className="text-xl font-bold text-green-900">₹{mlData.maintenancePrediction.recommendedBudget.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* 7. Seasonal Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Seasonal Trends
          </h3>
          <div className="space-y-3">
            {Object.entries(mlData.maintenancePrediction.patterns.seasonalTrends)
              .sort(([,a], [,b]) => Number(b) - Number(a))
              .slice(0, 6)
              .map(([month, amount]) => {
                const seasonalTrends = mlData.maintenancePrediction.patterns.seasonalTrends || {};
                const maxAmount = Math.max(...Object.values(seasonalTrends).map(Number));
                const progressValue = maxAmount > 0 ? (Number(amount) / maxAmount) * 100 : 0;
                return (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{month}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={safeProgressValue(progressValue)} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">₹{Number(amount).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* 8. Cost Trend Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-600" />
            Cost Trend Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trend Direction</span>
              <Badge variant={
                mlData.maintenancePrediction.patterns.costTrend === 'increasing' ? 'destructive' :
                mlData.maintenancePrediction.patterns.costTrend === 'decreasing' ? 'default' : 'secondary'
              }>
                {mlData.maintenancePrediction.patterns.costTrend}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Average Cost</p>
                <p className="text-lg font-bold">₹{mlData.maintenancePrediction.patterns.averageCost.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="text-lg font-bold">{mlData.maintenancePrediction.patterns.frequency}x/year</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 9. Risk Assessment */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Risk Assessment
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">High Risk Members</span>
              <Badge variant="destructive">{mlData.paymentBehavior.riskMembers.length}</Badge>
            </div>
            {mlData.paymentBehavior.riskMembers.slice(0, 4).map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium">Member {member.memberId.slice(-4)}</span>
                <div className="flex items-center gap-2">
                  <Progress value={safeProgressValue((1 - member.riskScore) * 100)} className="w-16 h-2" />
                  <Badge variant="outline">{Math.round(member.riskScore * 100)}% risk</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 10. ML Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            ML Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Forecast Horizon</label>
                <Select defaultValue="6">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Anomaly Threshold</label>
                <Select defaultValue="2.5">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.0">2.0σ (Sensitive)</SelectItem>
                    <SelectItem value="2.5">2.5σ (Normal)</SelectItem>
                    <SelectItem value="3.0">3.0σ (Conservative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-gradient-primary">
              <Zap className="w-4 h-4 mr-2" />
              Update ML Settings
            </Button>
          </div>
        </Card>

        {/* 11. Real-time Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-600" />
            Real-time Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-cyan-900">{mlData.budgetRecommendations.categoryBudgets ? Object.keys(mlData.budgetRecommendations.categoryBudgets).length : 0}</p>
              <p className="text-sm text-cyan-700">Categories</p>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Star className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-cyan-900">{mlData.memberEngagement.scores.filter(s => s.level === 'High').length}</p>
              <p className="text-sm text-cyan-700">High Engagement</p>
            </div>
          </div>
        </Card>

        {/* 12. Predictive Analytics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            Predictive Analytics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Next Month Forecast</p>
                  <p className="text-sm text-muted-foreground">Based on historical trends</p>
                </div>
              </div>
              <Badge variant="outline">₹{mlData.expenseForecast.predicted.toLocaleString()}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Next Maintenance</p>
                  <p className="text-sm text-muted-foreground">
                    {mlData.maintenancePrediction.nextMaintenanceDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline">₹{mlData.maintenancePrediction.predictedAmount.toLocaleString()}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Stats */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">AI Analysis Summary</h3>
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
          <div className="flex gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs font-medium">AI Powered</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs font-medium">Real-time</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};