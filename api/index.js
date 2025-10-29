const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let cachedDb = null;
let cachedCollection = null;

async function connectToDatabase() {
  if (cachedDb && cachedCollection) {
    return { db: cachedDb, collection: cachedCollection };
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MongoDB URI not configured');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'hello');
  const collection = db.collection(process.env.COLLECTION_NAME || 'IPL-ALL');

  cachedDb = db;
  cachedCollection = collection;

  return { db, collection };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cricket Analytics API is running' });
});

// Get all unique players
app.get('/api/players', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const batsmen = await collection.distinct('batter');
    const players = batsmen.filter(p => p && p.trim() !== '').sort();
    res.json({ players, count: players.length });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get player overall stats
app.get('/api/player/:name/stats', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const playerName = req.params.name;

    const innings = await collection
      .find({ batter: playerName })
      .sort({ match_id: 1, ball: 1 })
      .toArray();

    if (innings.length === 0) {
      return res.json({ message: 'No data found for this player' });
    }

    const totalRuns = innings.reduce((sum, ball) => sum + (ball.batsman_run || 0), 0);
    const totalBalls = innings.length;
    const strikeRate = ((totalRuns / totalBalls) * 100).toFixed(2);
    const dotBalls = innings.filter(ball => ball.batsman_run === 0).length;
    const dotBallPercentage = ((dotBalls / totalBalls) * 100).toFixed(2);

    const fours = innings.filter(ball => ball.batsman_run === 4).length;
    const sixes = innings.filter(ball => ball.batsman_run === 6).length;
    const dismissals = innings.filter(ball => ball.isWicketDelivery === 1 || ball.isWicketDelivery === true).length;

    const average = dismissals > 0 ? (totalRuns / dismissals).toFixed(2) : totalRuns.toFixed(2);
    const runsPerOver = (totalRuns / (totalBalls / 6)).toFixed(2);

    const ballDistribution = [
      { name: 'Dot Balls', value: dotBalls, percentage: dotBallPercentage },
      { name: 'Singles/Doubles', value: innings.filter(b => [1,2,3].includes(b.batsman_run)).length },
      { name: 'Fours', value: fours },
      { name: 'Sixes', value: sixes },
    ];

    res.json({
      player: playerName,
      stats: {
        totalRuns,
        totalBalls,
        strikeRate: parseFloat(strikeRate),
        average: parseFloat(average),
        dotBalls,
        dotBallPercentage: parseFloat(dotBallPercentage),
        fours,
        sixes,
        dismissals,
        runsPerOver: parseFloat(runsPerOver),
        ballDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// Analyze phase performance
app.post('/api/analyze/phase-performance', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const { player, ballsPlayedBefore, oversPlayedBefore, nextOvers, ballsInNextPhase } = req.body;

    const pipeline = [
      { $match: { batter: player } },
      { $sort: { match_id: 1, ball: 1 } },
      {
        $group: {
          _id: "$match_id",
          balls: { $push: "$$ROOT" }
        }
      }
    ];

    const innings = await collection.aggregate(pipeline).toArray();

    let matchingInnings = [];

    for (const inning of innings) {
      const balls = inning.balls;
      let ballsPlayed = 0;
      let phaseStartIndex = -1;

      for (let i = 0; i < balls.length; i++) {
        ballsPlayed++;
        const currentOver = balls[i].overs || 0;

        if (ballsPlayed >= ballsPlayedBefore && currentOver >= oversPlayedBefore) {
          phaseStartIndex = i;
          break;
        }
      }

      if (phaseStartIndex === -1) continue;

      const endOver = oversPlayedBefore + nextOvers;
      const phaseBalls = [];

      for (let i = phaseStartIndex; i < balls.length; i++) {
        const currentOver = balls[i].overs || 0;
        if (currentOver < endOver) {
          phaseBalls.push(balls[i]);
        } else {
          break;
        }
      }

      if (phaseBalls.length >= ballsInNextPhase) {
        matchingInnings.push(phaseBalls);
      }
    }

    if (matchingInnings.length === 0) {
      return res.json({ message: 'No innings match the criteria' });
    }

    let totalRuns = 0;
    let totalBalls = 0;
    let dismissals = 0;
    let runsDistribution = [];

    for (const phaseBalls of matchingInnings) {
      const runs = phaseBalls.reduce((sum, ball) => sum + (ball.batsman_run || 0), 0);
      totalRuns += runs;
      totalBalls += phaseBalls.length;
      runsDistribution.push(runs);

      if (phaseBalls.some(ball => ball.isWicketDelivery === 1 || ball.isWicketDelivery === true)) {
        dismissals++;
      }
    }

    const averageRuns = (totalRuns / matchingInnings.length).toFixed(2);
    const strikeRate = ((totalRuns / totalBalls) * 100).toFixed(2);
    const dismissalRate = ((dismissals / matchingInnings.length) * 100).toFixed(2);

    res.json({
      matchingInnings: matchingInnings.length,
      analysis: {
        averageRuns: parseFloat(averageRuns),
        strikeRate: parseFloat(strikeRate),
        dismissalRate: parseFloat(dismissalRate),
        totalRuns,
        totalBalls,
        dismissals,
        runsDistribution
      }
    });
  } catch (error) {
    console.error('Error analyzing phase performance:', error);
    res.status(500).json({ error: 'Failed to analyze phase performance' });
  }
});

// Analyze dismissal patterns
app.post('/api/analyze/dismissal-patterns', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const { player, ballsPlayed } = req.body;

    const pipeline = [
      { $match: { batter: player } },
      { $sort: { match_id: 1, ball: 1 } },
      {
        $group: {
          _id: "$match_id",
          balls: { $push: "$$ROOT" }
        }
      }
    ];

    const innings = await collection.aggregate(pipeline).toArray();

    const dismissals = [];

    for (const inning of innings) {
      const balls = inning.balls;

      for (let i = 0; i < balls.length; i++) {
        if (i >= ballsPlayed && (balls[i].isWicketDelivery === 1 || balls[i].isWicketDelivery === true)) {
          dismissals.push({
            ballNumber: i + 1,
            over: balls[i].overs || 0,
            dismissalType: balls[i].kind || 'unknown'
          });
          break;
        }
      }
    }

    if (dismissals.length === 0) {
      return res.json({ totalDismissals: 0, message: 'No dismissals found after specified balls played' });
    }

    const overRanges = {
      'Powerplay (0-6)': 0,
      'Middle (7-15)': 0,
      'Death (16-20)': 0
    };

    const dismissalTypes = {};

    dismissals.forEach(d => {
      const over = d.over;
      if (over < 6) overRanges['Powerplay (0-6)']++;
      else if (over < 15) overRanges['Middle (7-15)']++;
      else overRanges['Death (16-20)']++;

      dismissalTypes[d.dismissalType] = (dismissalTypes[d.dismissalType] || 0) + 1;
    });

    res.json({
      totalDismissals: dismissals.length,
      overRanges,
      dismissalTypes,
      dismissals
    });
  } catch (error) {
    console.error('Error analyzing dismissal patterns:', error);
    res.status(500).json({ error: 'Failed to analyze dismissal patterns' });
  }
});

// Export for Vercel
module.exports = app;
