require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
let collection;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    db = client.db(process.env.DB_NAME || 'hello');
    collection = db.collection(process.env.COLLECTION_NAME || 'IPL-ALL');
    
    // Test query to verify collection
    const count = await collection.countDocuments();
    console.log(`📊 Collection has ${count} documents`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cricket Analytics API is running' });
});

// Get all unique players
app.get('/api/players', async (req, res) => {
  try {
    const batsmen = await collection.distinct('batter');
    const players = batsmen.filter(p => p && p.trim() !== '').sort();
    res.json({ players, count: players.length });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Search players by query
app.get('/api/players/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.length < 2) {
      return res.json([]);
    }

    const batsmen = await collection.distinct('batter');
    const players = batsmen
      .filter(p => p && p.trim() !== '' && p.toLowerCase().includes(query.toLowerCase()))
      .sort()
      .slice(0, 10); // Limit to 10 results

    res.json(players);
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// Get player overall statistics
app.get('/api/stats/:player', async (req, res) => {
  try {
    const player = req.params.player;
    
    const stats = await collection.aggregate([
      { $match: { batter: player, valid_ball: 1 } },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_batter' },
          totalBalls: { $sum: 1 },
          boundaries: {
            $sum: {
              $cond: [{ $in: ['$runs_batter', [4, 6]] }, 1, 0]
            }
          },
          fours: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0]
            }
          },
          sixes: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0]
            }
          },
          dots: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$runs_batter', 0] }, { $eq: ['$runs_extras', 0] }] }, 1, 0]
            }
          },
          dismissals: {
            $sum: {
              $cond: [{ $eq: ['$striker_out', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalRuns: 1,
          totalBalls: 1,
          strikeRate: {
            $round: [{ $multiply: [{ $divide: ['$totalRuns', '$totalBalls'] }, 100] }, 2]
          },
          average: {
            $round: [{ $divide: ['$totalRuns', { $max: ['$dismissals', 1] }] }, 2]
          },
          boundaries: 1,
          fours: 1,
          sixes: 1,
          dots: 1,
          dismissals: 1,
          dotPercentage: {
            $round: [{ $multiply: [{ $divide: ['$dots', '$totalBalls'] }, 100] }, 2]
          }
        }
      }
    ]).toArray();
    
    if (stats.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ player, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player statistics' });
  }
});

// Analyze phase performance
app.post('/api/analyze/phase-performance', async (req, res) => {
  try {
    const { player, ballsPlayedBefore, oversPlayedBefore, nextOvers, ballsInNextPhase } = req.body;
    
    // Calculate over range for next phase
    const startOver = oversPlayedBefore;
    const endOver = oversPlayedBefore + nextOvers;
    
    // Find innings where player played at least ballsPlayedBefore balls by oversPlayedBefore
    const pipeline = [
      { $match: { batter: player, valid_ball: 1 } },
      {
        $group: {
          _id: { matchId: '$match_id', inning: '$innings' },
          balls: {
            $push: {
              ballNum: '$ball',
              over: '$over',
              runs: '$runs_batter',
              isOut: '$striker_out'
            }
          }
        }
      },
      {
        $project: {
          matchId: '$_id.matchId',
          inning: '$_id.inning',
          balls: 1,
          ballsBeforePhase: {
            $size: {
              $filter: {
                input: '$balls',
                as: 'ball',
                cond: { $lt: ['$$ball.over', startOver] }
              }
            }
          },
          ballsInPhase: {
            $filter: {
              input: '$balls',
              as: 'ball',
              cond: {
                $and: [
                  { $gte: ['$$ball.over', startOver] },
                  { $lt: ['$$ball.over', endOver] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          ballsBeforePhase: { $gte: ballsPlayedBefore }
        }
      },
      {
        $project: {
          matchId: 1,
          inning: 1,
          ballsInPhaseCount: { $size: '$ballsInPhase' },
          runsInPhase: { $sum: '$ballsInPhase.runs' },
          wicketInPhase: {
            $sum: {
              $cond: [
                { $in: [true, '$ballsInPhase.isOut'] },
                1,
                0
              ]
            }
          },
          ballsInPhase: 1
        }
      },
      {
        $match: {
          ballsInPhaseCount: { $gte: Math.min(ballsInNextPhase, 1) }
        }
      }
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    
    // Calculate statistics
    const matchingInnings = results.filter(r => r.ballsInPhaseCount >= ballsInNextPhase);
    
    if (matchingInnings.length === 0) {
      return res.json({
        message: 'No matching innings found',
        totalInnings: 0,
        analysis: null
      });
    }
    
    const totalRuns = matchingInnings.reduce((sum, r) => sum + r.runsInPhase, 0);
    const totalBalls = matchingInnings.reduce((sum, r) => sum + Math.min(r.ballsInPhaseCount, ballsInNextPhase), 0);
    const dismissals = matchingInnings.filter(r => r.wicketInPhase > 0).length;
    
    const analysis = {
      averageRuns: (totalRuns / matchingInnings.length).toFixed(2),
      strikeRate: ((totalRuns / totalBalls) * 100).toFixed(2),
      dismissalRate: ((dismissals / matchingInnings.length) * 100).toFixed(2),
      totalInnings: matchingInnings.length,
      totalRuns,
      totalBalls,
      dismissals,
      runsDistribution: matchingInnings.map(r => r.runsInPhase).sort((a, b) => a - b)
    };
    
    res.json({
      player,
      query: {
        ballsPlayedBefore,
        oversPlayedBefore,
        nextOvers,
        ballsInNextPhase
      },
      analysis,
      matchingInnings: matchingInnings.length
    });
  } catch (error) {
    console.error('Error analyzing phase performance:', error);
    res.status(500).json({ error: 'Failed to analyze phase performance' });
  }
});

// Analyze dismissal patterns
app.post('/api/analyze/dismissal-patterns', async (req, res) => {
  try {
    const { player, ballsPlayed } = req.body;
    
    const pipeline = [
      { $match: { batter: player, valid_ball: 1 } },
      {
        $group: {
          _id: { matchId: '$match_id', inning: '$innings' },
          balls: {
            $push: {
              ballNum: '$ball',
              over: '$over',
              runs: '$runs_batter',
              isOut: '$striker_out',
              wicketType: '$wicket_type'
            }
          }
        }
      },
      {
        $project: {
          matchId: '$_id.matchId',
          inning: '$_id.inning',
          totalBalls: { $size: '$balls' },
          dismissal: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$balls',
                  as: 'ball',
                  cond: { $eq: ['$$ball.isOut', true] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $match: {
          totalBalls: { $gte: ballsPlayed },
          'dismissal.isOut': true
        }
      },
      {
        $group: {
          _id: null,
          dismissals: {
            $push: {
              over: '$dismissal.over',
              ballNum: '$totalBalls',
              kind: '$dismissal.wicketType'
            }
          },
          totalDismissals: { $sum: 1 }
        }
      }
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    
    if (results.length === 0 || results[0].totalDismissals === 0) {
      return res.json({
        message: 'No dismissals found after playing specified balls',
        totalDismissals: 0,
        analysis: null
      });
    }
    
    const dismissals = results[0].dismissals;
    
    // Group by over ranges
    const overRanges = {
      'Powerplay (1-6)': 0,
      'Middle (7-15)': 0,
      'Death (16-20)': 0
    };
    
    const dismissalTypes = {};
    
    dismissals.forEach(d => {
      if (d.over <= 6) overRanges['Powerplay (1-6)']++;
      else if (d.over <= 15) overRanges['Middle (7-15)']++;
      else overRanges['Death (16-20)']++;
      
      if (d.kind) {
        dismissalTypes[d.kind] = (dismissalTypes[d.kind] || 0) + 1;
      }
    });
    
    res.json({
      player,
      ballsPlayed,
      totalDismissals: results[0].totalDismissals,
      overRanges,
      dismissalTypes,
      dismissals: dismissals.slice(0, 20) // Return sample
    });
  } catch (error) {
    console.error('Error analyzing dismissal patterns:', error);
    res.status(500).json({ error: 'Failed to analyze dismissal patterns' });
  }
});

// Get collection schema sample
app.get('/api/schema', async (req, res) => {
  try {
    const sample = await collection.findOne();
    res.json({ sample, fields: Object.keys(sample || {}) });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// Get innings progression for phase analysis modal
app.post('/api/analyze/innings-progression', async (req, res) => {
  try {
    const { player, ballsPlayedBefore, ballsInNextPhase } = req.body;

    // Find innings where player faced enough balls total
    // We use oversPlayedBefore only for compatibility with phase-performance,
    // but we track by actual ball count, not match overs
    const pipeline = [
      { $match: { batter: player, valid_ball: 1 } },
      { $sort: { match_id: 1, innings: 1, ball: 1 } }, // Sort by ball number to maintain sequence
      {
        $group: {
          _id: { matchId: '$match_id', inning: '$innings' },
          balls: {
            $push: {
              ballNum: '$ball',
              over: '$over',
              runs: '$runs_batter',
              isOut: '$striker_out',
              match_id: '$match_id',
              innings: '$innings',
              batting_team: '$batting_team',
              bowling_team: '$bowling_team',
              venue: '$venue',
              season: '$season'
            }
          }
        }
      },
      {
        $project: {
          matchId: '$_id.matchId',
          inning: '$_id.inning',
          allBalls: '$balls',
          totalBalls: { $size: '$balls' }
        }
      },
      {
        $match: {
          // Player must have faced at least (ballsPlayedBefore + ballsInNextPhase) balls total
          totalBalls: { $gte: ballsPlayedBefore + ballsInNextPhase }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return res.json({
        innings: [],
        count: 0,
        message: 'No matching innings found'
      });
    }

    // Process each innings to build progression data using sequential ball count
    const inningsData = [];

    for (const innings of results) {
      const allBalls = innings.allBalls;

      // The innings.ballsBeforePhase already verified this innings has enough balls before the phase
      // Now we need to get the next ballsInNextPhase balls starting from the (ballsPlayedBefore+1)th ball

      // Skip if player didn't face enough total balls
      if (allBalls.length < ballsPlayedBefore + ballsInNextPhase) {
        continue;
      }

      // Get balls in the phase (from ballsPlayedBefore index onwards for ballsInNextPhase balls)
      // Example: if ballsPlayedBefore=15, we want balls at index 15,16,17... (the 16th, 17th, 18th ball the player faced)
      const ballsInPhase = allBalls.slice(ballsPlayedBefore, ballsPlayedBefore + ballsInNextPhase);

      // Skip if we don't have enough balls in the phase
      if (ballsInPhase.length < ballsInNextPhase) {
        continue;
      }

      const firstBall = ballsInPhase[0];

      // Build progression array with cumulative runs
      let cumulativeRuns = 0;
      const progression = ballsInPhase.map((ball, i) => {
        cumulativeRuns += ball.runs;
        return {
          ballNumber: ballsPlayedBefore + i + 1, // Ball number for batsman (starting from ballsPlayedBefore + 1)
          runsScored: ball.runs,
          cumulativeRuns: cumulativeRuns
        };
      });

      // Calculate total runs and balls faced in this phase
      const totalRuns = progression[progression.length - 1]?.cumulativeRuns || 0;
      const ballsFaced = progression.length;
      const strikeRate = ballsFaced > 0 ? ((totalRuns / ballsFaced) * 100).toFixed(2) : 0;

      // Get match info
      const matchInfo = `${firstBall.batting_team} vs ${firstBall.bowling_team}, ${firstBall.venue}, ${firstBall.season}`;

      inningsData.push({
        inningsNumber: inningsData.length + 1,
        matchInfo,
        matchId: innings.matchId,
        inning: innings.inning,
        totalRuns,
        ballsFaced,
        strikeRate: parseFloat(strikeRate),
        progression
      });
    }

    res.json({
      player,
      innings: inningsData,
      count: inningsData.length
    });
  } catch (error) {
    console.error('Error fetching innings progression:', error);
    res.status(500).json({ error: 'Failed to fetch innings progression data' });
  }
});

// Debug endpoint to check raw counts
app.get('/api/debug/:player', async (req, res) => {
  try {
    const player = req.params.player;
    const allBalls = await collection.countDocuments({ batter: player });
    const validBalls = await collection.countDocuments({ batter: player, valid_ball: 1 });
    const totalRuns = await collection.aggregate([
      { $match: { batter: player } },
      { $group: { _id: null, total: { $sum: '$runs_batter' } } }
    ]).toArray();
    const validRuns = await collection.aggregate([
      { $match: { batter: player, valid_ball: 1 } },
      { $group: { _id: null, total: { $sum: '$runs_batter' } } }
    ]).toArray();

    res.json({
      player,
      allBalls,
      validBalls,
      totalRuns: totalRuns[0]?.total || 0,
      validRuns: validRuns[0]?.total || 0
    });
  } catch (error) {
    console.error('Error in debug:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
