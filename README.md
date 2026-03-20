# InsightHub — AI Multi-Source Intelligence Platform

A decision-intelligence platform that aggregates real-time data from news, social media, and financial sources to generate context-aware insights on any user query.

## Features
- Real-time data aggregation from multiple sources
- Structured risk analysis and sentiment trend tracking
- Comparative evaluations with explainable dashboards
- Alert mechanisms for continuous monitoring

## Tech Stack
`Python` `LangChain` `React` `JavaScript` `NLP` `REST APIs`

## Setup
```bash
# Clone the repo
git clone https://github.com/Jana-sri/insight-hub.git
cd insight-hub

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
npm start
```

## Project Structure
```
insight-hub/
├── backend/    # Python API + LangChain logic
└── frontend/   # React dashboard UI
```

## How It Works

1. User enters a query (e.g. "Analyse Tesla stock sentiment")
2. Platform fetches real-time data from news, social media & financial APIs
3. LangChain processes and chunks the data
4. LLM generates structured insights — risk analysis, sentiment trends, comparisons
5. Results displayed on an interactive React dashboard with continuous alerts
