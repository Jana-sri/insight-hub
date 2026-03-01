import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const fetchTopicData = async (topic) => {
  try {
    const [news, social, sentiment, metrics] = await Promise.all([
      axios.get(`${API_BASE}/news/${topic}`),
      axios.get(`${API_BASE}/social/${topic}`),
      axios.get(`${API_BASE}/sentiment/${topic}`),
      axios.get(`${API_BASE}/metrics/${topic}`)
    ]);

    return {
      news: news.data,
      social: social.data,
      sentiment: sentiment.data,
      metrics: metrics.data
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const compareTopics = async (topic1, topic2) => {
  try {
    const response = await axios.post(`${API_BASE}/compare`, {
      topic1,
      topic2
    });
    return response.data;
  } catch (error) {
    console.error('Compare Error:', error);
    throw error;
  }
};

export const getDashboardInsights = async (topic, data) => {
  try {
    const response = await axios.post(`${API_BASE}/insights/dashboard`, {
      topic,
      data
    });
    // FIX: Extract insights from response.data.insights
    return response.data.insights || response.data;
  } catch (error) {
    console.error('Insights Error:', error);
    return null;
  }
};

export const getComparisonSuggestions = async (topic) => {
  try {
    const response = await axios.get(`${API_BASE}/insights/compare-suggestions/${topic}`);
    return response.data;
  } catch (error) {
    console.error('Suggestions Error:', error);
    return { suggestions: [] };
  }
};

export const analyzeDatasetPurpose = async (analysis, purpose) => {
  try {
    const response = await axios.post(`${API_BASE}/dataset/analyze`, {
      analysis,
      purpose
    });
    return response.data;
  } catch (error) {
    console.error('Dataset Analysis Error:', error);
    throw error;
  }
};