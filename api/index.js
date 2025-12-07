const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Player name disambiguation map for handling cases where multiple players have similar names
// Maps abbreviated names to their full names to avoid confusion
const PLAYER_DISAMBIGUATION = {
  'HV Patel': 'Harshal Patel',  // Prefer Harshal Patel over Hiral Patel
  'H Patel': 'Harshal Patel',
  // Add more as needed
};

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

    // Create access token (15 minutes) and refresh token (7 days)
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

    // Create access token (15 minutes) and refresh token (7 days)
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

// Refresh access token using refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Check if it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    const { usersCollection } = await connectToDatabase();
    const user = await usersCollection.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create new access token
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

// Get player birth dates from IPLPlayersDOB collection
app.get('/api/players/birthdays', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
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
    const { db } = await connectToDatabase();
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
    const { db } = await connectToDatabase();
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
    let playerName = req.params.name;

    console.log('Searching for player image:', playerName);

    // Check if this player name needs disambiguation
    if (PLAYER_DISAMBIGUATION[playerName]) {
      playerName = PLAYER_DISAMBIGUATION[playerName];
      console.log('Using disambiguated name:', playerName);
    }

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

          // Check if there are multiple initials (e.g., "HV", "MS", "TM")
          const hasMultipleInitials = cleanedFirstPart.length > 1;

          if (hasMultipleInitials) {
            // For multi-initial names like "HV Patel", try to match the full initials pattern
            // This helps distinguish between "Harshal V Patel" and "Hiral Patel"
            const initialsPattern = cleanedFirstPart.split('').join('.*');

            player = await playersCollection.findOne(
              {
                $and: [
                  { fullname: { $regex: new RegExp(`^${initialsPattern}.*${lastPart}$`, 'i') } },
                  { lastname: { $regex: new RegExp(`^${lastPart}$`, 'i') } }
                ]
              },
              { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
            );

            console.log(`Searching with multi-initials "${cleanedFirstPart}" and lastname "${lastPart}":`, player ? player.fullname : 'not found');
          } else {
            // Single initial - search for players where firstname starts with this initial and lastname matches
            player = await playersCollection.findOne(
              {
                firstname: { $regex: new RegExp(`^${firstInitial}`, 'i') },
                lastname: { $regex: new RegExp(`^${lastPart}$`, 'i') }
              },
              { projection: { image_path: 1, fullname: 1, firstname: 1, lastname: 1, battingstyle: 1, bowlingstyle: 1 } }
            );

            console.log(`Searching with initial "${firstInitial}" and lastname "${lastPart}":`, player ? player.fullname : 'not found');
          }

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
    // Use striker_out = true and exclude run outs
    const inningsWickets = await collection.aggregate([
      {
        $match: {
          bowler: bowler,
          valid_ball: 1,
          striker_out: true  // Only balls where striker was out
        }
      },
      {
        $group: {
          _id: { matchId: '$match_id', innings: '$innings' },
          wickets: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$wicket_kind', 'run out'] },
                  { $ne: ['$wicket_kind', 'retired hurt'] },
                  { $ne: ['$wicket_kind', 'retired out'] },
                  { $ne: ['$wicket_kind', 'obstructing the field'] }
                ]},
                1,
                0
              ]
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
    // Count total balls separately, then count wickets only from striker_out = true
    const ballsStats = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      {
        $group: {
          _id: null,
          totalBalls: { $sum: 1 },
          totalRuns: { $sum: '$runs_total' }
        }
      }
    ]).toArray();

    const wicketsStats = await collection.aggregate([
      {
        $match: {
          bowler: bowler,
          valid_ball: 1,
          striker_out: true  // Only balls where striker was out
        }
      },
      {
        $group: {
          _id: null,
          totalWickets: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$wicket_kind', 'run out'] },
                  { $ne: ['$wicket_kind', 'retired hurt'] },
                  { $ne: ['$wicket_kind', 'retired out'] },
                  { $ne: ['$wicket_kind', 'obstructing the field'] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    if (!ballsStats || ballsStats.length === 0) {
      return res.status(404).json({ error: 'Bowler not found' });
    }

    const result = ballsStats[0];
    result.totalWickets = wicketsStats.length > 0 && wicketsStats[0].totalWickets ? wicketsStats[0].totalWickets : 0;

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

    // Calculate dot balls (balls where runs_total = 0)
    const dotBallsData = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1, runs_total: 0 } },
      { $count: 'dotBalls' }
    ]).toArray();

    const dotBalls = dotBallsData.length > 0 ? dotBallsData[0].dotBalls : 0;

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

    // Calculate number of matches (unique match_id count)
    const matchesData = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      { $group: { _id: '$match_id' } },
      { $count: 'matches' }
    ]).toArray();

    const matches = matchesData.length > 0 ? matchesData[0].matches : 0;

    // Phase-wise bowling statistics
    // Powerplay: overs 1-6, Middle: overs 7-15, Death: overs 16-20
    const phaseStats = await collection.aggregate([
      { $match: { bowler: bowler, valid_ball: 1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $lte: ['$over', 6] }, 'Powerplay',
              { $cond: [
                { $lte: ['$over', 15] }, 'Middle',
                'Death'
              ]}
            ]
          },
          balls: { $sum: 1 },
          runs: { $sum: '$runs_total' },
          wickets: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$striker_out', true] },
                  { $ne: ['$wicket_kind', 'run out'] },
                  { $ne: ['$wicket_kind', 'retired hurt'] },
                  { $ne: ['$wicket_kind', 'retired out'] },
                  { $ne: ['$wicket_kind', 'obstructing the field'] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    // Format phase stats with economy rate, bowling average, and strike rate
    const phaseBreakdown = {
      powerplay: { balls: 0, runs: 0, wickets: 0, economyRate: 0, bowlingAverage: 0, bowlingStrikeRate: 0 },
      middle: { balls: 0, runs: 0, wickets: 0, economyRate: 0, bowlingAverage: 0, bowlingStrikeRate: 0 },
      death: { balls: 0, runs: 0, wickets: 0, economyRate: 0, bowlingAverage: 0, bowlingStrikeRate: 0 }
    };

    phaseStats.forEach(phase => {
      const balls = phase.balls;
      const runs = phase.runs;
      const wickets = phase.wickets;
      const overs = Math.floor(balls / 6) + ((balls % 6) / 10);
      const economy = overs > 0 ? parseFloat((runs / overs).toFixed(2)) : 0;
      const bowlingAvg = wickets > 0 ? parseFloat((runs / wickets).toFixed(2)) : 0;
      const bowlingStrikeRate = wickets > 0 ? parseFloat((balls / wickets).toFixed(2)) : 0;

      if (phase._id === 'Powerplay') {
        phaseBreakdown.powerplay = { balls, runs, wickets, economyRate: economy, bowlingAverage: bowlingAvg, bowlingStrikeRate };
      } else if (phase._id === 'Middle') {
        phaseBreakdown.middle = { balls, runs, wickets, economyRate: economy, bowlingAverage: bowlingAvg, bowlingStrikeRate };
      } else if (phase._id === 'Death') {
        phaseBreakdown.death = { balls, runs, wickets, economyRate: economy, bowlingAverage: bowlingAvg, bowlingStrikeRate };
      }
    });

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
        bowlingStrikeRate: bowlingStrikeRate,
        dotBalls: dotBalls,
        matches: matches,
        phaseBreakdown: phaseBreakdown
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

    // Break down middle overs into sub-phases
    const middleOversBreakdown = {
      'Early Middle (7-9)': 0,
      'Mid Middle (10-12)': 0,
      'Late Middle (13-15)': 0
    };

    const dismissalTypes = {};
    const dismissalKinds = {};

    dismissals.forEach(d => {
      if (d.over <= 6) overRanges['Powerplay (1-6)']++;
      else if (d.over <= 15) {
        overRanges['Middle (7-15)']++;

        // Sub-categorize middle overs
        if (d.over <= 9) middleOversBreakdown['Early Middle (7-9)']++;
        else if (d.over <= 12) middleOversBreakdown['Mid Middle (10-12)']++;
        else middleOversBreakdown['Late Middle (13-15)']++;
      }
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
      middleOversBreakdown,
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

// Get batsman vs team stats
app.get('/api/batsman-vs-team/:batsmanName/:teamName', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const batsman = req.params.batsmanName;
    const team = req.params.teamName;

    // Get innings-wise scores to calculate 50s and 100s
    // Note: We count ALL runs (including runs off no-balls) for batsman's score
    // but only valid balls for balls faced count
    const inningsScores = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowling_team: team
        }
      },
      {
        $group: {
          _id: { matchId: '$match_id', innings: '$innings' },
          runs: { $sum: '$runs_batter' },  // All runs including off no-balls
          balls: { $sum: { $cond: [{ $eq: ['$valid_ball', 1] }, 1, 0] } }  // Only valid balls
        }
      }
    ]).toArray();

    // Calculate 50s and 100s
    const fifties = inningsScores.filter(inn => inn.runs >= 50 && inn.runs < 100).length;
    const hundreds = inningsScores.filter(inn => inn.runs >= 100).length;
    const highestScore = inningsScores.length > 0
      ? Math.max(...inningsScores.map(inn => inn.runs))
      : 0;

    // Get overall stats against this team
    // Note: totalRuns includes all runs (even off no-balls), but totalBalls counts only valid balls
    const stats = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowling_team: team
        }
      },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$runs_batter' },  // All runs including off no-balls
          totalBalls: { $sum: { $cond: [{ $eq: ['$valid_ball', 1] }, 1, 0] } },  // Only valid balls
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
              $cond: [{ $and: [{ $eq: ['$runs_batter', 0] }, { $eq: ['$runs_extras', 0] }, { $eq: ['$valid_ball', 1] }] }, 1, 0]
            }
          },
          dismissals: {
            $sum: {
              $cond: [{ $eq: ['$striker_out', true] }, 1, 0]
            }
          }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      return res.json({
        batsman,
        team,
        matches: 0,
        stats: null,
        message: `${batsman} has not played against ${team} in available data`
      });
    }

    const result = stats[0];
    const strikeRate = result.totalBalls > 0
      ? parseFloat(((result.totalRuns / result.totalBalls) * 100).toFixed(2))
      : 0;
    const average = result.dismissals > 0
      ? parseFloat((result.totalRuns / result.dismissals).toFixed(2))
      : result.totalRuns;

    // Get number of unique matches
    const matches = await collection.distinct('match_id', {
      batter: batsman,
      bowling_team: team
    });

    // Get phase-wise breakdown
    // Note: runs includes all runs (even off no-balls), but balls counts only valid balls
    const phaseStats = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowling_team: team
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lte: ['$over', 6] }, 'Powerplay',
              { $cond: [
                { $lte: ['$over', 15] }, 'Middle',
                'Death'
              ]}
            ]
          },
          runs: { $sum: '$runs_batter' },  // All runs including off no-balls
          balls: { $sum: { $cond: [{ $eq: ['$valid_ball', 1] }, 1, 0] } },  // Only valid balls
          fours: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0]
            }
          },
          sixes: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0]
            }
          }
        }
      }
    ]).toArray();

    const phaseBreakdown = {
      powerplay: { runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 },
      middle: { runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 },
      death: { runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 }
    };

    phaseStats.forEach(phase => {
      const sr = phase.balls > 0 ? parseFloat(((phase.runs / phase.balls) * 100).toFixed(2)) : 0;
      if (phase._id === 'Powerplay') {
        phaseBreakdown.powerplay = { ...phase, strikeRate: sr };
      } else if (phase._id === 'Middle') {
        phaseBreakdown.middle = { ...phase, strikeRate: sr };
      } else if (phase._id === 'Death') {
        phaseBreakdown.death = { ...phase, strikeRate: sr };
      }
    });

    // Get season-wise performance
    // Note: runs includes all runs (even off no-balls), but balls counts only valid balls
    const seasonStats = await collection.aggregate([
      {
        $match: {
          batter: batsman,
          bowling_team: team
        }
      },
      {
        $group: {
          _id: '$season',
          runs: { $sum: '$runs_batter' },  // All runs including off no-balls
          balls: { $sum: { $cond: [{ $eq: ['$valid_ball', 1] }, 1, 0] } },  // Only valid balls
          fours: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0]
            }
          },
          sixes: {
            $sum: {
              $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          season: '$_id',
          runs: 1,
          balls: 1,
          fours: 1,
          sixes: 1,
          strikeRate: {
            $cond: [
              { $gt: ['$balls', 0] },
              { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 100] }, 2] },
              0
            ]
          }
        }
      },
      { $sort: { season: 1 } }
    ]).toArray();

    res.json({
      batsman,
      team,
      matches: matches.length,
      stats: {
        totalRuns: result.totalRuns,
        totalBalls: result.totalBalls,
        strikeRate,
        average,
        fours: result.fours,
        sixes: result.sixes,
        dots: result.dots,
        dismissals: result.dismissals,
        fifties,
        hundreds,
        highestScore,
        phaseBreakdown,
        seasonStats
      }
    });

  } catch (error) {
    console.error('Error fetching batsman vs team stats:', error);
    res.status(500).json({ error: 'Failed to fetch batsman vs team statistics' });
  }
});

// Get all unique teams
app.get('/api/teams', async (_req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const teams = await collection.distinct('batting_team');
    const teamsList = teams.filter(t => t && t.trim() !== '').sort();
    res.json({ teams: teamsList, count: teamsList.length });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get batsman vs bowling style stats
app.get('/api/batsman-vs-bowling-style/:batsmanName', async (req, res) => {
  try {
    const { collection, db } = await connectToDatabase();
    const batsman = req.params.batsmanName;
    const playersCollection = db.collection('All-Players');

    // Get all balls faced by the batsman
    const batsmanBalls = await collection.find({
      batter: batsman
    }).toArray();

    if (batsmanBalls.length === 0) {
      return res.json({
        batsman,
        stats: null,
        message: `${batsman} has not played in available data`
      });
    }

    // Get unique bowlers
    const bowlers = [...new Set(batsmanBalls.map(b => b.bowler))];

    // Fetch bowling styles for all bowlers in a single query - PERFORMANCE OPTIMIZED
    const bowlerStyles = {};

    // Fetch all player info in one query using $in operator
    const allPlayerInfo = await playersCollection.find({
      fullname: { $in: bowlers }
    }).toArray();

    // Create a map of bowler name to bowling style
    const playerMap = {};
    allPlayerInfo.forEach(player => {
      if (player.fullname && player.bowlingstyle) {
        playerMap[player.fullname] = player.bowlingstyle;
      }
    });

    // Assign bowling styles to each bowler
    bowlers.forEach(bowler => {
      bowlerStyles[bowler] = playerMap[bowler] || 'Unknown';
    });

    // Group balls by bowling style
    const styleStats = {};

    batsmanBalls.forEach(ball => {
      const bowlingStyle = bowlerStyles[ball.bowler] || 'Unknown';

      if (!styleStats[bowlingStyle]) {
        styleStats[bowlingStyle] = {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dots: 0,
          dismissals: 0,
          boundaries: 0,
          bowlers: new Set()
        };
      }

      const stats = styleStats[bowlingStyle];

      // Count runs (including off no-balls)
      stats.runs += ball.runs_batter || 0;

      // Count valid balls only
      if (ball.valid_ball === 1) {
        stats.balls += 1;
      }

      // Count boundaries
      if (ball.runs_batter === 4) {
        stats.fours += 1;
        stats.boundaries += 1;
      }
      if (ball.runs_batter === 6) {
        stats.sixes += 1;
        stats.boundaries += 1;
      }

      // Count dots (valid balls with no runs)
      if (ball.valid_ball === 1 && ball.runs_batter === 0 && ball.runs_extras === 0) {
        stats.dots += 1;
      }

      // Count dismissals
      if (ball.striker_out === true) {
        stats.dismissals += 1;
      }

      // Track unique bowlers
      stats.bowlers.add(ball.bowler);
    });

    // Calculate derived stats and format response
    const formattedStats = {};

    Object.keys(styleStats).forEach(style => {
      const stat = styleStats[style];
      const strikeRate = stat.balls > 0 ? parseFloat(((stat.runs / stat.balls) * 100).toFixed(2)) : 0;
      const average = stat.dismissals > 0 ? parseFloat((stat.runs / stat.dismissals).toFixed(2)) : stat.runs;
      const dotPercentage = stat.balls > 0 ? parseFloat(((stat.dots / stat.balls) * 100).toFixed(2)) : 0;
      const boundaryPercentage = stat.balls > 0 ? parseFloat(((stat.boundaries / stat.balls) * 100).toFixed(2)) : 0;

      // Convert Set to array for JSON serialization
      const bowlersList = Array.from(stat.bowlers);
      
      formattedStats[style] = {
        bowlingStyle: style,
        runs: stat.runs,
        balls: stat.balls,
        strikeRate,
        average,
        fours: stat.fours,
        sixes: stat.sixes,
        dots: stat.dots,
        dotPercentage,
        boundaries: stat.boundaries,
        boundaryPercentage,
        dismissals: stat.dismissals,
        bowlersFaced: stat.bowlers.size,
        bowlers: bowlersList  // Include the list of bowlers
      };
    });

    // Sort by balls faced (most to least)
    const sortedStats = Object.values(formattedStats).sort((a, b) => b.balls - a.balls);

    res.json({
      batsman,
      stats: sortedStats,
      totalBowlingStyles: sortedStats.length
    });

  } catch (error) {
    console.error('Error fetching batsman vs bowling style stats:', error);
    res.status(500).json({ error: 'Failed to fetch batsman vs bowling style statistics' });
  }
});

// Reddit IPL Feed - Proxy endpoint with caching
let redditCache = null;
let redditCacheTime = 0;
const REDDIT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/reddit/ipl', async (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (redditCache && (now - redditCacheTime) < REDDIT_CACHE_DURATION) {
      return res.json(redditCache);
    }

    // Fetch fresh data from Reddit using https module with timeout
    const data = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000); // 10 second timeout

      const options = {
        hostname: 'www.reddit.com',
        path: '/r/IPL/.json',
        method: 'GET',
        headers: {
          'User-Agent': 'IPL-Analytics-App/1.0',
          'Accept': 'application/json'
        },
        timeout: 10000
      };

      const request = https.get(options, (response) => {
        clearTimeout(timeout);
        let rawData = '';

        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          reject(new Error('Redirect not supported'));
          return;
        }

        // Check for error status codes
        if (response.statusCode !== 200) {
          reject(new Error(`Reddit API returned status ${response.statusCode}`));
          return;
        }

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            if (!parsedData || !parsedData.data || !parsedData.data.children) {
              reject(new Error('Invalid Reddit response format'));
              return;
            }
            resolve(parsedData);
          } catch (e) {
            reject(new Error('Failed to parse Reddit response: ' + e.message));
          }
        });
      });

      request.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });

      request.on('timeout', () => {
        request.destroy();
        clearTimeout(timeout);
        reject(new Error('Request timeout'));
      });
    });

    // Extract and format posts
    const posts = data.data.children.map(child => {
      const post = child.data;
      return {
        id: post.id,
        title: post.title,
        author: post.author,
        score: post.score,
        numComments: post.num_comments,
        created: post.created_utc,
        url: post.url,
        permalink: `https://www.reddit.com${post.permalink}`,
        thumbnail: post.thumbnail !== 'self' && post.thumbnail !== 'default' ? post.thumbnail : null,
        linkFlairText: post.link_flair_text || null,
        linkFlairBackgroundColor: post.link_flair_background_color || null,
        selftext: post.selftext || null,
        isVideo: post.is_video || false
      };
    });

    const result = { posts, count: posts.length };

    // Update cache
    redditCache = result;
    redditCacheTime = now;

    res.json(result);
  } catch (error) {
    console.error('Error fetching Reddit data:', error.message || error);

    // If we have cached data (even if expired), return it as fallback
    if (redditCache) {
      console.log('Returning stale cached data as fallback');
      return res.json({ ...redditCache, cached: true, cacheAge: Date.now() - redditCacheTime });
    }

    res.status(500).json({
      error: 'Failed to fetch Reddit posts',
      message: error.message || 'Unknown error',
      details: 'Reddit API may be temporarily unavailable'
    });
  }
});

// Get innings progression for phase analysis modal
app.post('/api/analyze/innings-progression', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
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

// Compare two batsmen
app.post('/api/compare/batsmen', async (req, res) => {
  try {
    const { collection } = await connectToDatabase();
    const { batsman1, batsman2 } = req.body;

    if (!batsman1 || !batsman2) {
      return res.status(400).json({ error: 'Both batsmen names are required' });
    }

    // Aggregate stats for both batsmen
    const getBatsmanStats = async (player) => {
      const stats = await collection.aggregate([
        { $match: { batter: player, valid_ball: 1 } },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: '$runs_batter' },
            ballsFaced: { $sum: 1 },
            fours: {
              $sum: { $cond: [{ $eq: ['$runs_batter', 4] }, 1, 0] }
            },
            sixes: {
              $sum: { $cond: [{ $eq: ['$runs_batter', 6] }, 1, 0] }
            },
            dismissals: {
              $sum: { $cond: [{ $eq: ['$striker_out', true] }, 1, 0] }
            },
            matches: { $addToSet: '$match_id' },
            innings: { $addToSet: { match_id: '$match_id', innings: '$innings' } }
          }
        }
      ]).toArray();

      if (!stats || stats.length === 0) {
        return null;
      }

      const data = stats[0];
      const totalRuns = data.totalRuns || 0;
      const ballsFaced = data.ballsFaced || 0;
      const dismissals = data.dismissals || 0;
      const fours = data.fours || 0;
      const sixes = data.sixes || 0;
      const matches = data.matches?.length || 0;
      const innings = data.innings?.length || 0;

      // Get highest score
      const highestScoreData = await collection.aggregate([
        { $match: { batter: player, valid_ball: 1 } },
        {
          $group: {
            _id: { match_id: '$match_id', innings: '$innings' },
            runs: { $sum: '$runs_batter' },
            out: { $max: '$striker_out' }
          }
        },
        { $sort: { runs: -1 } },
        { $limit: 1 }
      ]).toArray();

      const highestScore = highestScoreData[0]?.runs || 0;
      const highestScoreOut = highestScoreData[0]?.out;

      // Count fifties and hundreds
      const milestones = await collection.aggregate([
        { $match: { batter: player, valid_ball: 1 } },
        {
          $group: {
            _id: { match_id: '$match_id', innings: '$innings' },
            runs: { $sum: '$runs_batter' }
          }
        },
        {
          $group: {
            _id: null,
            fifties: {
              $sum: { $cond: [{ $and: [{ $gte: ['$runs', 50] }, { $lt: ['$runs', 100] }] }, 1, 0] }
            },
            hundreds: {
              $sum: { $cond: [{ $gte: ['$runs', 100] }, 1, 0] }
            }
          }
        }
      ]).toArray();

      const fifties = milestones[0]?.fifties || 0;
      const hundreds = milestones[0]?.hundreds || 0;

      const strikeRate = ballsFaced > 0 ? ((totalRuns / ballsFaced) * 100).toFixed(2) : 0;
      const average = dismissals > 0 ? (totalRuns / dismissals).toFixed(2) : totalRuns.toFixed(2);
      const boundaryPercentage = ballsFaced > 0 ? (((fours + sixes) / ballsFaced) * 100).toFixed(1) : 0;

      return {
        totalRuns,
        ballsFaced,
        strikeRate: parseFloat(strikeRate),
        average: parseFloat(average),
        fours,
        sixes,
        dismissals,
        matches,
        innings,
        highestScore: highestScoreOut === false ? `${highestScore}*` : highestScore,
        fifties,
        hundreds,
        boundaryPercentage: parseFloat(boundaryPercentage)
      };
    };

    const [batsman1Stats, batsman2Stats] = await Promise.all([
      getBatsmanStats(batsman1),
      getBatsmanStats(batsman2)
    ]);

    if (!batsman1Stats) {
      return res.status(404).json({ error: `No data found for ${batsman1}` });
    }

    if (!batsman2Stats) {
      return res.status(404).json({ error: `No data found for ${batsman2}` });
    }

    res.json({
      batsman1: batsman1Stats,
      batsman2: batsman2Stats
    });
  } catch (error) {
    console.error('Error comparing batsmen:', error);
    res.status(500).json({ error: 'Failed to compare batsmen' });
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
