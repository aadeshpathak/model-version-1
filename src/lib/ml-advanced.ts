// Advanced ML Algorithms with TensorFlow.js
// Enhanced machine learning capabilities for better predictions

import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';

export interface TrainingConfig {
  epochs: number;
  learningRate: number;
  validationSplit: number;
  batchSize?: number;
}

export interface ModelMetrics {
  loss: number;
  val_loss: number;
  accuracy?: number;
  val_accuracy?: number;
}

// TensorFlow.js implementation for better forecasting
export class TensorFlowExpenseForecaster {
  private model: tf.Sequential | null = null;
  private isTraining: boolean = false;

  async initializeModel(inputShape: number = 12): Promise<void> {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputShape], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
  }

  async trainModel(
    features: number[][],
    labels: number[],
    config: TrainingConfig = { epochs: 100, learningRate: 0.001, validationSplit: 0.2 }
  ): Promise<ModelMetrics> {
    if (!this.model) {
      await this.initializeModel(features[0]?.length || 12);
    }

    this.isTraining = true;

    const xs = tf.tensor2d(features);
    const ys = tf.tensor1d(labels);

    const history = await this.model.fit(xs, ys, {
      epochs: config.epochs,
      validationSplit: config.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
        }
      }
    });

    this.isTraining = false;
    xs.dispose();
    ys.dispose();

    const finalMetrics = history.history;
    return {
      loss: finalMetrics.loss[finalMetrics.loss.length - 1] as number,
      val_loss: finalMetrics.val_loss[finalMetrics.val_loss.length - 1] as number
    };
  }

  async predict(features: number[][]): Promise<number[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const xs = tf.tensor2d(features);
    const predictions = this.model.predict(xs) as tf.Tensor;
    const result = await predictions.data();

    xs.dispose();
    predictions.dispose();

    return Array.from(result);
  }

  async saveModel(path: string = 'localstorage://expense-forecaster'): Promise<void> {
    if (this.model) {
      await this.model.save(path);
    }
  }

  async loadModel(path: string = 'localstorage://expense-forecaster'): Promise<void> {
    this.model = await tf.loadLayersModel(path);
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

// Neural Network for Member Engagement Prediction
export class NeuralEngagementPredictor {
  private model: tf.Sequential | null = null;

  async initializeModel(): Promise<void> {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [4], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  async trainEngagementModel(
    features: number[][],
    labels: number[],
    config: TrainingConfig = { epochs: 50, learningRate: 0.01, validationSplit: 0.2 }
  ): Promise<ModelMetrics> {
    if (!this.model) {
      await this.initializeModel();
    }

    const xs = tf.tensor2d(features);
    const ys = tf.tensor1d(labels);

    const history = await this.model.fit(xs, ys, {
      epochs: config.epochs,
      validationSplit: config.validationSplit,
      batchSize: config.batchSize
    });

    xs.dispose();
    ys.dispose();

    return {
      loss: history.history.loss[history.history.loss.length - 1] as number,
      val_loss: history.history.val_loss[history.history.val_loss.length - 1] as number,
      accuracy: history.history.acc ? history.history.acc[history.history.acc.length - 1] as number : undefined,
      val_accuracy: history.history.val_acc ? history.history.val_acc[history.history.val_acc.length - 1] as number : undefined
    };
  }

  async predictEngagementScore(features: number[][]): Promise<number[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const xs = tf.tensor2d(features);
    const predictions = this.model.predict(xs) as tf.Tensor;
    const result = await predictions.data();

    xs.dispose();
    predictions.dispose();

    return Array.from(result);
  }
}

// Advanced Anomaly Detection with Autoencoders
export class AutoencoderAnomalyDetector {
  private encoder: tf.Sequential | null = null;
  private decoder: tf.Sequential | null = null;
  private threshold: number = 0.1;

  async initializeModel(inputDim: number = 10): Promise<void> {
    // Encoder
    this.encoder = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputDim], units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 2, activation: 'relu' })
      ]
    });

    // Decoder
    this.decoder = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [2], units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: inputDim, activation: 'sigmoid' })
      ]
    });

    // Combined autoencoder model
    this.encoder.compile({ optimizer: 'adam', loss: 'mse' });
    this.decoder.compile({ optimizer: 'adam', loss: 'mse' });
  }

  async trainAnomalyDetector(
    data: number[][],
    config: TrainingConfig = { epochs: 100, learningRate: 0.001, validationSplit: 0.2 }
  ): Promise<void> {
    if (!this.encoder || !this.decoder) {
      await this.initializeModel(data[0]?.length || 10);
    }

    const xs = tf.tensor2d(data);

    // Train encoder-decoder
    const encoded = this.encoder.predict(xs) as tf.Tensor;
    const decoded = this.decoder.predict(encoded) as tf.Tensor;

    const combinedModel = tf.sequential({
      layers: [
        ...(this.encoder.layers),
        ...(this.decoder.layers)
      ]
    });

    combinedModel.compile({ optimizer: 'adam', loss: 'mse' });

    await combinedModel.fit(xs, xs, {
      epochs: config.epochs,
      validationSplit: config.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Autoencoder Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
        }
      }
    });

    // Calculate reconstruction error threshold
    const reconstructions = combinedModel.predict(xs) as tf.Tensor;
    const errors = tf.sub(xs, reconstructions);
    const errorSquares = tf.square(errors);
    const meanErrors = tf.mean(errorSquares, 1);
    const errorValues = await meanErrors.data();

    this.threshold = this.calculateOptimalThreshold(errorValues);

    xs.dispose();
    reconstructions.dispose();
    errors.dispose();
    errorSquares.dispose();
    meanErrors.dispose();
  }

  private calculateOptimalThreshold(errors: Float32Array): number {
    // Use IQR method to set threshold
    const sorted = Array.from(errors).sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    return q3 + 1.5 * iqr;
  }

  detectAnomalies(data: number[][]): boolean[] {
    if (!this.encoder || !this.decoder) {
      throw new Error('Model not trained');
    }

    const xs = tf.tensor2d(data);

    // Get reconstructions
    const encoded = this.encoder.predict(xs) as tf.Tensor;
    const decoded = this.decoder.predict(encoded) as tf.Tensor;

    // Calculate reconstruction errors
    const errors = tf.sub(xs, decoded);
    const errorSquares = tf.square(errors);
    const meanErrors = tf.mean(errorSquares, 1);
    const errorValues = meanErrors.dataSync();

    const anomalies = errorValues.map(error => error > this.threshold);

    // Cleanup
    xs.dispose();
    encoded.dispose();
    decoded.dispose();
    errors.dispose();
    errorSquares.dispose();
    meanErrors.dispose();

    return anomalies;
  }

  getAnomalyScores(data: number[][]): number[] {
    if (!this.encoder || !this.decoder) {
      throw new Error('Model not trained');
    }

    const xs = tf.tensor2d(data);
    const encoded = this.encoder.predict(xs) as tf.Tensor;
    const decoded = this.decoder.predict(encoded) as tf.Tensor;

    const errors = tf.sub(xs, decoded);
    const errorSquares = tf.square(errors);
    const meanErrors = tf.mean(errorSquares, 1);
    const errorValues = meanErrors.dataSync();

    xs.dispose();
    encoded.dispose();
    decoded.dispose();
    errors.dispose();
    errorSquares.dispose();
    meanErrors.dispose();

    return Array.from(errorValues);
  }
}

// Time Series Decomposition for Better Forecasting
export class TimeSeriesDecomposer {
  async decomposeTimeSeries(data: number[], period: number = 12): Promise<{
    trend: number[];
    seasonal: number[];
    residual: number[];
  }> {
    if (data.length < period * 2) {
      throw new Error('Insufficient data for decomposition');
    }

    // Simple moving average for trend
    const trend = this.calculateMovingAverage(data, period);

    // Seasonal component (subtract trend from original)
    const detrended = data.map((val, i) => val - trend[i]);

    // Calculate seasonal pattern
    const seasonal = this.extractSeasonalPattern(detrended, period);

    // Residual (detrended - seasonal)
    const residual = detrended.map((val, i) => val - seasonal[i % period]);

    return { trend, seasonal, residual };
  }

  private calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
      const sum = data.slice(start, end).reduce((a, b) => a + b, 0);
      result.push(sum / (end - start));
    }

    return result;
  }

  private extractSeasonalPattern(detrended: number[], period: number): number[] {
    const seasonalSums = new Array(period).fill(0);
    const seasonalCounts = new Array(period).fill(0);

    detrended.forEach((val, i) => {
      const seasonIndex = i % period;
      seasonalSums[seasonIndex] += val;
      seasonalCounts[seasonIndex]++;
    });

    return seasonalSums.map((sum, i) => sum / seasonalCounts[i]);
  }
}

// Enhanced ML Insights with TensorFlow.js
export class EnhancedMLInsights {
  private forecaster: TensorFlowExpenseForecaster;
  private anomalyDetector: AutoencoderAnomalyDetector;
  private engagementPredictor: NeuralEngagementPredictor;
  private decomposer: TimeSeriesDecomposer;

  constructor() {
    this.forecaster = new TensorFlowExpenseForecaster();
    this.anomalyDetector = new AutoencoderAnomalyDetector();
    this.engagementPredictor = new NeuralEngagementPredictor();
    this.decomposer = new TimeSeriesDecomposer();
  }

  async initializeModels(): Promise<void> {
    try {
      // Initialize TensorFlow.js backend
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());

      // Models will be initialized when training data is available
    } catch (error) {
      console.error('Error initializing TensorFlow.js models:', error);
    }
  }

  async generateAdvancedForecast(
    expenseData: number[],
    config: TrainingConfig = { epochs: 100, learningRate: 0.001, validationSplit: 0.2 }
  ): Promise<{
    predictions: number[];
    confidence: number;
    decomposition: { trend: number[]; seasonal: number[]; residual: number[] };
    modelMetrics: ModelMetrics;
  }> {
    try {
      // Decompose time series for better understanding
      const decomposition = await this.decomposer.decomposeTimeSeries(expenseData);

      // Prepare features for neural network
      const features = this.prepareForecastingFeatures(expenseData);
      const labels = expenseData.slice(12); // Next values to predict

      // Train or use existing model
      const metrics = await this.forecaster.trainModel(features, labels, config);

      // Generate predictions
      const predictions = await this.forecaster.predict([features[features.length - 1]]);

      // Calculate confidence based on residual variance
      const residualVariance = this.calculateVariance(decomposition.residual);
      const confidence = Math.max(0.1, Math.min(0.95, 1 - (residualVariance / 10000)));

      return {
        predictions,
        confidence,
        decomposition,
        modelMetrics: metrics
      };
    } catch (error) {
      console.error('Error in advanced forecasting:', error);
      throw error;
    }
  }

  private prepareForecastingFeatures(data: number[]): number[][] {
    const features: number[][] = [];

    for (let i = 12; i < data.length; i++) {
      const featureVector: number[] = [];

      // Add lagged values
      for (let lag = 1; lag <= 12; lag++) {
        featureVector.push(data[i - lag]);
      }

      features.push(featureVector);
    }

    return features;
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  async detectAdvancedAnomalies(
    expenseData: number[][],
    config: TrainingConfig = { epochs: 50, learningRate: 0.001, validationSplit: 0.2 }
  ): Promise<{
    anomalies: boolean[];
    scores: number[];
    threshold: number;
  }> {
    try {
      await this.anomalyDetector.trainAnomalyDetector(expenseData, config);

      const anomalies = this.anomalyDetector.detectAnomalies(expenseData);
      const scores = this.anomalyDetector.getAnomalyScores(expenseData);

      return {
        anomalies,
        scores,
        threshold: (this.anomalyDetector as any).threshold
      };
    } catch (error) {
      console.error('Error in advanced anomaly detection:', error);
      throw error;
    }
  }

  // Cleanup method
  dispose(): void {
    this.forecaster.dispose();
  }
}

// Export enhanced ML utilities
export {
  TensorFlowExpenseForecaster,
  NeuralEngagementPredictor,
  AutoencoderAnomalyDetector,
  TimeSeriesDecomposer,
  EnhancedMLInsights
};