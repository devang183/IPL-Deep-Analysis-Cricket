# 🗄️ MongoDB Setup Guide

## Current Status

The application is running but needs MongoDB connection configuration.

**Error**: `ECONNREFUSED ::1:27017` - MongoDB is not running or connection string is incorrect.

## Setup Options

### Option 1: Local MongoDB (Recommended for Development)

#### Step 1: Check if MongoDB is installed
```bash
mongosh --version
```

If not installed, install MongoDB:
```bash
# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

#### Step 2: Verify MongoDB is running
```bash
mongosh
```

You should see a connection to `mongodb://127.0.0.1:27017`.

#### Step 3: Verify your database and collection
```javascript
// In mongosh
use hello
db.getCollection('IPL-ALL').countDocuments()
db.getCollection('IPL-ALL').findOne()
```

#### Step 4: Update .env file
The `.env` file should already be configured for local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=hello
COLLECTION_NAME=IPL-ALL
PORT=3001
```

### Option 2: MongoDB Atlas (Cloud)

If your MongoDB is hosted on Atlas:

1. Get your connection string from MongoDB Atlas dashboard
2. Update `.env` file:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=hello
COLLECTION_NAME=IPL-ALL
PORT=3001
```

### Option 3: Custom MongoDB Connection

If MongoDB is running on a different port or host:

```
MONGODB_URI=mongodb://<host>:<port>
DB_NAME=hello
COLLECTION_NAME=IPL-ALL
PORT=3001
```

## Verifying Your Data Structure

Your collection should have documents like this:

```javascript
{
  "_id": ObjectId("..."),
  "ID": 1,                      // Match ID
  "innings": 1,                 // Innings number
  "overs": 0,                   // Over number
  "ballnumber": 1,              // Ball number in innings
  "batter": "SC Ganguly",       // Batsman name
  "bowler": "P Kumar",          // Bowler name
  "batsman_run": 0,             // Runs scored
  "extras_run": 1,              // Extra runs
  "total_run": 1,               // Total runs
  "isWicketDelivery": 0,        // 1 if wicket, 0 otherwise
  "kind": "",                   // Dismissal type
  "fielders_involved": "",      // Fielders
  "BattingTeam": "Kolkata Knight Riders"
}
```

## Testing the Connection

Once MongoDB is configured and running:

1. **Restart the application**:
   ```bash
   # Stop current process (Ctrl+C)
   npm run dev
   ```

2. **Check the terminal output**:
   You should see:
   ```
   ✅ Connected to MongoDB
   📊 Collection has XXXXX documents
   🚀 Server running on http://localhost:3001
   ```

3. **Test the API**:
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/players
   ```

## Common Issues

### Issue 1: MongoDB not running
**Error**: `ECONNREFUSED`

**Solution**:
```bash
# Start MongoDB
brew services start mongodb-community

# Or manually
mongod --config /usr/local/etc/mongod.conf
```

### Issue 2: Wrong database/collection name
**Error**: Collection has 0 documents

**Solution**:
- Verify database name: `show dbs` in mongosh
- Verify collection name: `use hello` then `show collections`
- Update `.env` with correct names

### Issue 3: Authentication required
**Error**: Authentication failed

**Solution**:
Update MONGODB_URI with credentials:
```
MONGODB_URI=mongodb://username:password@localhost:27017
```

### Issue 4: Collection field names don't match
**Error**: No data showing in app

**Solution**:
Check your actual field names:
```javascript
// In mongosh
use hello
db.getCollection('IPL-ALL').findOne()
```

If field names are different, update the server code in `server/index.js` to match your schema.

## Next Steps

1. ✅ Configure MongoDB connection in `.env`
2. ✅ Start/verify MongoDB is running
3. ✅ Restart the application: `npm run dev`
4. ✅ Open http://localhost:5173 in your browser
5. ✅ Select a player and start analyzing!

## Need Help?

Check the logs in your terminal for specific error messages. The application provides detailed error information to help troubleshoot connection issues.
