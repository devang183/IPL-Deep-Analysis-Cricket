require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 3001;

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
let collection;
let db2; // hello2 database for T20 data
let t20Collection; // t20Data collection

const connectDB = async () => {
  try {
    // Connect to first MongoDB cluster (hello database - existing data)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB (Cluster 1 - hello)');

    db = client.db(process.env.DB_NAME || 'hello');
    collection = db.collection(process.env.COLLECTION_NAME || 'IPL-ALL');

    const count = await collection.countDocuments();
    console.log(`📊 hello.IPL-ALL has ${count} documents`);

    // Connect to second MongoDB cluster (hello2 database - T20 data)
    const mongoUri2 = process.env.MONGO_URI_2;
    if (mongoUri2) {
      const client2 = new MongoClient(mongoUri2);
      await client2.connect();
      console.log('✅ Connected to MongoDB (Cluster 2 - hello2)');

      db2 = client2.db('hello2');
      t20Collection = db2.collection('t20Data');

      const t20Count = await t20Collection.countDocuments();
      console.log(`📊 hello2.t20Data has ${t20Count} documents`);
    } else {
      console.log('⚠️ MONGO_URI_2 not set - T20 data features disabled');
    }
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

// ========== Authentication Routes ==========

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide email, password, and name' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      isAdmin: false,
      role: 'user',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    const accessToken = jwt.sign(
      { userId: result.insertedId, email: email.toLowerCase(), type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: result.insertedId, email: email.toLowerCase(), type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: result.insertedId,
        email: email.toLowerCase(),
        name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin || false,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Token is valid',
      user: {
        ...req.user,
        isAdmin: user.isAdmin || false,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newAccessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin || false,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please login again.' });
    }
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// ========== End Authentication Routes ==========

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
    const { player, ballsPlayedBefore, oversPlayedBefore, nextOvers, ballsInNextPhase } = req.body;

    // Calculate over range for next phase (to match phase-performance filtering)
    const startOver = oversPlayedBefore;
    const endOver = oversPlayedBefore + nextOvers;

    // Find innings matching the SAME criteria as phase-performance endpoint
    const pipeline = [
      { $match: { batter: player, valid_ball: 1 } },
      { $sort: { match_id: 1, innings: 1, over: 1, ball: 1 } }, // Sort by over first, then ball number
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
              season: '$season',
              date: '$date'
            }
          }
        }
      },
      {
        $project: {
          matchId: '$_id.matchId',
          inning: '$_id.inning',
          allBalls: '$balls',
          totalBalls: { $size: '$balls' },
          // Count balls faced before the phase started (before startOver)
          ballsBeforePhase: {
            $size: {
              $filter: {
                input: '$balls',
                as: 'ball',
                cond: { $lt: ['$$ball.over', startOver] }
              }
            }
          },
          // Get balls in the phase (between startOver and endOver)
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
          // Must have faced at least ballsPlayedBefore balls before the phase
          ballsBeforePhase: { $gte: ballsPlayedBefore }
        }
      },
      {
        $project: {
          matchId: 1,
          inning: 1,
          allBalls: 1,
          ballsInPhaseCount: { $size: '$ballsInPhase' }
        }
      },
      {
        $match: {
          // Must have faced at least ballsInNextPhase balls in the phase
          ballsInPhaseCount: { $gte: ballsInNextPhase }
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

      // Count how many balls the player ACTUALLY faced before the phase started (before startOver)
      let actualBallsBeforePhase = 0;
      for (const ball of allBalls) {
        if (ball.over < startOver) {
          actualBallsBeforePhase++;
        } else {
          break; // Balls are sorted, so we can break here
        }
      }

      // Get the next ballsInNextPhase balls starting from where the phase begins
      // Example: if player faced 18 balls before over 7, we get balls at index 18, 19, 20... (the 19th, 20th, 21st ball)
      const ballsInPhase = allBalls.slice(actualBallsBeforePhase, actualBallsBeforePhase + ballsInNextPhase);

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
          ballNumber: actualBallsBeforePhase + i + 1, // Ball number for batsman (actual count from this innings)
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
        progression,
        date: firstBall.date // Include date for sorting on frontend
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

// Get player birth dates from IPLPlayersDOB collection
app.get('/api/players/birthdays', async (req, res) => {
  try {
    const dobCollection = db.collection('IPLPlayersDOB');

    // Get all players with their date_of_birth
    const players = await dobCollection.find({
      date_of_birth: { $exists: true, $ne: '' }
    }).toArray();

    res.json({
      players: players.map(p => ({
        name: p.name || p.player_name || p._id,
        date_of_birth: p.date_of_birth
      })),
      count: players.length
    });
  } catch (error) {
    console.error('Error fetching player birthdays:', error);
    res.status(500).json({ error: 'Failed to fetch player birthdays' });
  }
});

// Get player metadata from All-Players collection
app.get('/api/players/metadata', async (req, res) => {
  try {
    const playersCollection = db.collection('All-Players');

    // Get all players with their metadata
    const players = await playersCollection.find({}).toArray();

    const metadata = {};
    players.forEach(p => {
      const name = p.fullname || p.name || p._id;
      if (name) {
        metadata[name] = {
          battingstyle: p.battingstyle || 'N/A',
          bowlingstyle: p.bowlingstyle || 'N/A',
          position: p.position || p.playing_role || 'N/A',
          country_name: p.country_name || p.country || 'N/A'
        };
      }
    });

    res.json({ metadata, count: Object.keys(metadata).length });
  } catch (error) {
    console.error('Error fetching player metadata:', error);
    res.status(500).json({ error: 'Failed to fetch player metadata' });
  }
});

// Get IPL auction data
app.get('/api/auction', async (req, res) => {
  try {
    const auctionCollection = db.collection('IPLAuctionFigures');

    // Get all auction data
    const auctionData = await auctionCollection.find({}).toArray();

    // Calculate statistics
    const stats = {
      totalPlayers: auctionData.length,
      totalSpent: auctionData.reduce((sum, player) => sum + (player.Amount || 0), 0),
      averagePrice: 0,
      maxPrice: 0,
      minPrice: 0,
      maxPricePlayer: null,
      byTeam: {},
      byYear: {},
      priceRanges: {
        '0-1cr': 0,
        '1-5cr': 0,
        '5-10cr': 0,
        '10-15cr': 0,
        '15cr+': 0
      }
    };

    if (auctionData.length > 0) {
      stats.averagePrice = stats.totalSpent / auctionData.length;

      // Find max and min prices
      const prices = auctionData.filter(p => p.Amount).map(p => p.Amount);
      if (prices.length > 0) {
        stats.maxPrice = Math.max(...prices);
        stats.minPrice = Math.min(...prices.filter(p => p > 0));
        stats.maxPricePlayer = auctionData.find(p => p.Amount === stats.maxPrice);
      }

      // Group by team and year
      auctionData.forEach(player => {
        // By team
        if (player.Team) {
          if (!stats.byTeam[player.Team]) {
            stats.byTeam[player.Team] = {
              count: 0,
              totalSpent: 0,
              players: []
            };
          }
          stats.byTeam[player.Team].count++;
          stats.byTeam[player.Team].totalSpent += player.Amount || 0;
          stats.byTeam[player.Team].players.push({
            name: player.Player,
            price: player.Amount || 0,
            year: player.Year
          });
        }

        // By year
        if (player.Year) {
          if (!stats.byYear[player.Year]) {
            stats.byYear[player.Year] = {
              count: 0,
              totalSpent: 0
            };
          }
          stats.byYear[player.Year].count++;
          stats.byYear[player.Year].totalSpent += player.Amount || 0;
        }

        // Price ranges (in crores)
        const priceCr = (player.Amount || 0) / 10000000; // Convert to crores
        if (priceCr <= 1) stats.priceRanges['0-1cr']++;
        else if (priceCr <= 5) stats.priceRanges['1-5cr']++;
        else if (priceCr <= 10) stats.priceRanges['5-10cr']++;
        else if (priceCr <= 15) stats.priceRanges['10-15cr']++;
        else stats.priceRanges['15cr+']++;
      });
    }

    res.json({
      players: auctionData,
      stats,
      count: auctionData.length
    });
  } catch (error) {
    console.error('Error fetching auction data:', error);
    res.status(500).json({ error: 'Failed to fetch auction data' });
  }
});

// Get IPL auction player stats data
app.get('/api/auction/player-stats', async (req, res) => {
  try {
    const statsCollection = db.collection('IPLAuctionFiguresPlayerStats');
    const playerStats = await statsCollection.find({}).toArray();

    res.json({
      players: playerStats,
      count: playerStats.length
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
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

// ========== T20 Data Polling Functions ==========

const T20_DATA_URL = 'https://cricsheet.org/downloads/t20s_male_json.zip';
const TEMP_DIR = path.join(__dirname, 'temp');
const ZIP_FILE_PATH = path.join(TEMP_DIR, 't20s_male_json.zip');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Download ZIP file from URL
const downloadZipFile = (url, destPath) => {
  return new Promise((resolve, reject) => {
    console.log('📥 Downloading T20 data from cricsheet.org...');

    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`   ↪️ Following redirect to ${redirectUrl}`);
        downloadZipFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   📦 Downloaded: ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n   ✅ Download complete!');
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(err);
    });
  });
};

// Extract and process ZIP file
const extractAndProcessZip = async (zipPath) => {
  console.log('📂 Extracting ZIP file...');

  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();

  const jsonFiles = zipEntries.filter(entry => entry.entryName.endsWith('.json'));
  console.log(`   📄 Found ${jsonFiles.length} JSON files in archive`);

  const matches = [];

  for (const entry of jsonFiles) {
    try {
      const content = entry.getData().toString('utf8');
      const matchData = JSON.parse(content);

      // Extract match_id from filename (e.g., "1234567.json" -> "1234567")
      const matchId = entry.entryName.replace('.json', '').split('/').pop();

      matches.push({
        match_id: matchId,
        ...matchData
      });
    } catch (err) {
      console.error(`   ⚠️ Error parsing ${entry.entryName}:`, err.message);
    }
  }

  console.log(`   ✅ Parsed ${matches.length} matches successfully`);
  return matches;
};

// Store matches in MongoDB (upsert to avoid duplicates)
const storeMatchesInDB = async (matches) => {
  console.log('💾 Storing matches in MongoDB (hello2.t20Data)...');

  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const match of matches) {
    try {
      const result = await t20Collection.updateOne(
        { match_id: match.match_id },
        { $set: match },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
      } else if (result.modifiedCount > 0) {
        updatedCount++;
      }
    } catch (err) {
      errorCount++;
      console.error(`   ⚠️ Error storing match ${match.match_id}:`, err.message);
    }
  }

  console.log(`   ✅ Inserted: ${insertedCount}, Updated: ${updatedCount}, Errors: ${errorCount}`);
  return { insertedCount, updatedCount, errorCount, totalProcessed: matches.length };
};

// Main function to poll and update T20 data
const pollT20Data = async () => {
  const startTime = Date.now();
  console.log('\n🏏 Starting T20 data poll...');
  console.log(`   🕐 Started at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

  try {
    // Download ZIP file
    await downloadZipFile(T20_DATA_URL, ZIP_FILE_PATH);

    // Extract and process
    const matches = await extractAndProcessZip(ZIP_FILE_PATH);

    // Store in database
    const result = await storeMatchesInDB(matches);

    // Cleanup temp file
    fs.unlinkSync(ZIP_FILE_PATH);
    console.log('   🧹 Cleaned up temporary files');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ T20 data poll completed in ${duration}s`);

    // Get final count
    const totalCount = await t20Collection.countDocuments();
    console.log(`📊 Total matches in database: ${totalCount}`);

    return {
      success: true,
      ...result,
      totalInDatabase: totalCount,
      duration: `${duration}s`
    };
  } catch (error) {
    console.error('❌ T20 data poll failed:', error.message);
    return { success: false, error: error.message };
  }
};

// API endpoint to manually trigger T20 data poll
app.post('/api/t20data/poll', async (req, res) => {
  try {
    const result = await pollT20Data();
    res.json(result);
  } catch (error) {
    console.error('Error polling T20 data:', error);
    res.status(500).json({ error: 'Failed to poll T20 data' });
  }
});

// API endpoint to get T20 data stats
app.get('/api/t20data/stats', async (req, res) => {
  try {
    const totalCount = await t20Collection.countDocuments();

    // Get date range of matches
    const dateAgg = await t20Collection.aggregate([
      { $unwind: '$info.dates' },
      {
        $group: {
          _id: null,
          minDate: { $min: '$info.dates' },
          maxDate: { $max: '$info.dates' }
        }
      }
    ]).toArray();

    // Get match types breakdown
    const matchTypes = await t20Collection.aggregate([
      { $group: { _id: '$info.match_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get recent matches
    const recentMatches = await t20Collection.find({})
      .sort({ 'info.dates': -1 })
      .limit(5)
      .project({ match_id: 1, 'info.teams': 1, 'info.dates': 1, 'info.venue': 1 })
      .toArray();

    res.json({
      totalMatches: totalCount,
      dateRange: dateAgg[0] || { minDate: null, maxDate: null },
      matchTypes: matchTypes.map(m => ({ type: m._id, count: m.count })),
      recentMatches: recentMatches.map(m => ({
        match_id: m.match_id,
        teams: m.info?.teams || [],
        date: m.info?.dates?.[0] || 'Unknown',
        venue: m.info?.venue || 'Unknown'
      }))
    });
  } catch (error) {
    console.error('Error fetching T20 data stats:', error);
    res.status(500).json({ error: 'Failed to fetch T20 data stats' });
  }
});

// API endpoint to search T20 matches
app.get('/api/t20data/search', async (req, res) => {
  try {
    const { team, year, limit = 20 } = req.query;

    const query = {};
    if (team) {
      query['info.teams'] = { $regex: team, $options: 'i' };
    }
    if (year) {
      query['info.dates'] = { $regex: `^${year}` };
    }

    const matches = await t20Collection.find(query)
      .sort({ 'info.dates': -1 })
      .limit(parseInt(limit))
      .project({ match_id: 1, 'info.teams': 1, 'info.dates': 1, 'info.venue': 1, 'info.outcome': 1 })
      .toArray();

    res.json({
      matches: matches.map(m => ({
        match_id: m.match_id,
        teams: m.info?.teams || [],
        date: m.info?.dates?.[0] || 'Unknown',
        venue: m.info?.venue || 'Unknown',
        outcome: m.info?.outcome || {}
      })),
      count: matches.length
    });
  } catch (error) {
    console.error('Error searching T20 data:', error);
    res.status(500).json({ error: 'Failed to search T20 data' });
  }
});

// Debug endpoint to see T20 data structure
app.get('/api/t20data/sample', async (req, res) => {
  try {
    const sample = await t20Collection.findOne({});
    res.json(sample);
  } catch (error) {
    console.error('Error fetching T20 sample:', error);
    res.status(500).json({ error: 'Failed to fetch T20 sample' });
  }
});

// ========== T20 International Analytics Endpoints ==========

// Get all unique T20I players (batsmen)
app.get('/api/t20i/players', async (req, res) => {
  try {
    const players = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $group: { _id: '$innings.overs.deliveries.batter' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const playerList = players.map(p => p._id).filter(p => p);
    res.json({ players: playerList, count: playerList.length });
  } catch (error) {
    console.error('Error fetching T20I players:', error);
    res.status(500).json({ error: 'Failed to fetch T20I players' });
  }
});

// Get all unique T20I bowlers
app.get('/api/t20i/bowlers', async (req, res) => {
  try {
    const bowlers = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $group: { _id: '$innings.overs.deliveries.bowler' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const bowlerList = bowlers.map(b => b._id).filter(b => b);
    res.json({ bowlers: bowlerList, count: bowlerList.length });
  } catch (error) {
    console.error('Error fetching T20I bowlers:', error);
    res.status(500).json({ error: 'Failed to fetch T20I bowlers' });
  }
});

// Get T20I batting stats for a player
app.get('/api/t20i/stats/:name', async (req, res) => {
  try {
    const player = req.params.name;

    // Get all deliveries for this batsman
    const stats = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $project: {
          match_id: 1,
          innings_team: '$innings.team',
          over: '$innings.overs.over',
          delivery: '$innings.overs.deliveries',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          runs_extras: '$innings.overs.deliveries.runs.extras',
          runs_total: '$innings.overs.deliveries.runs.total',
          has_extras: { $gt: [{ $size: { $objectToArray: { $ifNull: ['$innings.overs.deliveries.extras', {}] } } }, 0] },
          is_wide: { $ifNull: ['$innings.overs.deliveries.extras.wides', 0] },
          is_noball: { $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] },
          wickets: '$innings.overs.deliveries.wickets'
        }
      },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_batter' },
          totalBalls: {
            $sum: {
              $cond: [
                { $or: [{ $gt: ['$is_wide', 0] }, { $gt: ['$is_noball', 0] }] },
                0,
                1
              ]
            }
          },
          fours: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0] }
          },
          sixes: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0] }
          },
          dots: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$runs_batter', 0] },
                  { $eq: ['$runs_extras', 0] },
                  { $not: { $gt: ['$is_wide', 0] } },
                  { $not: { $gt: ['$is_noball', 0] } }
                ]},
                1,
                0
              ]
            }
          },
          dismissals: {
            $sum: {
              $cond: [
                { $and: [
                  { $isArray: '$wickets' },
                  { $gt: [{ $size: '$wickets' }, 0] }
                ]},
                1,
                0
              ]
            }
          },
          matches: { $addToSet: '$match_id' }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      return res.status(404).json({ error: 'Player not found in T20I data' });
    }

    const result = stats[0];
    const strikeRate = result.totalBalls > 0
      ? parseFloat(((result.totalRuns / result.totalBalls) * 100).toFixed(2))
      : 0;
    const average = result.dismissals > 0
      ? parseFloat((result.totalRuns / result.dismissals).toFixed(2))
      : result.totalRuns;

    // Get innings-wise scores for 50s and 100s
    const inningsScores = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $group: {
          _id: { match_id: '$match_id', innings: '$innings.team' },
          runs: { $sum: '$innings.overs.deliveries.runs.batter' }
        }
      }
    ]).toArray();

    const fifties = inningsScores.filter(inn => inn.runs >= 50 && inn.runs < 100).length;
    const hundreds = inningsScores.filter(inn => inn.runs >= 100).length;

    // Get Player of the Match (POTM) stats
    const potmData = await t20Collection.aggregate([
      { $match: { 'info.player_of_match': player } },
      {
        $group: {
          _id: '$info.venue',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const potmCount = potmData.reduce((sum, venue) => sum + venue.count, 0);
    const potmByVenue = potmData.map(v => ({
      venue: v._id,
      count: v.count
    }));

    res.json({
      player,
      stats: {
        totalRuns: result.totalRuns,
        totalBalls: result.totalBalls,
        strikeRate,
        average,
        fours: result.fours,
        sixes: result.sixes,
        dots: result.dots,
        boundaries: result.fours + result.sixes,
        dismissals: result.dismissals,
        fifties,
        hundreds,
        matches: result.matches?.length || 0,
        dotPercentage: result.totalBalls > 0
          ? parseFloat(((result.dots / result.totalBalls) * 100).toFixed(2))
          : 0,
        ballDistribution: [
          { name: 'Dot Balls', value: result.dots },
          { name: 'Singles/Doubles', value: result.totalBalls - result.dots - result.fours - result.sixes },
          { name: 'Fours', value: result.fours },
          { name: 'Sixes', value: result.sixes }
        ],
        potmCount,
        potmByVenue
      }
    });
  } catch (error) {
    console.error('Error fetching T20I player stats:', error);
    res.status(500).json({ error: 'Failed to fetch T20I player stats' });
  }
});

// Get T20I bowling stats for a player
app.get('/api/t20i/bowler-stats/:name', async (req, res) => {
  try {
    const bowler = req.params.name;

    // Dismissal types that count as bowler wickets (excludes run out, retired, obstructing the field)
    const bowlerWicketTypes = ['bowled', 'caught', 'lbw', 'stumped', 'hit wicket', 'caught and bowled'];

    const stats = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.bowler': bowler } },
      {
        $project: {
          match_id: 1,
          innings_team: '$innings.team',
          over: '$innings.overs.over',
          runs_total: '$innings.overs.deliveries.runs.total',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          is_wide: { $ifNull: ['$innings.overs.deliveries.extras.wides', 0] },
          is_noball: { $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] },
          wickets: '$innings.overs.deliveries.wickets',
          // Count only bowler wickets (excluding run outs, retired, etc.)
          bowlerWickets: {
            $cond: [
              { $isArray: '$innings.overs.deliveries.wickets' },
              {
                $size: {
                  $filter: {
                    input: '$innings.overs.deliveries.wickets',
                    as: 'w',
                    cond: { $in: ['$$w.kind', bowlerWicketTypes] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_total' },
          totalBalls: {
            $sum: {
              $cond: [
                { $or: [{ $gt: ['$is_wide', 0] }, { $gt: ['$is_noball', 0] }] },
                0,
                1
              ]
            }
          },
          wickets: { $sum: '$bowlerWickets' },
          dotBalls: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$runs_total', 0] },
                  { $not: { $gt: ['$is_wide', 0] } },
                  { $not: { $gt: ['$is_noball', 0] } }
                ]},
                1,
                0
              ]
            }
          },
          matches: { $addToSet: '$match_id' }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      return res.status(404).json({ error: 'Bowler not found in T20I data' });
    }

    const result = stats[0];
    const completedOvers = Math.floor(result.totalBalls / 6);
    const remainingBalls = result.totalBalls % 6;
    const oversFormatted = remainingBalls > 0 ? `${completedOvers}.${remainingBalls}` : `${completedOvers}.0`;
    const totalOversDecimal = completedOvers + (remainingBalls / 10);

    const economyRate = totalOversDecimal > 0
      ? parseFloat((result.totalRuns / totalOversDecimal).toFixed(2))
      : 0;
    const bowlingAverage = result.wickets > 0
      ? parseFloat((result.totalRuns / result.wickets).toFixed(2))
      : 0;
    const bowlingStrikeRate = result.wickets > 0
      ? parseFloat((result.totalBalls / result.wickets).toFixed(2))
      : 0;

    // Get innings-wise wickets for 3W, 4W, 5W (excluding run outs)
    const inningsWickets = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.bowler': bowler } },
      {
        $project: {
          match_id: 1,
          innings_team: '$innings.team',
          wicketCount: {
            $cond: [
              { $isArray: '$innings.overs.deliveries.wickets' },
              {
                $size: {
                  $filter: {
                    input: '$innings.overs.deliveries.wickets',
                    as: 'w',
                    cond: { $in: ['$$w.kind', bowlerWicketTypes] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: { match_id: '$match_id', innings: '$innings_team' },
          wickets: { $sum: '$wicketCount' }
        }
      }
    ]).toArray();

    const threeWickets = inningsWickets.filter(inn => inn.wickets === 3).length;
    const fourWickets = inningsWickets.filter(inn => inn.wickets === 4).length;
    const fiveWickets = inningsWickets.filter(inn => inn.wickets >= 5).length;

    // Get Player of the Match (POTM) stats
    const potmData = await t20Collection.aggregate([
      { $match: { 'info.player_of_match': bowler } },
      {
        $group: {
          _id: '$info.venue',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const potmCount = potmData.reduce((sum, venue) => sum + venue.count, 0);
    const potmByVenue = potmData.map(v => ({
      venue: v._id,
      count: v.count
    }));

    res.json({
      bowler,
      stats: {
        overs: oversFormatted,
        balls: result.totalBalls,
        totalRuns: result.totalRuns,
        wickets: result.wickets,
        economyRate,
        bowlingAverage,
        bowlingStrikeRate,
        dotBalls: result.dotBalls,
        threeWickets,
        fourWickets,
        fiveWickets,
        matches: result.matches?.length || 0,
        potmCount,
        potmByVenue
      }
    });
  } catch (error) {
    console.error('Error fetching T20I bowler stats:', error);
    res.status(500).json({ error: 'Failed to fetch T20I bowler stats' });
  }
});

// Get T20I batsman vs bowler matchup
app.post('/api/t20i/batsman-vs-bowler', async (req, res) => {
  try {
    const { batsman, bowler } = req.body;

    if (!batsman || !bowler) {
      return res.status(400).json({ error: 'Both batsman and bowler are required' });
    }

    const stats = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      {
        $match: {
          'innings.overs.deliveries.batter': batsman,
          'innings.overs.deliveries.bowler': bowler
        }
      },
      {
        $project: {
          match_id: 1,
          season: '$info.season',
          venue: '$info.venue',
          date: { $arrayElemAt: ['$info.dates', 0] },
          batting_team: '$innings.team',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          runs_extras: '$innings.overs.deliveries.runs.extras',
          runs_total: '$innings.overs.deliveries.runs.total',
          is_wide: { $ifNull: ['$innings.overs.deliveries.extras.wides', 0] },
          is_noball: { $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] },
          wickets: '$innings.overs.deliveries.wickets',
          over: '$innings.overs.over'
        }
      },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_batter' },
          totalBalls: {
            $sum: {
              $cond: [
                { $or: [{ $gt: ['$is_wide', 0] }, { $gt: ['$is_noball', 0] }] },
                0,
                1
              ]
            }
          },
          fours: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0] }
          },
          sixes: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0] }
          },
          dots: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$runs_batter', 0] },
                  { $eq: ['$runs_extras', 0] },
                  { $not: { $gt: ['$is_wide', 0] } },
                  { $not: { $gt: ['$is_noball', 0] } }
                ]},
                1,
                0
              ]
            }
          },
          dismissals: {
            $sum: {
              $cond: [
                { $and: [
                  { $isArray: '$wickets' },
                  { $gt: [{ $size: '$wickets' }, 0] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    if (stats.length === 0 || stats[0].totalBalls === 0) {
      return res.json({
        batsman,
        bowler,
        totalBalls: 0,
        totalRuns: 0,
        strikeRate: 0,
        average: 0,
        dismissals: 0,
        message: 'No data available for this matchup in T20I'
      });
    }

    const result = stats[0];
    const strikeRate = result.totalBalls > 0
      ? parseFloat(((result.totalRuns / result.totalBalls) * 100).toFixed(2))
      : 0;
    const average = result.dismissals > 0
      ? parseFloat((result.totalRuns / result.dismissals).toFixed(2))
      : result.totalRuns;

    // Get dismissal details
    const dismissalDetails = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      {
        $match: {
          'innings.overs.deliveries.batter': batsman,
          'innings.overs.deliveries.bowler': bowler,
          'innings.overs.deliveries.wickets': { $exists: true, $ne: [] }
        }
      },
      {
        $project: {
          season: '$info.season',
          venue: '$info.venue',
          date: { $arrayElemAt: ['$info.dates', 0] },
          over: '$innings.overs.over',
          wicketKind: { $arrayElemAt: ['$innings.overs.deliveries.wickets.kind', 0] },
          fielders: { $arrayElemAt: ['$innings.overs.deliveries.wickets.fielders', 0] }
        }
      },
      { $limit: 20 }
    ]).toArray();

    res.json({
      batsman,
      bowler,
      totalRuns: result.totalRuns,
      totalBalls: result.totalBalls,
      strikeRate,
      average,
      dismissals: result.dismissals,
      fours: result.fours,
      sixes: result.sixes,
      dots: result.dots,
      dismissalDetails,
      runsDistribution: [
        { name: 'Dots', value: result.dots },
        { name: 'Singles/Doubles', value: result.totalBalls - result.dots - result.fours - result.sixes },
        { name: 'Fours', value: result.fours },
        { name: 'Sixes', value: result.sixes }
      ]
    });
  } catch (error) {
    console.error('Error analyzing T20I batsman vs bowler:', error);
    res.status(500).json({ error: 'Failed to analyze T20I batsman vs bowler matchup' });
  }
});

// Debug T20I batting stats for a player
app.get('/api/t20i/debug/:name', async (req, res) => {
  try {
    const player = req.params.name;

    // Count ALL deliveries where this player is the batter
    const allDeliveries = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $project: {
          match_id: 1,
          date: { $arrayElemAt: ['$info.dates', 0] },
          teams: '$info.teams',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          runs_total: '$innings.overs.deliveries.runs.total',
          extras: '$innings.overs.deliveries.extras',
          is_wide: { $ifNull: ['$innings.overs.deliveries.extras.wides', 0] },
          is_noball: { $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] },
          wickets: '$innings.overs.deliveries.wickets'
        }
      }
    ]).toArray();

    // Calculate different counts
    let totalDeliveries = allDeliveries.length;
    let totalRuns = 0;
    let ballsFacedExcludingWides = 0;
    let ballsFacedExcludingWidesAndNoballs = 0;
    let widesCount = 0;
    let noballsCount = 0;
    let deliveriesWithExtras = 0;

    // Track unique matches and dates
    const matchSet = new Set();
    let earliestDate = null;
    let latestDate = null;

    for (const d of allDeliveries) {
      totalRuns += d.runs_batter || 0;

      if (d.is_wide > 0) {
        widesCount++;
      }
      if (d.is_noball > 0) {
        noballsCount++;
      }

      // Standard cricket: wides don't count, noballs don't count
      if (d.is_wide === 0 && d.is_noball === 0) {
        ballsFacedExcludingWidesAndNoballs++;
      }

      // Only exclude wides (some systems count noballs as balls faced)
      if (d.is_wide === 0) {
        ballsFacedExcludingWides++;
      }

      if (d.extras && Object.keys(d.extras).length > 0) {
        deliveriesWithExtras++;
      }

      matchSet.add(d.match_id);

      if (d.date) {
        if (!earliestDate || d.date < earliestDate) earliestDate = d.date;
        if (!latestDate || d.date > latestDate) latestDate = d.date;
      }
    }

    res.json({
      player,
      totalDeliveries,
      totalRuns,
      ballsFacedExcludingWides,
      ballsFacedExcludingWidesAndNoballs,
      widesCount,
      noballsCount,
      deliveriesWithExtras,
      matchCount: matchSet.size,
      earliestMatch: earliestDate,
      latestMatch: latestDate,
      note: 'Compare these numbers to verify computation logic'
    });
  } catch (error) {
    console.error('Error debugging T20I stats:', error);
    res.status(500).json({ error: 'Failed to debug T20I stats' });
  }
});

// Debug: Get match details for a player in a specific match
app.get('/api/t20i/debug/match/:matchId/:player', async (req, res) => {
  try {
    const { matchId, player } = req.params;

    const deliveries = await t20Collection.aggregate([
      { $match: { match_id: matchId } },
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $project: {
          over: '$innings.overs.over',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          runs_total: '$innings.overs.deliveries.runs.total',
          extras: '$innings.overs.deliveries.extras',
          wickets: '$innings.overs.deliveries.wickets'
        }
      }
    ]).toArray();

    const runs = deliveries.reduce((sum, d) => sum + (d.runs_batter || 0), 0);
    const balls = deliveries.filter(d => !d.extras?.wides && !d.extras?.noballs).length;

    res.json({
      matchId,
      player,
      deliveriesCount: deliveries.length,
      runs,
      balls,
      deliveries: deliveries.slice(0, 30) // Sample for debugging
    });
  } catch (error) {
    console.error('Error debugging match:', error);
    res.status(500).json({ error: 'Failed to debug match' });
  }
});

// Debug: Get per-match breakdown for a player
app.get('/api/t20i/debug/all-matches/:name', async (req, res) => {
  try {
    const player = req.params.name;

    const matchStats = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $group: {
          _id: '$match_id',
          date: { $first: { $arrayElemAt: ['$info.dates', 0] } },
          teams: { $first: '$info.teams' },
          runs: { $sum: '$innings.overs.deliveries.runs.batter' },
          deliveries: { $sum: 1 },
          wides: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$innings.overs.deliveries.extras.wides', 0] }, 0] }, 1, 0]
            }
          },
          noballs: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] }, 0] }, 1, 0]
            }
          }
        }
      },
      { $sort: { date: -1 } }
    ]).toArray();

    // Calculate totals
    let totalRuns = 0;
    let totalDeliveries = 0;
    let totalBalls = 0;

    for (const m of matchStats) {
      totalRuns += m.runs;
      totalDeliveries += m.deliveries;
      totalBalls += m.deliveries - m.wides - m.noballs;
    }

    res.json({
      player,
      matchCount: matchStats.length,
      totalRuns,
      totalDeliveries,
      totalBalls,
      recentMatches: matchStats.slice(0, 10)
    });
  } catch (error) {
    console.error('Error debugging all matches:', error);
    res.status(500).json({ error: 'Failed to debug all matches' });
  }
});

// Debug: Get wicket types for a bowler
app.get('/api/t20i/debug/wicket-types/:bowler', async (req, res) => {
  try {
    const bowler = req.params.bowler;

    const wicketTypes = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.bowler': bowler } },
      { $unwind: { path: '$innings.overs.deliveries.wickets', preserveNullAndEmptyArrays: false } },
      { $group: {
        _id: '$innings.overs.deliveries.wickets.kind',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray();

    const total = wicketTypes.reduce((sum, wt) => sum + wt.count, 0);

    res.json({
      bowler,
      wicketTypes: wicketTypes.map(wt => ({ kind: wt._id, count: wt.count })),
      total
    });
  } catch (error) {
    console.error('Error fetching wicket types:', error);
    res.status(500).json({ error: 'Failed to fetch wicket types' });
  }
});

// Get all T20I teams
app.get('/api/t20i/teams', async (req, res) => {
  try {
    const teams = await t20Collection.aggregate([
      { $unwind: '$info.teams' },
      { $group: { _id: '$info.teams' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const teamList = teams.map(t => t._id).filter(t => t);
    res.json({ teams: teamList, count: teamList.length });
  } catch (error) {
    console.error('Error fetching T20I teams:', error);
    res.status(500).json({ error: 'Failed to fetch T20I teams' });
  }
});

// Get T20I innings run progression for a player
app.get('/api/t20i/innings-progression/:name', async (req, res) => {
  try {
    const player = req.params.name;

    // Get all innings for this player with ball-by-ball data
    const inningsData = await t20Collection.aggregate([
      { $unwind: '$innings' },
      { $unwind: '$innings.overs' },
      { $unwind: '$innings.overs.deliveries' },
      { $match: { 'innings.overs.deliveries.batter': player } },
      {
        $project: {
          match_id: 1,
          date: { $arrayElemAt: ['$info.dates', 0] },
          venue: '$info.venue',
          teams: '$info.teams',
          batting_team: '$innings.team',
          over: '$innings.overs.over',
          runs_batter: '$innings.overs.deliveries.runs.batter',
          is_wide: { $ifNull: ['$innings.overs.deliveries.extras.wides', 0] },
          is_noball: { $ifNull: ['$innings.overs.deliveries.extras.noballs', 0] },
          wickets: '$innings.overs.deliveries.wickets'
        }
      },
      // Sort by match, then over, then within over (implicit from $unwind order)
      { $sort: { match_id: 1, date: 1, over: 1 } },
      {
        $group: {
          _id: '$match_id',
          date: { $first: '$date' },
          venue: { $first: '$venue' },
          teams: { $first: '$teams' },
          batting_team: { $first: '$batting_team' },
          deliveries: {
            $push: {
              over: '$over',
              runs: '$runs_batter',
              is_wide: '$is_wide',
              is_noball: '$is_noball',
              wickets: '$wickets'
            }
          }
        }
      },
      { $sort: { date: -1 } } // Most recent first
    ]).toArray();

    if (inningsData.length === 0) {
      return res.json({
        player,
        innings: [],
        count: 0,
        message: 'No innings found for this player'
      });
    }

    // Process each innings to build progression data
    const processedInnings = inningsData.map((innings, index) => {
      // Filter out wides (they don't count as balls faced)
      const legalDeliveries = innings.deliveries.filter(d => d.is_wide === 0);

      // Build ball-by-ball progression
      let cumulativeRuns = 0;
      const progression = legalDeliveries.map((delivery, ballIndex) => {
        cumulativeRuns += delivery.runs;
        return {
          ballNumber: ballIndex + 1,
          runsScored: delivery.runs,
          cumulativeRuns: cumulativeRuns,
          over: delivery.over
        };
      });

      // Calculate stats
      const totalRuns = cumulativeRuns;
      const ballsFaced = legalDeliveries.length;
      const strikeRate = ballsFaced > 0 ? ((totalRuns / ballsFaced) * 100).toFixed(2) : 0;
      const fours = legalDeliveries.filter(d => d.runs === 4).length;
      const sixes = legalDeliveries.filter(d => d.runs === 6).length;

      // Determine opponent team
      const opponent = innings.teams.find(t => t !== innings.batting_team) || 'Unknown';

      return {
        inningsNumber: index + 1,
        matchId: innings._id,
        date: innings.date,
        venue: innings.venue,
        opponent: opponent,
        battingTeam: innings.batting_team,
        matchInfo: `${innings.batting_team} vs ${opponent}, ${innings.venue}`,
        totalRuns,
        ballsFaced,
        strikeRate: parseFloat(strikeRate),
        fours,
        sixes,
        progression
      };
    });

    res.json({
      player,
      innings: processedInnings,
      count: processedInnings.length
    });
  } catch (error) {
    console.error('Error fetching T20I innings progression:', error);
    res.status(500).json({ error: 'Failed to fetch T20I innings progression data' });
  }
});

// ========== Password Reset Functions ==========

// Forgot Password - Send reset link to email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: 'Please provide your email address' });
    }

    // Find user by email
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    // Always return success message to prevent email enumeration attacks
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store hashed token and expiry in user document
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpiry: resetTokenExpiry
        }
      }
    );

    // Create reset URL (use localhost for development, production URL for deployed)
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://ipl-deep-analysis-cricket.vercel.app'
      : 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">IPL Analytics</h1>
              <p style="color: #a8c7e8; margin: 10px 0 0 0; font-size: 14px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 22px;">Hello ${user.name || 'User'},</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset the password for your IPL Analytics account associated with <strong>${email}</strong>.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #e63946 0%, #d62839 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(230, 57, 70, 0.3);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
              <p style="color: #888888; font-size: 12px; line-height: 1.6; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #2d5a87; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} IPL Analytics. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"IPL Analytics" <${process.env.EMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: 'Reset Your Password - IPL Analytics',
      html: emailHtml
    });

    console.log(`Password reset email sent to: ${email}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset Password - Verify token and update password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const { email, token, newPassword } = req.body;

    // Validation
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Please provide email, token, and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching email, token, and valid expiry
    const user = await usersCollection.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: tokenHash,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired password reset link. Please request a new one.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password and clear reset token fields
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: '', resetPasswordExpiry: '' }
      }
    );

    console.log(`Password reset successful for: ${email}`);

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ========== Birthday Email Functions ==========

// Get user details from users collection
const getUserDetails = async (email) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: email });
    return user;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
};

// Get today's birthdays from IPLPlayersDOB collection
const getTodaysBirthdays = async () => {
  try {
    const dobCollection = db.collection('IPLPlayersDOB');
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed

    const players = await dobCollection.find({
      date_of_birth: { $exists: true, $ne: '' }
    }).toArray();

    const todaysBirthdays = players.filter(player => {
      if (!player.date_of_birth || typeof player.date_of_birth !== 'string') {
        return false;
      }

      let day, month;

      if (player.date_of_birth.includes('/')) {
        const parts = player.date_of_birth.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        }
      } else if (player.date_of_birth.includes('-')) {
        const parts = player.date_of_birth.split('-');
        if (parts.length === 3) {
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        }
      }

      return day === currentDay && month === currentMonth;
    });

    return todaysBirthdays.map(p => ({
      name: p.name || p.player_name || p._id,
      date_of_birth: p.date_of_birth
    }));
  } catch (error) {
    console.error('Error fetching today\'s birthdays:', error);
    return [];
  }
};

// Calculate age from date of birth
const calculateAge = (dob) => {
  let year;
  if (dob.includes('/')) {
    year = parseInt(dob.split('/')[2]);
  } else if (dob.includes('-')) {
    year = parseInt(dob.split('-')[0]);
  }

  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }

  return new Date().getFullYear() - year;
};

// Generate personalized email HTML
const generateBirthdayEmailHTML = (userName, players) => {
  const playersList = players.map(player => {
    const age = calculateAge(player.date_of_birth);
    return `
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0;">
          <strong style="color: #1a237e;">${player.name}</strong>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">
          <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
            ${age} years
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎂 IPL Birthday Alert!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your daily cricket birthday digest</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 25px 20px 15px 20px;">
          <p style="font-size: 18px; color: #333; margin: 0;">
            Hey <strong style="color: #667eea;">${userName || 'Cricket Fan'}</strong>! 👋
          </p>
          <p style="font-size: 16px; color: #555; margin: 15px 0 0 0; line-height: 1.6;">
            ${players.length === 1
              ? `There's <strong>1 IPL player</strong> celebrating their birthday today!`
              : `There are <strong>${players.length} IPL players</strong> celebrating their birthdays today!`}
          </p>
        </div>

        <!-- Players Table -->
        <div style="padding: 0 20px 25px 20px;">
          <table style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%);">
                <th style="padding: 15px; text-align: left; color: white; font-weight: 600;">Player Name</th>
                <th style="padding: 15px; text-align: center; color: white; font-weight: 600;">Turns</th>
              </tr>
            </thead>
            <tbody>
              ${playersList}
            </tbody>
          </table>
        </div>

        <!-- Call to Action -->
        <div style="padding: 0 20px 25px 20px; text-align: center;">
          <p style="font-size: 14px; color: #666; margin: 0 0 15px 0;">
            Wish them on social media or check out their stats on our platform!
          </p>
          <a href="https://ipl-deep-analysis-cricket.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Birthday Calendar 🗓️
          </a>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            🏏 IPL Cricket Analytics Tool
          </p>
          <p style="font-size: 11px; color: #aaa; margin: 8px 0 0 0;">
            You're receiving this because you subscribed to birthday alerts.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

// Send birthday email to a single user
const sendBirthdayEmailToUser = async (user, todaysBirthdays) => {
  try {
    const recipientEmail = user.email;
    const userName = user?.name || user?.fullName || user?.firstName || 'Cricket Fan';

    // Generate email HTML
    const emailHTML = generateBirthdayEmailHTML(userName, todaysBirthdays);

    // Send email
    const mailOptions = {
      from: `"IPL Birthday Bot 🏏" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `🎂 ${todaysBirthdays.length} IPL Player${todaysBirthdays.length > 1 ? 's' : ''} Birthday Today! - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      html: emailHTML
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Email sent to ${recipientEmail} (${userName})`);

    return { success: true, email: recipientEmail, messageId: info.messageId };
  } catch (error) {
    console.error(`   ❌ Failed to send to ${user.email}:`, error.message);
    return { success: false, email: user.email, error: error.message };
  }
};

// Send birthday emails to ALL users in the users collection
const sendBirthdayEmailsToAllUsers = async () => {
  try {
    // Get today's birthdays first
    const todaysBirthdays = await getTodaysBirthdays();

    if (todaysBirthdays.length === 0) {
      console.log('📭 No birthdays today. No emails sent.');
      return { success: true, message: 'No birthdays today', sent: false, count: 0 };
    }

    // Get all users from the users collection
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find({ email: { $exists: true, $ne: '' } }).toArray();

    if (allUsers.length === 0) {
      console.log('📭 No users found in the database.');
      return { success: true, message: 'No users found', sent: false, count: 0 };
    }

    console.log(`\n🎂 Sending birthday emails to ${allUsers.length} user(s)...`);
    console.log(`   📧 ${todaysBirthdays.length} player(s) have birthdays today: ${todaysBirthdays.map(p => p.name).join(', ')}`);

    const results = [];
    for (const user of allUsers) {
      const result = await sendBirthdayEmailToUser(user, todaysBirthdays);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Email Summary: ${successCount} sent, ${failedCount} failed`);

    return {
      success: true,
      message: `Emails sent to ${successCount}/${allUsers.length} users`,
      sent: true,
      totalUsers: allUsers.length,
      successCount,
      failedCount,
      players: todaysBirthdays.map(p => p.name),
      results
    };
  } catch (error) {
    console.error('❌ Error sending birthday emails:', error);
    return { success: false, error: error.message, sent: false };
  }
};

// API endpoint to manually trigger birthday emails to all users (for testing)
app.post('/api/birthday-email/send', async (req, res) => {
  try {
    const result = await sendBirthdayEmailsToAllUsers();
    res.json(result);
  } catch (error) {
    console.error('Error sending birthday emails:', error);
    res.status(500).json({ error: 'Failed to send birthday emails' });
  }
});

// API endpoint to list all users who will receive birthday emails
app.get('/api/birthday-email/users', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find({ email: { $exists: true, $ne: '' } }).toArray();

    res.json({
      users: allUsers.map(u => ({
        name: u.name || u.fullName || u.firstName || 'Unknown',
        email: u.email
      })),
      count: allUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// API endpoint to preview today's birthdays
app.get('/api/birthday-email/preview', async (req, res) => {
  try {
    const recipientEmail = process.env.BIRTHDAY_RECIPIENT_EMAIL || 'kankariadevang@gmail.com';
    const user = await getUserDetails(recipientEmail);
    const todaysBirthdays = await getTodaysBirthdays();

    res.json({
      recipient: recipientEmail,
      userName: user?.name || user?.fullName || user?.firstName || 'Cricket Fan',
      todaysBirthdays,
      count: todaysBirthdays.length,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error('Error previewing birthday email:', error);
    res.status(500).json({ error: 'Failed to preview birthday email' });
  }
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Schedule birthday emails to all users at 11:15 AM IST every day
    // Cron format: minute hour day-of-month month day-of-week
    cron.schedule('15 11 * * *', async () => {
      console.log('⏰ Running scheduled birthday email job at 11:15 AM IST...');
      await sendBirthdayEmailsToAllUsers();
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('📅 Birthday emails scheduled for 11:15 AM IST daily (all users)');

    // Schedule T20 data poll at 6:00 AM IST every day (cricsheet updates early morning)
    cron.schedule('0 6 * * *', async () => {
      console.log('⏰ Running scheduled T20 data poll at 6:00 AM IST...');
      await pollT20Data();
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('🏏 T20 data poll scheduled for 6:00 AM IST daily');
  });
});
