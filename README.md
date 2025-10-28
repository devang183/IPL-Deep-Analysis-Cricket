# 🏏 IPL Cricket Analytics Tool

A powerful and beautiful web application for analyzing IPL ball-by-ball data from 2008 to 2025.

## Features

- **Player Performance Analysis**: Analyze how players perform in specific phases of the game
- **Contextual Predictions**: Answer questions like "If Kohli has played 15 balls by 7th over, how much does he score in the next 3 overs?"
- **Dismissal Patterns**: Discover where players get out most frequently after playing a certain number of balls
- **Beautiful Visualizations**: Interactive charts and graphs powered by modern UI frameworks
- **Real-time Queries**: Fast MongoDB aggregations for instant insights

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Configure MongoDB**:
   - Copy `.env.example` to `.env`
   - Update `MONGODB_URI` with your MongoDB connection string
   - Ensure your database name is `hello` and collection is `IPL-ALL`

3. **Run the application**:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend application on `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Select a player from the dropdown
3. Choose an analysis type:
   - **Phase Performance**: Analyze scoring in specific over phases
   - **Dismissal Analysis**: Find dismissal patterns
   - **Custom Query**: Build your own analysis

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui, Recharts
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Icons**: Lucide React

## API Endpoints

- `GET /api/players` - Get list of all players
- `POST /api/analyze/phase-performance` - Analyze player performance in phases
- `POST /api/analyze/dismissal-patterns` - Analyze dismissal patterns
- `GET /api/stats/:player` - Get overall player statistics
