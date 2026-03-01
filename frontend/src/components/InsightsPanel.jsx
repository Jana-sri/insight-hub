import React from 'react';
import { TrendingUp, TrendingDown, Minus, Lightbulb, AlertCircle } from 'lucide-react';

const InsightsPanel = ({ insights, darkMode }) => {
  if (!insights || !insights.insights || insights.insights.length === 0) {
    return null;
  }

  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'negative': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getImportanceBadge = (importance) => {
    const colors = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
    };
    return colors[importance] || colors.medium;
  };

  return (
    <div className={`${cardBgClass} rounded-2xl p-6 shadow-sm border ${borderClass}`}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-6 h-6 text-purple-600" />
        <h3 className={`text-xl font-bold ${textClass}`}>AI Insights</h3>
      </div>

      {/* Key Recommendation */}
      {insights.recommendation && (
        <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border-l-4 border-purple-600`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className={`font-semibold ${textClass} mb-1`}>Key Recommendation</div>
              <div className={`text-sm ${textSecondaryClass}`}>{insights.recommendation}</div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Insights */}
      <div className="space-y-3">
        {insights.insights.map((insight, i) => (
          <div key={i} className={`p-4 rounded-lg border ${borderClass} hover:shadow-md transition`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getInsightIcon(insight.type)}
                <span className={`font-semibold ${textClass}`}>{insight.title}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${getImportanceBadge(insight.importance)}`}>
                {insight.importance}
              </span>
            </div>
            <p className={`text-sm ${textSecondaryClass}`}>{insight.description}</p>
          </div>
        ))}
      </div>

      {/* Best Charts Recommendation */}
      {insights.bestCharts && insights.bestCharts.length > 0 && (
        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm font-medium ${textClass} mb-2`}>Recommended Charts:</div>
          <div className="flex gap-2 flex-wrap">
            {insights.bestCharts.map((chart, i) => (
              <span key={i} className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-600' : 'bg-white'} border ${borderClass}`}>
                {chart}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;