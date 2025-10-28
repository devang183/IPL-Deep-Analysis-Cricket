# 🏏 Quick Start Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB running locally or connection string to remote MongoDB
- Your IPL-ALL collection in the `hello` database

## Installation

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` file** with your MongoDB connection:
   ```
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=hello
   COLLECTION_NAME=IPL-ALL
   PORT=3001
   ```

3. **Install dependencies**:
   ```bash
   # Backend
   npm install
   
   # Frontend
   cd client && npm install && cd ..
   ```

## Running the Application

### Development Mode (Recommended)

Run both frontend and backend together:
```bash
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Production Mode

Build and run:
```bash
npm run build
npm start
```

## Using the Application

### 1. Phase Performance Analysis

**Example Question**: "If Kohli has played 15 balls by 7th over, how much does he score in the next 3 overs assuming he plays 10 balls in that phase?"

**Steps**:
1. Select "V Kohli" from the player dropdown
2. Click on "Phase Performance" tab
3. Enter:
   - Balls Played Before Phase: `15`
   - Overs Played Before Phase: `7`
   - Next Overs to Analyze: `3`
   - Balls in Next Phase: `10`
4. Click "Analyze Performance"

**Results**: You'll see:
- Average runs scored in that phase
- Strike rate
- Dismissal rate
- Distribution of runs across all matching innings

### 2. Dismissal Pattern Analysis

**Example Question**: "Where does Kohli get out mostly after playing 20 balls?"

**Steps**:
1. Select "V Kohli" from the player dropdown
2. Click on "Dismissal Patterns" tab
3. Enter Balls Played Threshold: `20`
4. Click "Analyze Dismissals"

**Results**: You'll see:
- Dismissals by phase (Powerplay, Middle, Death)
- Types of dismissals
- Most vulnerable phase
- Most common dismissal type

### 3. Overall Statistics

View comprehensive career statistics:
- Total runs, balls, strike rate, average
- Boundary statistics (4s, 6s)
- Dot ball percentage
- Visual charts and distributions

## API Endpoints

You can also use the API directly:

### Get All Players
```bash
curl http://localhost:3001/api/players
```

### Get Player Stats
```bash
curl http://localhost:3001/api/stats/V%20Kohli
```

### Analyze Phase Performance
```bash
curl -X POST http://localhost:3001/api/analyze/phase-performance \
  -H "Content-Type: application/json" \
  -d '{
    "player": "V Kohli",
    "ballsPlayedBefore": 15,
    "oversPlayedBefore": 7,
    "nextOvers": 3,
    "ballsInNextPhase": 10
  }'
```

### Analyze Dismissal Patterns
```bash
curl -X POST http://localhost:3001/api/analyze/dismissal-patterns \
  -H "Content-Type: application/json" \
  -d '{
    "player": "V Kohli",
    "ballsPlayed": 20
  }'
```

## Expected Data Structure

The application expects your MongoDB collection to have documents with these fields:

- `batter`: Player name (string)
- `batsman_run`: Runs scored on that ball (number)
- `ballnumber`: Ball number in the innings (number)
- `overs`: Over number (number)
- `isWicketDelivery`: 1 if wicket, 0 otherwise (number)
- `kind`: Type of dismissal (string)
- `ID`: Match ID (number/string)
- `innings`: Innings number (number)

## Troubleshooting

### Cannot connect to MongoDB
- Ensure MongoDB is running: `mongosh` or check your MongoDB service
- Verify connection string in `.env` file
- Check if database name and collection name are correct

### No players showing up
- Verify your collection has data: Use `playground-1.mongodb.js` to test
- Check that the `batter` field exists in your documents

### Port already in use
- Change the PORT in `.env` file
- Or kill the process using the port: `lsof -ti:3001 | xargs kill`

## Features

✅ **Phase-based Performance Analysis**: Understand how players perform in specific game situations  
✅ **Dismissal Pattern Recognition**: Identify when and how players get out  
✅ **Comprehensive Statistics**: View overall career metrics  
✅ **Beautiful Visualizations**: Interactive charts and graphs  
✅ **Fast Queries**: Optimized MongoDB aggregations  
✅ **Responsive Design**: Works on desktop and mobile  

## Next Steps

- Add more analysis types (bowler analysis, team analysis)
- Export results to CSV/PDF
- Compare multiple players
- Add machine learning predictions
- Historical trend analysis

Enjoy analyzing IPL data! 🏏
