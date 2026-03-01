import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatisticsPanel = ({ data, darkMode }) => {
  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  const statistics = useMemo(() => {
    const values = data.map(d => d.value);
    
    // Basic stats
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mode = calculateMode(values);
    
    // Variance and Standard Deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Quartiles
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    // Skewness
    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / values.length;
    
    // Outliers
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound);
    
    // Distribution
    const distribution = calculateDistribution(values, 10);
    
    return {
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      mode: mode.toFixed(2),
      stdDev: stdDev.toFixed(2),
      variance: variance.toFixed(2),
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2),
      range: (Math.max(...values) - Math.min(...values)).toFixed(2),
      q1: q1.toFixed(2),
      q3: q3.toFixed(2),
      iqr: iqr.toFixed(2),
      skewness: skewness.toFixed(3),
      outliers: outliers.length,
      distribution,
      coefficientOfVariation: ((stdDev / mean) * 100).toFixed(2)
    };
  }, [data]);

  function calculateMode(arr) {
    const frequency = {};
    arr.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency).filter(key => frequency[key] === maxFreq);
    return parseFloat(modes[0]);
  }

  function calculateDistribution(values, bins) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const distribution = Array(bins).fill(0).map((_, i) => ({
      range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
      count: 0
    }));
    
    values.forEach(val => {
      const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
      distribution[binIndex].count++;
    });
    
    return distribution;
  }

  const getSkewnessInterpretation = (skew) => {
    const value = parseFloat(skew);
    if (value > 0.5) return { text: 'Right-skewed (positive)', color: 'text-blue-600', icon: TrendingUp };
    if (value < -0.5) return { text: 'Left-skewed (negative)', color: 'text-red-600', icon: TrendingDown };
    return { text: 'Symmetric', color: 'text-green-600', icon: Activity };
  };

  const skewInfo = getSkewnessInterpretation(statistics.skewness);
  const SkewnessIcon = skewInfo.icon;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className={`${cardBgClass} rounded-2xl p-6 shadow-sm border ${borderClass}`}>
        <h3 className={`text-xl font-bold ${textClass} mb-6 flex items-center gap-2`}>
          <BarChart3 className="w-6 h-6 text-purple-600" />
          Statistical Analysis
        </h3>

        <div className="grid grid-cols-4 gap-4">
          {/* Central Tendency */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Mean (Average)</div>
            <div className={`text-2xl font-bold text-blue-600`}>{statistics.mean}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Median</div>
            <div className={`text-2xl font-bold text-purple-600`}>{statistics.median}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-pink-900/20' : 'bg-pink-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Mode</div>
            <div className={`text-2xl font-bold text-pink-600`}>{statistics.mode}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Std Deviation</div>
            <div className={`text-2xl font-bold text-green-600`}>{statistics.stdDev}</div>
          </div>

          {/* Spread */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Min Value</div>
            <div className={`text-2xl font-bold ${textClass}`}>{statistics.min}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Max Value</div>
            <div className={`text-2xl font-bold ${textClass}`}>{statistics.max}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Range</div>
            <div className={`text-2xl font-bold ${textClass}`}>{statistics.range}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>IQR</div>
            <div className={`text-2xl font-bold ${textClass}`}>{statistics.iqr}</div>
          </div>

          {/* Advanced Stats */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Q1 (25%)</div>
            <div className={`text-2xl font-bold text-yellow-600`}>{statistics.q1}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-orange-900/20' : 'bg-orange-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Q3 (75%)</div>
            <div className={`text-2xl font-bold text-orange-600`}>{statistics.q3}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>Outliers</div>
            <div className={`text-2xl font-bold text-red-600`}>{statistics.outliers}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20' : 'bg-cyan-50'} border ${borderClass}`}>
            <div className={`text-sm font-medium ${textSecondaryClass} mb-1`}>CV (%)</div>
            <div className={`text-2xl font-bold text-cyan-600`}>{statistics.coefficientOfVariation}%</div>
          </div>
        </div>

        {/* Skewness Indicator */}
        <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
          <div className="flex items-center justify-between">
            <div className={`font-medium ${textClass}`}>Distribution Shape</div>
            <div className={`flex items-center gap-2 ${skewInfo.color}`}>
              <SkewnessIcon className="w-5 h-5" />
              <span className="font-semibold">{skewInfo.text}</span>
              <span className={`text-sm ${textSecondaryClass}`}>(skewness: {statistics.skewness})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Histogram */}
      <div className={`${cardBgClass} rounded-2xl p-6 shadow-sm border ${borderClass}`}>
        <h3 className={`text-xl font-bold ${textClass} mb-6 flex items-center gap-2`}>
          <PieChartIcon className="w-6 h-6 text-purple-600" />
          Data Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statistics.distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="range" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
            <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#1f2937' : '#fff', 
                border: 'none', 
                borderRadius: '8px' 
              }} 
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {statistics.distribution.map((entry, index) => (
                <Cell key={index} fill={`hsl(${(index * 30) % 360}, 70%, 60%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      <div className={`${cardBgClass} rounded-2xl p-6 shadow-sm border ${borderClass}`}>
        <h3 className={`text-xl font-bold ${textClass} mb-4`}>Statistical Insights</h3>
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <div className={`text-sm ${textClass}`}>
              <strong>Variability:</strong> The coefficient of variation is {statistics.coefficientOfVariation}%, indicating 
              {parseFloat(statistics.coefficientOfVariation) < 15 ? ' low' : parseFloat(statistics.coefficientOfVariation) < 30 ? ' moderate' : ' high'} variability in the data.
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <div className={`text-sm ${textClass}`}>
              <strong>Central Tendency:</strong> Mean ({statistics.mean}) and median ({statistics.median}) are 
              {Math.abs(parseFloat(statistics.mean) - parseFloat(statistics.median)) < parseFloat(statistics.stdDev) * 0.5 ? ' close' : ' different'}, 
              suggesting {Math.abs(parseFloat(statistics.mean) - parseFloat(statistics.median)) < parseFloat(statistics.stdDev) * 0.5 ? 'symmetric' : 'skewed'} distribution.
            </div>
          </div>
          
          {statistics.outliers > 0 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <div className={`text-sm ${textClass}`}>
                <strong>Outliers Detected:</strong> Found {statistics.outliers} outlier(s) that deviate significantly from the typical pattern.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;