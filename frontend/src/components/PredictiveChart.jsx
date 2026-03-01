import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const PredictiveChart = ({ historicalData, darkMode, title }) => {
  const [predictions, setPredictions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const predictFuture = async () => {
    setIsPredicting(true);

    try {
      // Prepare training data
      const values = historicalData.map(d => d.value);
      const xs = tf.tensor2d(values.map((_, i) => [i]), [values.length, 1]);
      const ys = tf.tensor2d(values.map(v => [v]), [values.length, 1]);

      // Create and train model
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ units: 64, activation: 'relu', inputShape: [1] }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 1 })
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Train
      await model.fit(xs, ys, {
        epochs: 100,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
            }
          }
        }
      });

      // Calculate accuracy (R-squared)
      const predicted = model.predict(xs);
      const predictedValues = await predicted.data();
      const rSquared = calculateRSquared(values, Array.from(predictedValues));
      setAccuracy((rSquared * 100).toFixed(1));

      // Predict next 30 days
      const futurePredictions = [];
      const startIndex = values.length;

      for (let i = 0; i < 30; i++) {
        const predTensor = model.predict(tf.tensor2d([[startIndex + i]]));
        const predValue = (await predTensor.data())[0];
        
        futurePredictions.push({
          month: `Day ${i + 1}`,
          predicted: Math.max(0, predValue), // Ensure non-negative
          isPrediction: true
        });
        
        predTensor.dispose();
      }

      setPredictions(futurePredictions);

      // Cleanup
      xs.dispose();
      ys.dispose();
      model.dispose();

    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  const calculateRSquared = (actual, predicted) => {
    const mean = actual.reduce((a, b) => a + b) / actual.length;
    const ssTotal = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    return 1 - (ssRes / ssTotal);
  };

  const combinedData = [
    ...historicalData.map(d => ({ ...d, actual: d.value, isPrediction: false })),
    ...predictions
  ];

  return (
    <div className={`${cardBgClass} rounded-2xl p-6 shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-bold ${textClass} flex items-center gap-2`}>
            <Brain className="w-6 h-6 text-purple-600" />
            {title} - AI Forecast
          </h3>
          {accuracy && (
            <div className={`text-sm ${textSecondaryClass} mt-1`}>
              Model Accuracy: <span className="font-semibold text-green-600">{accuracy}%</span>
            </div>
          )}
        </div>
        <button
          onClick={predictFuture}
          disabled={isPredicting}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {isPredicting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Predicting...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              Predict Next 30 Days
            </>
          )}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
          <XAxis 
            dataKey="month" 
            stroke={darkMode ? '#9ca3af' : '#6b7280'}
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: darkMode ? '#1f2937' : '#fff', 
              border: 'none', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }} 
          />
          <Legend />
          
          {/* Actual data */}
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="Historical Data"
            connectNulls
          />
          
          {/* Predicted data */}
          <Line 
            type="monotone" 
            dataKey="predicted" 
            stroke="#06b6d4" 
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ fill: '#06b6d4', r: 4 }}
            name="AI Prediction"
            connectNulls
          />
          
          {/* Divider line */}
          {predictions.length > 0 && (
            <ReferenceLine 
              x={historicalData[historicalData.length - 1]?.month} 
              stroke="#ef4444" 
              strokeDasharray="3 3"
              label={{ value: 'Forecast →', position: 'top', fill: '#ef4444' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {predictions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border-l-4 border-purple-600`}
        >
          <div className={`font-semibold ${textClass} mb-2 flex items-center gap-2`}>
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Forecast Summary
          </div>
          <div className={`text-sm ${textSecondaryClass} space-y-1`}>
            <div>• Predicted trend for next 30 days</div>
            <div>• Average predicted value: <span className="font-semibold">{(predictions.reduce((sum, p) => sum + p.predicted, 0) / predictions.length).toFixed(2)}</span></div>
            <div>• Trend direction: <span className="font-semibold text-green-600">
              {predictions[predictions.length - 1].predicted > predictions[0].predicted ? '↑ Upward' : '↓ Downward'}
            </span></div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PredictiveChart;