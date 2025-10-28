// MongoDB Playground
// Use this file to test your MongoDB connection and explore your IPL data

// Select the database
use('hello');

// Sample query 1: Get a sample document to see the structure
db.getCollection('IPL-ALL').findOne();

// Sample query 2: Count total documents
// db.getCollection('IPL-ALL').countDocuments();

// Sample query 3: Get unique players (batsmen)
// db.getCollection('IPL-ALL').distinct('batter');

// Sample query 4: Get Virat Kohli's total runs
// db.getCollection('IPL-ALL').aggregate([
//   { $match: { batter: 'V Kohli' } },
//   { $group: { _id: null, totalRuns: { $sum: '$batsman_run' } } }
// ]);

// Sample query 5: Get ball-by-ball data for a specific match
// db.getCollection('IPL-ALL').find({ ID: 1 }).limit(10);
