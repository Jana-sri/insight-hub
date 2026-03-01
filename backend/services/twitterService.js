const axios = require('axios');

async function searchTwitter(topic) {
  try {
    console.log(`🐦 Searching Twitter for: ${topic}`);
    
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      },
      params: {
        query: `${topic} -is:retweet lang:en`,
        max_results: 10,
        'tweet.fields': 'created_at,public_metrics'
      }
    });

    if (!response.data.data) {
      console.log('⚠️ No Twitter data');
      return [];
    }

    const tweets = response.data.data.map(tweet => ({
      platform: 'Twitter',
      title: tweet.text.length > 100 ? tweet.text.substring(0, 100) + '...' : tweet.text,
      engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count,
      url: `https://twitter.com/user/status/${tweet.id}`
    }));

    console.log(`✅ Found ${tweets.length} tweets`);
    return tweets;
    
  } catch (error) {
    console.error('❌ Twitter Error:', error.message);
    return [];
  }
}

module.exports = { searchTwitter };