# 🏗️ Application Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                          │
│                   http://localhost:5173                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Player     │  │    Phase     │  │  Dismissal   │     │
│  │   Selector   │  │   Analysis   │  │   Analysis   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Player     │  │    Charts    │  │     Stats    │     │
│  │    Stats     │  │  (Recharts)  │  │  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Axios HTTP Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Backend API                         │
│                http://localhost:3001                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                          │  │
│  │  • GET  /api/players                                 │  │
│  │  • GET  /api/stats/:player                           │  │
│  │  • POST /api/analyze/phase-performance               │  │
│  │  • POST /api/analyze/dismissal-patterns              │  │
│  │  • GET  /api/schema                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MongoDB Driver
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                         │
│                  mongodb://localhost:27017                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database: hello                                     │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Collection: IPL-ALL                           │ │  │
│  │  │  • Ball-by-ball IPL data (2008-2025)          │ │  │
│  │  │  • ~1M+ documents                              │ │  │
│  │  │  • Indexed on: batter, ID, innings            │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Frontend (React + Vite)

**Technology Stack**:
- React 18
- Vite (build tool)
- TailwindCSS (styling)
- Recharts (data visualization)
- Lucide React (icons)
- Axios (HTTP client)

**Components**:

1. **App.jsx** - Main application container
   - Manages global state (selected player, active tab)
   - Handles navigation between analysis types
   - Fetches player list on mount

2. **PlayerSelector.jsx** - Player search and selection
   - Searchable dropdown with 1000+ players
   - Real-time filtering
   - Selected player display

3. **PhaseAnalysis.jsx** - Phase performance analyzer
   - Form inputs for phase parameters
   - Calls `/api/analyze/phase-performance`
   - Displays results with charts and metrics
   - Answers: "What happens in next N overs after playing X balls?"

4. **DismissalAnalysis.jsx** - Dismissal pattern analyzer
   - Analyzes where players get dismissed
   - Calls `/api/analyze/dismissal-patterns`
   - Pie charts for phase distribution
   - Bar charts for dismissal types

5. **PlayerStats.jsx** - Overall statistics dashboard
   - Career statistics
   - Boundary analysis
   - Strike rate, average, dots
   - Visual distribution charts

### Backend (Node.js + Express)

**Technology Stack**:
- Node.js
- Express.js
- MongoDB Node Driver
- CORS enabled
- dotenv for configuration

**API Endpoints**:

1. **GET /api/players**
   - Returns list of all unique batsmen
   - Uses MongoDB `distinct()` on 'batter' field
   - Sorted alphabetically

2. **GET /api/stats/:player**
   - Aggregates overall career statistics
   - Calculates: runs, balls, SR, average, boundaries, dots
   - Single aggregation pipeline

3. **POST /api/analyze/phase-performance**
   - Complex aggregation pipeline
   - Groups balls by match and innings
   - Filters innings matching criteria
   - Calculates phase statistics
   - Returns: average runs, SR, dismissal rate, distribution

4. **POST /api/analyze/dismissal-patterns**
   - Finds dismissals after N balls
   - Groups by over ranges (powerplay, middle, death)
   - Categorizes dismissal types
   - Returns: phase distribution, dismissal types, insights

### Database (MongoDB)

**Collection Schema**:
```javascript
{
  ID: Number,              // Match identifier
  innings: Number,         // 1 or 2
  overs: Number,          // 0-19 (over number)
  ballnumber: Number,     // Ball number in innings
  batter: String,         // Batsman name
  bowler: String,         // Bowler name
  batsman_run: Number,    // 0, 1, 2, 3, 4, 6
  extras_run: Number,     // Wide, no-ball, bye, leg-bye
  total_run: Number,      // batsman_run + extras_run
  isWicketDelivery: Number, // 0 or 1
  kind: String,           // caught, bowled, lbw, run out, etc.
  fielders_involved: String,
  BattingTeam: String
}
```

**Indexes** (Recommended):
```javascript
db.getCollection('IPL-ALL').createIndex({ batter: 1 })
db.getCollection('IPL-ALL').createIndex({ ID: 1, innings: 1 })
db.getCollection('IPL-ALL').createIndex({ batter: 1, ID: 1, innings: 1 })
```

## Data Flow Examples

### Example 1: Phase Performance Query

**User Input**:
- Player: "V Kohli"
- Balls played before: 15
- Overs played before: 7
- Next overs: 3
- Balls in next phase: 10

**Flow**:
1. Frontend sends POST to `/api/analyze/phase-performance`
2. Backend runs aggregation:
   - Groups all balls by match+innings
   - Filters innings where Kohli played 15+ balls before over 7
   - Extracts balls from overs 7-10
   - Filters innings where he played 10+ balls in that phase
   - Calculates aggregate statistics
3. Returns JSON with analysis
4. Frontend displays in charts and cards

**MongoDB Aggregation**:
```javascript
[
  { $match: { batter: "V Kohli" } },
  { $group: { _id: { matchId: "$ID", inning: "$innings" }, balls: { $push: {...} } } },
  { $project: { /* filter balls by over ranges */ } },
  { $match: { /* filter by criteria */ } }
]
```

### Example 2: Dismissal Pattern Query

**User Input**:
- Player: "V Kohli"
- Balls played: 20

**Flow**:
1. Frontend sends POST to `/api/analyze/dismissal-patterns`
2. Backend aggregation:
   - Groups balls by match+innings
   - Finds innings with 20+ balls AND dismissal
   - Extracts dismissal details (over, type)
   - Groups by phase and type
3. Returns categorized dismissals
4. Frontend shows pie charts and insights

## Performance Considerations

### Frontend
- Lazy loading of charts (only render when tab is active)
- Debounced search in player selector
- Memoized calculations
- Responsive design for mobile

### Backend
- Efficient MongoDB aggregations
- Single database connection (reused)
- No unnecessary data transfer
- Indexed queries

### Database
- Aggregation pipelines optimized
- Early filtering with `$match`
- Projection to reduce data transfer
- Indexes on frequently queried fields

## Scalability

**Current**: Handles 1M+ documents efficiently

**Future Enhancements**:
- Add Redis caching for frequently accessed data
- Implement pagination for large result sets
- Add database connection pooling
- Implement query result caching
- Add rate limiting for API endpoints

## Security

**Current**:
- CORS enabled for localhost
- Environment variables for sensitive data
- No authentication (local use)

**Production Recommendations**:
- Add JWT authentication
- Rate limiting
- Input validation and sanitization
- HTTPS only
- MongoDB user authentication
- API key for external access

## Development Workflow

```bash
# Start development
npm run dev

# Backend only
npm run server

# Frontend only
npm run client

# Build for production
npm run build

# Start production
npm start
```

## File Structure

```
Cricketing-Prediction/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx        # Main app
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/
│   └── index.js           # Express API server
├── package.json           # Root dependencies
├── .env                   # Environment variables
├── .env.example           # Template
├── README.md              # Documentation
├── QUICKSTART.md          # Quick start guide
├── MONGODB_SETUP.md       # MongoDB setup
└── ARCHITECTURE.md        # This file
```

## Technology Choices

### Why React?
- Component-based architecture
- Large ecosystem
- Fast rendering with Virtual DOM
- Great developer experience

### Why Vite?
- Lightning-fast HMR
- Optimized builds
- Modern ES modules
- Better than Create React App

### Why TailwindCSS?
- Utility-first approach
- No CSS file management
- Consistent design system
- Highly customizable

### Why MongoDB?
- Perfect for ball-by-ball data
- Powerful aggregation framework
- Flexible schema
- Excellent for analytics queries

### Why Express?
- Minimal and flexible
- Large middleware ecosystem
- Easy to understand
- Perfect for REST APIs

## Future Enhancements

1. **Machine Learning Integration**
   - Predict runs in next phase using ML models
   - Predict dismissal probability
   - Player form analysis

2. **Advanced Analytics**
   - Bowler analysis
   - Team analysis
   - Match situation analysis
   - Partnership analysis

3. **Comparison Features**
   - Compare multiple players
   - Head-to-head statistics
   - Era comparisons

4. **Export Features**
   - Export to CSV/Excel
   - PDF reports
   - Share analysis via link

5. **Real-time Updates**
   - WebSocket for live match data
   - Real-time statistics updates
   - Live match predictions

6. **Mobile App**
   - React Native version
   - Offline support
   - Push notifications
