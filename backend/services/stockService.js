const axios = require('axios');

async function getStockData(symbol) {
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: process.env.ALPHA_VANTAGE_KEY
      }
    });

    const quote = response.data['Global Quote'];
    if (!quote || !quote['01. symbol']) return null;

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
      volume: parseInt(quote['06. volume'])
    };
  } catch (error) {
    return null;
  }
}

async function getCryptoData(symbol) {
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: symbol,
        to_currency: 'USD',
        apikey: process.env.ALPHA_VANTAGE_KEY
      }
    });

    const data = response.data['Realtime Currency Exchange Rate'];
    if (!data) return null;

    return {
      symbol: data['1. From_Currency Code'],
      price: parseFloat(data['5. Exchange Rate']),
      name: data['2. From_Currency Name']
    };
  } catch (error) {
    return null;
  }
}

module.exports = { getStockData, getCryptoData };