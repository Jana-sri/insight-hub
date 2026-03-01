import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';

const FilterPanel = ({ columns, data, onFilterChange, darkMode }) => {
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  const handleFilterChange = (column, value) => {
    const newFilters = { ...filters, [column]: value };
    setFilters(newFilters);
    
    // Apply filters
    let filteredData = [...data];
    Object.entries(newFilters).forEach(([col, val]) => {
      if (val) {
        filteredData = filteredData.filter(row => 
          String(row[col]).toLowerCase().includes(String(val).toLowerCase())
        );
      }
    });
    
    onFilterChange(filteredData);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange(data);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={`${cardBgClass} rounded-xl p-4 border ${borderClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-purple-600" />
          <span className={`font-semibold ${textClass}`}>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`text-sm ${textSecondaryClass} hover:text-purple-600 transition`}
        >
          {showFilters ? 'Hide' : 'Show'}
        </button>
      </div>

      {showFilters && (
        <div className="space-y-3">
          {columns.map(column => (
            <div key={column}>
              <label className={`block text-sm font-medium ${textClass} mb-1`}>
                {column}
              </label>
              <input
                type="text"
                value={filters[column] || ''}
                onChange={(e) => handleFilterChange(column, e.target.value)}
                placeholder={`Filter by ${column}...`}
                className={`w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-purple-500 ${cardBgClass} ${textClass} text-sm`}
              />
            </div>
          ))}
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;