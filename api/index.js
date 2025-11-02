const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// MongoDB connection
let cachedDb = null;
let cachedCollection = null;
let cachedUsersCollection = null;

async function connectToDatabase() {
  if (cachedDb && cachedCollection && cachedUsersCollection) {
    return { db: cachedDb, collection: cachedCollection, usersCollection: cachedUsersCollection };
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MongoDB URI not configured');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'hello');
  const collection = db.collection(process.env.COLLECTION_NAME || 'IPL-ALL');
  const usersCollection = db.collection('users');

  cachedDb = db;
  cachedCollection = collection;
  cachedUsersCollection = usersCollection;

  return { db, collection, usersCollection };
}

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

// Admin Middleware - check if user has admin role
const requireAdmin = async (req, res, next) => {
  try {
    const { usersCollection } = await connectToDatabase();

    // Get user from database to check admin status
    const user = await usersCollection.findOne({
      email: req.user.email
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Add admin status to request
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cricket Analytics API is running' });
});

// ============ AUTHENTICATION ROUTES ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { usersCollection } = await connectToDatabase();
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide email, password, and name' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (default role is regular user)
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

    // Create token
    const token = jwt.sign(
      { userId: result.insertedId, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
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
    const { usersCollection } = await connectToDatabase();
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Create token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
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

// Verify token (check if user is authenticated and get admin status)
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const { usersCollection } = await connectToDatabase();

    // Get user from database to check admin status
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

// Get all users (Admin only route)
app.get('/api/auth/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { usersCollection } = await connectToDatabase();

    // Fetch all users but exclude password field
    const users = await usersCollection
      .find({})
      .project({ password: 0 }) // Exclude password from results
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    res.json({
      message: 'Users fetched successfully',
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============ END AUTHENTICATION ROUTES ============


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

// Get all unique bowlers
app.get('/api/bowlers', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const bowlers = await collection.distinct('bowler');
    const bowlersList = bowlers.filter(b => b && b.trim() !== '').sort();
    res.json({ bowlers: bowlersList, count: bowlersList.length });
  } catch (error) {
    console.error('Error fetching bowlers:', error);
    res.status(500).json({ error: 'Failed to fetch bowlers' });
  }
});

// Get player overall stats (supporting both routes for compatibility)
app.get('/api/stats/:name', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const player = req.params.name;

    // First get innings-wise scores to calculate 50s and 100s
    const inningsScores = await collection.aggregate([
      { $match: { batter: player, valid_ball: 1 } },
      {
        $group: {
          _id: { matchId: '$match_id', innings: '$innings' },
          runs: { $sum: '$runs_batter' }
        }
      },
      {
        $group: {
          _id: null,
          fifties: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$runs', 50] }, { $lt: ['$runs', 100] }] },
                1,
                0
              ]
            }
          },
          hundreds: {
            $sum: {
              $cond: [{ $gte: ['$runs', 100] }, 1, 0]
            }
          }
        }
      }
    ]).toArray();

    const inningsStats = inningsScores.length > 0 ? inningsScores[0] : { fifties: 0, hundreds: 0 };

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

    // Format for frontend compatibility
    const result = stats[0];
    const ballDistribution = [
      { name: 'Dot Balls', value: result.dots },
      { name: 'Singles/Doubles', value: result.totalBalls - result.dots - result.boundaries },
      { name: 'Fours', value: result.fours },
      { name: 'Sixes', value: result.sixes },
    ];

    // Calculate runs per over safely
    const runsPerOver = result.totalBalls > 0
      ? parseFloat((result.totalRuns / (result.totalBalls / 6)).toFixed(2))
      : 0;

    res.json({
      player,
      stats: {
        totalRuns: result.totalRuns,
        totalBalls: result.totalBalls,
        strikeRate: result.strikeRate,
        average: result.average,
        dots: result.dots,  // Changed from dotBalls to dots
        dotPercentage: result.dotPercentage,  // Changed from dotBallPercentage
        fours: result.fours,
        sixes: result.sixes,
        boundaries: result.boundaries,  // Added boundaries field
        dismissals: result.dismissals,
        fifties: inningsStats.fifties,  // Number of 50s (50-99)
        hundreds: inningsStats.hundreds,  // Number of 100s
        runsPerOver: runsPerOver,
        ballDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// Get player image from All-Players collection
app.get('/api/player/:name/image', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const playersCollection = db.collection('All-Players');
    const playerName = req.params.name;

    console.log('Searching for player image:', playerName);

    // Try to find player with fuzzy matching
    // First try exact match on fullname
    let player = await playersCollection.findOne(
      { fullname: { $regex: new RegExp(`^${playerName}$`, 'i') } },
      { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
    );

    // If no exact match, check if name has initials (e.g., "V Kohli", "TM Dilshan")
    if (!player) {
      const nameParts = playerName.split(' ');
      if (nameParts.length >= 2) {
        const firstPart = nameParts[0];
        const lastPart = nameParts.slice(1).join(' ');

        // Check if first part contains initials (all uppercase letters, possibly with dots)
        // Examples: "V", "TM", "MS", "V.", "T.M."
        const cleanedFirstPart = firstPart.replace(/\./g, '');
        const isInitials = /^[A-Z]{1,3}$/i.test(cleanedFirstPart);

        if (isInitials) {
          // Extract the first initial letter
          const firstInitial = cleanedFirstPart[0].toUpperCase();

          // Search for players where firstname starts with this initial and lastname matches
          player = await playersCollection.findOne(
            {
              firstname: { $regex: new RegExp(`^${firstInitial}`, 'i') },
              lastname: { $regex: new RegExp(`^${lastPart}$`, 'i') }
            },
            { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
          );

          console.log(`Searching with initial "${firstInitial}" and lastname "${lastPart}":`, player ? player.fullname : 'not found');

          // If still not found with firstname match, try matching fullname pattern
          // This handles cases where the All-Players collection might have different structure
          if (!player) {
            player = await playersCollection.findOne(
              {
                $and: [
                  { fullname: { $regex: new RegExp(`^[A-Z].*${lastPart}$`, 'i') } },
                  { fullname: { $regex: new RegExp(`^${firstInitial}`, 'i') } }
                ]
              },
              { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
            );
            console.log('Fullname pattern search result:', player ? player.fullname : 'not found');
          }
        } else {
          // Try firstname lastname combination
          player = await playersCollection.findOne(
            {
              $or: [
                { firstname: { $regex: new RegExp(`^${firstPart}$`, 'i') }, lastname: { $regex: new RegExp(`^${lastPart}$`, 'i') } },
                { fullname: { $regex: new RegExp(playerName, 'i') } }
              ]
            },
            { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
          );
        }
      }
    }

    // If still no match, try partial match on fullname
    if (!player) {
      player = await playersCollection.findOne(
        { fullname: { $regex: new RegExp(playerName, 'i') } },
        { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
      );
    }

    if (!player || !player.image_path) {
      console.log('Player image not found for:', playerName);
      return res.json({
        playerName,
        image_path: null,
        message: 'Player image not found'
      });
    }

    console.log('Found player:', player.fullname, 'with image:', player.image_path);
    res.json({
      playerName: player.fullname || playerName,
      image_path: player.image_path,
      firstname: player.firstname,
      lastname: player.lastname,
      battingstyle: player.battingstyle || null,
      bowlingstyle: player.bowlingstyle || null
    });
  } catch (error) {
    console.error('Error fetching player image:', error);
    res.status(500).json({ error: 'Failed to fetch player image' });
  }
});

// Alternative route for player stats (redirect to main route)
app.get('/api/player/:name/stats', async (req, res) => {
  // Redirect to the main stats endpoint
  req.params.name = req.params.name;
  return app._router.handle(req, res);
});

// Get bowler statistics
app.get('/api/bowler-stats/:name', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const bowler = req.params.name;

    console.log('Fetching bowler stats for:', bowler);

    // First, get innings-wise wickets for 3W, 4W, 5W calculations
    const inningsWickets = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      {
        $group: {
          _id: { matchId: '$match_id', innings: '$innings' },
          wickets: {
            $sum: {
              $cond: [{ $eq: ['$striker_out', 1] }, 1, 0]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          threeWickets: {
            $sum: {
              $cond: [{ $eq: ['$wickets', 3] }, 1, 0]
            }
          },
          fourWickets: {
            $sum: {
              $cond: [{ $eq: ['$wickets', 4] }, 1, 0]
            }
          },
          fiveWickets: {
            $sum: {
              $cond: [{ $gte: ['$wickets', 5] }, 1, 0]
            }
          }
        }
      }
    ]).toArray();

    const wicketStats = inningsWickets[0] || { threeWickets: 0, fourWickets: 0, fiveWickets: 0 };

    // Get overall bowling statistics
    const stats = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      {
        $group: {
          _id: null,
          totalBalls: { $sum: 1 },
          totalRuns: { $sum: '$runs_total' },
          totalWickets: {
            $sum: {
              $cond: [{ $eq: ['$striker_out', 1] }, 1, 0]
            }
          },
          maidens: { $sum: 0 } // Will calculate separately
        }
      }
    ]).toArray();

    if (!stats || stats.length === 0) {
      return res.status(404).json({ error: 'Bowler not found' });
    }

    const result = stats[0];

    // Calculate overs properly (cricket style: 6 balls = 1 over)
    const completedOvers = Math.floor(result.totalBalls / 6);
    const remainingBalls = result.totalBalls % 6;
    const oversFormatted = remainingBalls > 0 ? `${completedOvers}.${remainingBalls}` : `${completedOvers}.0`;
    const totalOversDecimal = completedOvers + (remainingBalls / 10); // For economy calculation

    // Calculate maidens (overs with 0 runs)
    const maidensData = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      {
        $group: {
          _id: { matchId: '$match_id', innings: '$innings', over: '$over' },
          runsInOver: { $sum: '$runs_total' }
        }
      },
      {
        $match: { runsInOver: 0 }
      },
      {
        $count: 'maidens'
      }
    ]).toArray();

    const maidens = maidensData.length > 0 ? maidensData[0].maidens : 0;

    // Calculate bowling average (runs per wicket)
    const bowlingAverage = result.totalWickets > 0
      ? parseFloat((result.totalRuns / result.totalWickets).toFixed(2))
      : 0;

    // Calculate economy rate (runs per over)
    const economyRate = totalOversDecimal > 0
      ? parseFloat((result.totalRuns / totalOversDecimal).toFixed(2))
      : 0;

    // Calculate bowling strike rate (balls per wicket)
    const bowlingStrikeRate = result.totalWickets > 0
      ? parseFloat((result.totalBalls / result.totalWickets).toFixed(2))
      : 0;

    res.json({
      bowler,
      stats: {
        overs: oversFormatted,
        balls: result.totalBalls,
        maidens: maidens,
        totalRuns: result.totalRuns,
        wickets: result.totalWickets,
        bowlingAverage: bowlingAverage,
        threeWickets: wicketStats.threeWickets,
        fourWickets: wicketStats.fourWickets,
        fiveWickets: wicketStats.fiveWickets,
        economyRate: economyRate,
        bowlingStrikeRate: bowlingStrikeRate
      }
    });
  } catch (error) {
    console.error('Error fetching bowler stats:', error);
    res.status(500).json({ error: 'Failed to fetch bowler stats' });
  }
});

// Analyze phase performance
app.post('/api/analyze/phase-performance', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
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
      averageRuns: parseFloat((totalRuns / matchingInnings.length).toFixed(2)),
      strikeRate: parseFloat(((totalRuns / totalBalls) * 100).toFixed(2)),
      dismissalRate: parseFloat(((dismissals / matchingInnings.length) * 100).toFixed(2)),
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
    const { collection } = await connectToDatabase();
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
              wicketType: '$wicket_type',
              wicketKind: '$wicket_kind'
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
              wicketType: '$dismissal.wicketType',
              wicketKind: '$dismissal.wicketKind'
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
    const dismissalKinds = {};

    dismissals.forEach(d => {
      if (d.over <= 6) overRanges['Powerplay (1-6)']++;
      else if (d.over <= 15) overRanges['Middle (7-15)']++;
      else overRanges['Death (16-20)']++;

      // Count wicket_type
      if (d.wicketType) {
        dismissalTypes[d.wicketType] = (dismissalTypes[d.wicketType] || 0) + 1;
      }

      // Count wicket_kind
      if (d.wicketKind) {
        dismissalKinds[d.wicketKind] = (dismissalKinds[d.wicketKind] || 0) + 1;
      }
    });

    res.json({
      player,
      ballsPlayed,
      totalDismissals: results[0].totalDismissals,
      overRanges,
      dismissalTypes,
      dismissalKinds,
      dismissals: dismissals.slice(0, 20) // Return sample
    });
  } catch (error) {
    console.error('Error analyzing dismissal patterns:', error);
    res.status(500).json({ error: 'Failed to analyze dismissal patterns' });
  }
});

// Analyze batsman vs bowler matchup
app.post('/api/analyze/batsman-vs-bowler', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const { batsman, bowler } = req.body;

    if (!batsman || !bowler) {
      return res.status(400).json({ error: 'Both batsman and bowler are required' });
    }

    // Aggregate stats for batsman vs bowler
    const stats = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowler: bowler,
          valid_ball: 1
        }
      },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_batter' },
          totalBalls: { $sum: 1 },
          fours: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0] }
          },
          sixes: {
            $sum: { $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0] }
          },
          dots: {
            $sum: { $cond: [{ $and: [{ $eq: ['$runs_batter', 0] }, { $eq: ['$runs_extras', 0] }] }, 1, 0] }
          },
          dismissals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$striker_out', true] },
                    { $ne: ['$wicket_type', 'run out'] }
                  ]
                },
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
        message: 'No data available for this matchup'
      });
    }

    const result = stats[0];
    const strikeRate = ((result.totalRuns / result.totalBalls) * 100).toFixed(2);
    const average = result.dismissals > 0
      ? (result.totalRuns / result.dismissals).toFixed(2)
      : result.totalRuns.toFixed(2);

    // Get phase-wise breakdown
    const phaseStats = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowler: bowler,
          valid_ball: 1
        }
      },
      {
        $project: {
          runs: '$runs_batter',
          phase: {
            $switch: {
              branches: [
                { case: { $lte: ['$over', 6] }, then: 'Powerplay (1-6)' },
                { case: { $lte: ['$over', 15] }, then: 'Middle (7-15)' },
                { case: { $gte: ['$over', 16] }, then: 'Death (16-20)' }
              ],
              default: 'Unknown'
            }
          }
        }
      },
      {
        $group: {
          _id: '$phase',
          runs: { $sum: '$runs' },
          balls: { $sum: 1 }
        }
      }
    ]).toArray();

    const phaseStatsObj = {};
    phaseStats.forEach(p => {
      phaseStatsObj[p._id] = {
        runs: p.runs,
        balls: p.balls,
        strikeRate: ((p.runs / p.balls) * 100).toFixed(2)
      };
    });

    // Get dismissal details with match information
    const dismissalDetails = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowler: bowler,
          striker_out: true,
          valid_ball: 1
        }
      },
      {
        $project: {
          wicketType: '$wicket_type',
          wicketKind: '$wicket_kind',
          fielders: '$fielders',
          over: '$over',
          runsScored: '$runs_batter',
          // Match details
          season: '$season',
          matchId: '$match_id',
          battingTeam: '$batting_team',
          bowlingTeam: '$bowling_team',
          venue: '$venue',
          date: '$date',
          phase: {
            $switch: {
              branches: [
                { case: { $lte: ['$over', 6] }, then: 'Powerplay' },
                { case: { $lte: ['$over', 15] }, then: 'Middle' },
                { case: { $gte: ['$over', 16] }, then: 'Death' }
              ],
              default: 'Unknown'
            }
          }
        }
      },
      { $sort: { season: -1, date: -1 } }, // Most recent first
      { $limit: 20 } // Increase limit to show more dismissals
    ]).toArray();

    // Runs distribution
    const runsDistribution = [
      { name: 'Dots', value: result.dots },
      { name: 'Singles/Doubles', value: result.totalBalls - result.dots - result.fours - result.sixes },
      { name: 'Fours', value: result.fours },
      { name: 'Sixes', value: result.sixes }
    ];

    res.json({
      batsman,
      bowler,
      totalRuns: result.totalRuns,
      totalBalls: result.totalBalls,
      strikeRate: parseFloat(strikeRate),
      average: parseFloat(average),
      dismissals: result.dismissals,
      fours: result.fours,
      sixes: result.sixes,
      dots: result.dots,
      phaseStats: phaseStatsObj,
      dismissalDetails,
      runsDistribution
    });
  } catch (error) {
    console.error('Error analyzing batsman vs bowler:', error);
    res.status(500).json({ error: 'Failed to analyze batsman vs bowler matchup' });
  }
});

// Get MOTM (Man of the Match) awards by venue
app.get('/api/motm/:player', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const player = req.params.player;

    // Get all unique matches where player won MOTM
    const motmMatches = await collection.aggregate([
      {
        $match: {
          player_of_match: player
        }
      },
      {
        $group: {
          _id: {
            matchId: '$match_id',
            venue: '$venue',
            season: '$season'
          },
          venue: { $first: '$venue' },
          season: { $first: '$season' },
          matchDate: { $first: '$start_date' },
          // Get unique teams from the match
          teams: { $addToSet: { $cond: [{ $ne: ['$batting_team', null] }, '$batting_team', '$bowling_team'] } }
        }
      },
      {
        $group: {
          _id: '$venue',
          count: { $sum: 1 },
          seasons: { $addToSet: '$season' },
          matches: {
            $push: {
              matchId: '$_id.matchId',
              season: '$season',
              date: '$matchDate',
              teams: '$teams',
              venue: '$venue'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          venue: '$_id',
          count: 1,
          seasons: 1,
          matches: 1
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get total MOTM count
    const totalMotm = motmMatches.reduce((sum, venue) => sum + venue.count, 0);

    // Get unique venues count
    const totalVenues = motmMatches.length;

    // Prepare venue distribution for charts
    const venueDistribution = motmMatches.map(item => ({
      venue: item.venue,
      count: item.count,
      percentage: totalMotm > 0 ? ((item.count / totalMotm) * 100).toFixed(1) : 0
    }));

    // Get season-wise MOTM count
    const seasonStats = await collection.aggregate([
      {
        $match: {
          player_of_match: player
        }
      },
      {
        $group: {
          _id: {
            matchId: '$match_id',
            season: '$season'
          },
          season: { $first: '$season' }
        }
      },
      {
        $group: {
          _id: '$season',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          season: '$_id',
          count: 1
        }
      },
      { $sort: { season: 1 } }
    ]).toArray();

    res.json({
      player,
      totalMotm,
      totalVenues,
      venueDetails: motmMatches,
      venueDistribution,
      seasonStats
    });

  } catch (error) {
    console.error('Error fetching MOTM data:', error);
    res.status(500).json({ error: 'Failed to fetch MOTM statistics' });
  }
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
