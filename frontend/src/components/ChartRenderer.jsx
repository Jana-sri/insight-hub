import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ChartRenderer = ({ type, data, dataKey = 'value', darkMode, title }) => {
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  const tooltipStyle = {
    backgroundColor: darkMode ? '#1f2937' : '#fff',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  };

  const axisColor = darkMode ? '#9ca3af' : '#6b7280';
  const gridColor = darkMode ? '#374151' : '#f0f0f0';

  switch (type) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#8b5cf6" 
              strokeWidth={3} 
              dot={{ fill: '#8b5cf6', r: 5 }}
              name={title || 'Value'}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.6}
              name={title || 'Value'}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar 
              dataKey={dataKey} 
              fill="#8b5cf6" 
              radius={[8, 8, 0, 0]}
              name={title || 'Value'}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.month}: ${entry[dataKey]}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'radar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="month" stroke={axisColor} />
            <PolarRadiusAxis stroke={axisColor} />
            <Radar 
              name={title || 'Value'} 
              dataKey={dataKey} 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.6} 
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis dataKey={dataKey} stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter 
              name={title || 'Value'} 
              data={data} 
              fill="#8b5cf6" 
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
};

export default ChartRenderer;