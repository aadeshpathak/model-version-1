// ML Insights Service Layer
// Integrates ML algorithms with existing Firebase data

import {
  MLDataProcessor,
  ExpenseForecaster,
  AnomalyDetector,
  PaymentBehaviorAnalyzer,
  BudgetRecommendationEngine,
  EngagementScorer,
  MaintenancePredictor,
  type MLExpenseData,
  type MLPredictionResult,
  type MLMetrics
} from './ml-utils';

export interface MLInsights {
  expenseForecast: MLPredictionResult;
  anomalyDetection: {
    anomalies: Array<{ expense: MLExpenseData; score: number; isAnomaly: boolean }>;
    totalAnomalies: number;
  };
  budgetRecommendations: {
    categoryBudgets: { [category: string]: number };
    savingsOpportunities: string[];
    efficiencyScore: number;
  };
  memberEngagement: {
    scores: Array<{ memberId: string; score: number; level: string }>;
    averageScore: number;
  };
  paymentBehavior: {
    riskMembers: Array<{ memberId: string; riskScore: number; reliability: number }>;
    overallHealth: number;
  };
  maintenancePrediction: {
    predictedAmount: number;
    confidence: number;
    nextMaintenanceDate: Date;
    recommendedBudget: number;
    patterns: {
      averageCost: number;
      frequency: number;
      seasonalTrends: { [month: string]: number };
      costTrend: 'increasing' | 'decreasing' | 'stable';
    };
  };
}

export interface MLConfiguration {
  forecastingHorizon: number;
  anomalyThreshold: number;
  minDataPoints: number;
  enableRealTimeAnalysis: boolean;
}

export class MLInsightsService {
  private config: MLConfiguration = {
    forecastingHorizon: 6,
    anomalyThreshold: 2.5,
    minDataPoints: 12,
    enableRealTimeAnalysis: true
  };

  constructor(config?: Partial<MLConfiguration>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Convert Firestore expense data to ML format
  private convertExpenseData(expenses: any[]): MLExpenseData[] {
    return expenses.map(expense => ({
      id: expense.id,
      amount: expense.amount || 0,
      category: expense.category || 'Other',
      month: typeof expense.month === 'string' ?
        this.getMonthNumber(expense.month) :
        expense.month || 1,
      year: expense.year || new Date().getFullYear(),
      timestamp: expense.createdAt?.toDate?.()?.getTime() || Date.now()
    }));
  }

  private getMonthNumber(monthName: string): number {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return months.indexOf(monthName.toLowerCase()) + 1;
  }

  // Main method to generate all ML insights
  async generateInsights(
    expenses: any[],
    bills: any[],
    members: any[],
    notices: any[]
  ): Promise<MLInsights> {
    try {
      const expenseData = this.convertExpenseData(expenses);

      if (expenseData.length < this.config.minDataPoints) {
        return this.getDefaultInsights();
      }

      // Generate expense forecast
      const expenseForecast = await this.generateExpenseForecast(expenseData);

      // Detect anomalies
      const anomalyDetection = this.detectExpenseAnomalies(expenseData);

      // Generate budget recommendations
      const totalBudget = this.estimateTotalBudget(expenses);
      const budgetRecommendations = this.generateBudgetRecommendations(expenseData, totalBudget);

      // Analyze member engagement
      const memberEngagement = this.analyzeMemberEngagement(members, bills, notices);

      // Analyze payment behavior
      const paymentBehavior = this.analyzePaymentBehavior(members, bills);

      // Generate maintenance predictions
      const maintenancePrediction = this.generateMaintenancePredictions(expenses);

      return {
        expenseForecast,
        anomalyDetection,
        budgetRecommendations,
        memberEngagement,
        paymentBehavior,
        maintenancePrediction
      };
    } catch (error) {
      console.error('Error generating ML insights:', error);
      return this.getDefaultInsights();
    }
  }

  private async generateExpenseForecast(expenseData: MLExpenseData[]): Promise<MLPredictionResult> {
    try {
      const sortedData = expenseData.sort((a, b) => a.timestamp - b.timestamp);

      if (sortedData.length < 6) {
        return {
          predicted: sortedData.reduce((sum, exp) => sum + exp.amount, 0) / sortedData.length,
          confidence: 0.5,
          trend: 'stable'
        };
      }

      const forecaster = new ExpenseForecaster();
      const { features, labels } = MLDataProcessor.prepareTrainingData(sortedData);

      if (features.length === 0) {
        return this.getDefaultPrediction();
      }

      forecaster.train(features, labels);

      // Generate next month prediction
      const lastFeatures = features[features.length - 1];
      const predicted = forecaster.predictSingle(lastFeatures);

      // Calculate trend
      const recent = sortedData.slice(-3);
      const older = sortedData.slice(-6, -3);
      const recentAvg = recent.reduce((sum, exp) => sum + exp.amount, 0) / recent.length;
      const olderAvg = older.reduce((sum, exp) => sum + exp.amount, 0) / older.length;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > olderAvg * 1.1) trend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

      // Calculate confidence based on data consistency
      const variance = this.calculateVariance(sortedData.map(exp => exp.amount));
      const confidence = Math.max(0.1, Math.min(0.9, 1 - (variance / 100000)));

      return {
        predicted: Math.round(predicted),
        confidence: Math.round(confidence * 100) / 100,
        trend
      };
    } catch (error) {
      console.error('Error in expense forecasting:', error);
      return this.getDefaultPrediction();
    }
  }

  private detectExpenseAnomalies(expenseData: MLExpenseData[]): MLInsights['anomalyDetection'] {
    try {
      const amounts = expenseData.map(exp => exp.amount);
      const detector = new AnomalyDetector();
      detector.fit(amounts);

      const anomalies = expenseData.map(expense => ({
        expense,
        score: detector.getAnomalyScore(expense.amount),
        isAnomaly: detector.detectAnomalies([expense.amount], this.config.anomalyThreshold)[0]
      })).filter(item => item.isAnomaly);

      return {
        anomalies,
        totalAnomalies: anomalies.length
      };
    } catch (error) {
      console.error('Error in anomaly detection:', error);
      return { anomalies: [], totalAnomalies: 0 };
    }
  }

  private generateBudgetRecommendations(expenseData: MLExpenseData[], totalBudget: number) {
    try {
      const engine = new BudgetRecommendationEngine();
      return engine.generateRecommendations(expenseData, totalBudget);
    } catch (error) {
      console.error('Error in budget recommendations:', error);
      return {
        categoryBudgets: {},
        savingsOpportunities: ['Unable to generate recommendations due to insufficient data'],
        efficiencyScore: 0
      };
    }
  }

  private analyzeMemberEngagement(members: any[], bills: any[], notices: any[]) {
    try {
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

      const averageScore = scores.reduce((sum, item) => sum + item.score, 0) / scores.length;

      return {
        scores,
        averageScore: Math.round(averageScore * 100) / 100
      };
    } catch (error) {
      console.error('Error in member engagement analysis:', error);
      return {
        scores: [],
        averageScore: 0
      };
    }
  }

  private analyzePaymentBehavior(members: any[], bills: any[]) {
    try {
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
    } catch (error) {
      console.error('Error in payment behavior analysis:', error);
      return {
        riskMembers: [],
        overallHealth: 0
      };
    }
  }

  private estimateTotalBudget(expenses: any[]): number {
    // Estimate based on historical data or use default
    if (expenses.length === 0) return 50000; // Default monthly budget

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const months = Math.max(1, expenses.length / 4); // Assume 4 expenses per month on average

    return Math.round(totalExpenses / months);
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  private getDefaultPrediction(): MLPredictionResult {
    return {
      predicted: 0,
      confidence: 0,
      trend: 'stable'
    };
  }

  private generateMaintenancePredictions(expenses: any[]): MLInsights['maintenancePrediction'] {
    try {
      const predictor = new MaintenancePredictor();

      // Add expense data as maintenance records (assuming expenses represent maintenance costs)
      expenses.forEach(expense => {
        const date = expense.createdAt?.toDate?.() || new Date(expense.createdAt);
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
    } catch (error) {
      console.error('Error in maintenance prediction:', error);
      return {
        predictedAmount: 0,
        confidence: 0,
        nextMaintenanceDate: new Date(),
        recommendedBudget: 0,
        patterns: {
          averageCost: 0,
          frequency: 0,
          seasonalTrends: {},
          costTrend: 'stable'
        }
      };
    }
  }

  private getDefaultInsights(): MLInsights {
    return {
      expenseForecast: this.getDefaultPrediction(),
      anomalyDetection: { anomalies: [], totalAnomalies: 0 },
      budgetRecommendations: {
        categoryBudgets: {},
        savingsOpportunities: ['Insufficient data for analysis'],
        efficiencyScore: 0
      },
      memberEngagement: { scores: [], averageScore: 0 },
      paymentBehavior: { riskMembers: [], overallHealth: 0 },
      maintenancePrediction: {
        predictedAmount: 0,
        confidence: 0,
        nextMaintenanceDate: new Date(),
        recommendedBudget: 0,
        patterns: {
          averageCost: 0,
          frequency: 0,
          seasonalTrends: {},
          costTrend: 'stable'
        }
      }
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<MLConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): MLConfiguration {
    return { ...this.config };
  }
}

// Singleton instance for the app
export const mlInsightsService = new MLInsightsService();