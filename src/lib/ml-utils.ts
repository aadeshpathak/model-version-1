// ML Utilities for Society Management App
// This file contains machine learning algorithms and data processing utilities

export interface MLExpenseData {
  id: string;
  amount: number;
  category: string;
  month: number;
  year: number;
  timestamp: number;
}

export interface MLPredictionResult {
  predicted: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: number;
}

export interface MLMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

// Data preprocessing utilities
export class MLDataProcessor {
  static normalizeData(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (max === min) return data.map(() => 0);
    return data.map(val => (val - min) / (max - min));
  }

  static denormalizeData(normalizedData: number[], originalData: number[]): number[] {
    const min = Math.min(...originalData);
    const max = Math.max(...originalData);
    return normalizedData.map(val => val * (max - min) + min);
  }

  static createTimeSeriesFeatures(data: MLExpenseData[], lookback: number = 12): number[][] {
    const features: number[][] = [];

    for (let i = lookback; i < data.length; i++) {
      const featureVector: number[] = [];

      // Add historical values
      for (let j = 0; j < lookback; j++) {
        featureVector.push(data[i - lookback + j].amount);
      }

      // Add time-based features
      const currentData = data[i];
      featureVector.push(currentData.month / 12); // Normalized month
      featureVector.push(currentData.category.length / 10); // Category encoding

      features.push(featureVector);
    }

    return features;
  }

  static prepareTrainingData(expenses: MLExpenseData[]): { features: number[][], labels: number[] } {
    const timeSeriesData = this.createTimeSeriesFeatures(expenses, 6);
    const features = timeSeriesData.slice(0, -1);
    const labels = timeSeriesData.slice(1).map(ts => ts[0]); // Predict next value

    return { features, labels };
  }
}

// Simple Linear Regression for trend analysis
export class ExpenseForecaster {
  private weights: number[] = [];
  private bias: number = 0;
  private learningRate: number = 0.01;
  private epochs: number = 1000;

  train(features: number[][], labels: number[]): void {
    const numFeatures = features[0].length;
    this.weights = new Array(numFeatures).fill(0);

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let totalError = 0;

      for (let i = 0; i < features.length; i++) {
        const prediction = this.predictSingle(features[i]);
        const error = labels[i] - prediction;

        totalError += Math.abs(error);

        // Update weights
        for (let j = 0; j < numFeatures; j++) {
          this.weights[j] += this.learningRate * error * features[i][j];
        }
        this.bias += this.learningRate * error;
      }

      if (epoch % 100 === 0) {
        console.log(`Epoch ${epoch}, Average Error: ${totalError / features.length}`);
      }
    }
  }

  predictSingle(features: number[]): number {
    let sum = this.bias;
    for (let i = 0; i < features.length; i++) {
      sum += this.weights[i] * features[i];
    }
    return Math.max(0, sum); // Ensure non-negative predictions
  }

  predict(features: number[][]): number[] {
    return features.map(f => this.predictSingle(f));
  }
}

// Anomaly Detection using Z-Score method
export class AnomalyDetector {
  private mean: number = 0;
  private stdDev: number = 0;

  fit(data: number[]): void {
    this.mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - this.mean, 2), 0) / data.length;
    this.stdDev = Math.sqrt(variance);
  }

  detectAnomalies(data: number[], threshold: number = 2.5): boolean[] {
    return data.map(value => {
      const zScore = Math.abs((value - this.mean) / this.stdDev);
      return zScore > threshold;
    });
  }

  getAnomalyScore(value: number): number {
    return Math.abs((value - this.mean) / this.stdDev);
  }
}

// Member Payment Behavior Analysis
export class PaymentBehaviorAnalyzer {
  analyzePaymentPatterns(bills: any[]): {
    reliability: number;
    averagePaymentDelay: number;
    paymentFrequency: number;
    riskScore: number;
  } {
    if (bills.length === 0) {
      return { reliability: 0, averagePaymentDelay: 0, paymentFrequency: 0, riskScore: 1 };
    }

    const paidBills = bills.filter(bill => bill.status === 'paid');
    const reliability = paidBills.length / bills.length;

    const delays = paidBills.map(bill => {
      if (bill.paidDate && bill.dueDate) {
        const paidDate = new Date(bill.paidDate);
        const dueDate = bill.dueDate.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
        return Math.max(0, (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 0;
    });

    const averagePaymentDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;

    // Calculate payment frequency (bills per month)
    const monthsActive = Math.max(1, bills.length / 12);
    const paymentFrequency = paidBills.length / monthsActive;

    // Risk score based on reliability and delay
    const riskScore = (1 - reliability) * 0.7 + Math.min(1, averagePaymentDelay / 30) * 0.3;

    return {
      reliability: Math.round(reliability * 100) / 100,
      averagePaymentDelay: Math.round(averagePaymentDelay * 100) / 100,
      paymentFrequency: Math.round(paymentFrequency * 100) / 100,
      riskScore: Math.round(riskScore * 100) / 100
    };
  }
}

// Smart Budgeting Recommendations
export class BudgetRecommendationEngine {
  generateRecommendations(expenses: MLExpenseData[], totalBudget: number): {
    categoryBudgets: { [category: string]: number };
    savingsOpportunities: string[];
    efficiencyScore: number;
  } {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as { [category: string]: number });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const efficiencyScore = totalBudget > 0 ? Math.min(1, totalExpenses / totalBudget) : 0;

    // Allocate budget proportionally to historical spending
    const categoryBudgets = Object.entries(categoryTotals).reduce((acc, [category, amount]) => {
      acc[category] = Math.round((amount / totalExpenses) * totalBudget);
      return acc;
    }, {} as { [category: string]: number });

    // Identify savings opportunities
    const savingsOpportunities: string[] = [];
    const highSpendingCategories = Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > totalBudget * 0.3)
      .map(([category, _]) => category);

    if (highSpendingCategories.length > 0) {
      savingsOpportunities.push(`Consider reducing spending in: ${highSpendingCategories.join(', ')}`);
    }

    if (efficiencyScore > 0.9) {
      savingsOpportunities.push('Excellent budget adherence! Consider increasing savings goals.');
    } else if (efficiencyScore > 1.1) {
      savingsOpportunities.push('Budget overrun detected. Review and adjust spending patterns.');
    }

    return {
      categoryBudgets,
      savingsOpportunities,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100
    };
  }
}

// Maintenance Prediction System
export class MaintenancePredictor {
  private historicalData: Array<{ date: Date; amount: number; type: string }> = [];

  addMaintenanceRecord(date: Date, amount: number, type: string): void {
    this.historicalData.push({ date, amount, type });
    // Keep only last 24 months of data
    this.historicalData = this.historicalData
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 24);
  }

  predictNextMaintenance(): {
    predictedAmount: number;
    confidence: number;
    nextMaintenanceDate: Date;
    recommendedBudget: number;
  } {
    if (this.historicalData.length < 3) {
      return {
        predictedAmount: 0,
        confidence: 0,
        nextMaintenanceDate: new Date(),
        recommendedBudget: 0
      };
    }

    // Calculate average maintenance interval
    const sortedData = this.historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
    const intervals = [];

    for (let i = 1; i < sortedData.length; i++) {
      const interval = sortedData[i].date.getTime() - sortedData[i - 1].date.getTime();
      intervals.push(interval / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const nextMaintenanceDate = new Date(sortedData[sortedData.length - 1].date.getTime() + avgInterval * 24 * 60 * 60 * 1000);

    // Predict amount based on recent trends
    const recentRecords = sortedData.slice(-6); // Last 6 maintenance records
    const amounts = recentRecords.map(record => record.amount);
    const predictedAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

    // Calculate confidence based on data consistency
    const variance = this.calculateVariance(amounts);
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (variance / 100000)));

    // Recommend budget (120% of predicted amount for safety margin)
    const recommendedBudget = predictedAmount * 1.2;

    return {
      predictedAmount: Math.round(predictedAmount),
      confidence: Math.round(confidence * 100) / 100,
      nextMaintenanceDate,
      recommendedBudget: Math.round(recommendedBudget)
    };
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  analyzeMaintenancePatterns(): {
    averageCost: number;
    frequency: number; // maintenance per year
    seasonalTrends: { [month: string]: number };
    costTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.historicalData.length < 2) {
      return {
        averageCost: 0,
        frequency: 0,
        seasonalTrends: {},
        costTrend: 'stable'
      };
    }

    const totalCost = this.historicalData.reduce((sum, record) => sum + record.amount, 0);
    const averageCost = totalCost / this.historicalData.length;

    // Calculate frequency (maintenance per year)
    const sortedData = this.historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstDate = sortedData[0].date;
    const lastDate = sortedData[sortedData.length - 1].date;
    const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const frequency = monthsDiff > 0 ? (this.historicalData.length / monthsDiff) * 12 : 0;

    // Analyze seasonal trends
    const monthlyTotals = this.historicalData.reduce((acc, record) => {
      const month = record.date.toLocaleString('default', { month: 'long' });
      acc[month] = (acc[month] || 0) + record.amount;
      return acc;
    }, {} as { [month: string]: number });

    const seasonalTrends = Object.entries(monthlyTotals).reduce((acc, [month, total]) => {
      acc[month] = Math.round(total);
      return acc;
    }, {} as { [month: string]: number });

    // Analyze cost trend
    const recent = sortedData.slice(-3);
    const older = sortedData.slice(-6, -3);
    const recentAvg = recent.reduce((sum, record) => sum + record.amount, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, record) => sum + record.amount, 0) / older.length : recentAvg;

    let costTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.15) costTrend = 'increasing';
    else if (recentAvg < olderAvg * 0.85) costTrend = 'decreasing';

    return {
      averageCost: Math.round(averageCost),
      frequency: Math.round(frequency * 100) / 100,
      seasonalTrends,
      costTrend
    };
  }
}

// Member Engagement Scoring
export class EngagementScorer {
  calculateEngagementScore(member: any, bills: any[], notices: any[]): number {
    let score = 0;

    // Payment reliability (40% weight)
    const paymentScore = bills.length > 0 ?
      (bills.filter(bill => bill.status === 'paid').length / bills.length) * 40 : 20;
    score += paymentScore;

    // Notice engagement (30% weight)
    const readNotices = notices.filter(notice =>
      notice.readBy && notice.readBy.includes(member.id)
    ).length;
    const noticeScore = notices.length > 0 ? (readNotices / notices.length) * 30 : 15;
    score += noticeScore;

    // Profile completeness (20% weight)
    const profileFields = [member.fullName, member.phone, member.flatNumber];
    const completedFields = profileFields.filter(field => field && field.trim()).length;
    const profileScore = (completedFields / profileFields.length) * 20;
    score += profileScore;

    // Activity recency (10% weight)
    const lastLogin = member.lastLogin?.toDate?.() || new Date(member.lastLogin);
    const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
    const activityScore = Math.max(0, 10 - (daysSinceLogin / 30) * 10);
    score += activityScore;

    return Math.round(score * 100) / 100;
  }
}

// ML utilities are already exported above with their class declarations