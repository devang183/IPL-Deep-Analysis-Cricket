# 📥 How to Import IPL.csv to MongoDB

Your CSV file: **IPL.csv** (278,206 rows, 103 MB)
Target: MongoDB Atlas → Database: `hello` → Collection: `IPL-ALL`

---

## ✅ Option 1: MongoDB Compass (EASIEST - Recommended)

### Step 1: Install MongoDB Compass (if not installed)
Download from: https://www.mongodb.com/try/download/compass

### Step 2: Connect to Your Database
1. Open MongoDB Compass
2. Paste your connection string:
   ```
   mongodb+srv://kankariadevang:FRg8Euj7xssSKpob@devangdb.2ckz3bw.mongodb.net/?retryWrites=true&w=majority&appName=devangDB
   ```
3. Click "Connect"

### Step 3: Import CSV
1. Navigate to database: `hello`
2. Click on collection: `IPL-ALL` (or create it)
3. Click **"ADD DATA"** button (top right)
4. Select **"Import JSON or CSV file"**
5. Choose your `IPL.csv` file
6. Configure import settings:
   - **File Type**: CSV
   - **First line contains field names**: ✓ (checked)
   - **Ignore empty strings**: ✓ (optional)
7. Click **"Import"**
8. Wait 2-3 minutes for completion

**Result**: All 278,205 documents will be imported with a progress bar!

---

## ✅ Option 2: Download mongoimport Tool

### For macOS (Manual Download):

1. **Download MongoDB Database Tools**:
   ```bash
   cd ~/Downloads
   curl -O https://fastdl.mongodb.org/tools/db/mongodb-database-tools-macos-arm64-100.9.5.zip
   unzip mongodb-database-tools-macos-arm64-100.9.5.zip
   ```

2. **Move to PATH**:
   ```bash
   sudo cp mongodb-database-tools-macos-arm64-100.9.5/bin/* /usr/local/bin/
   ```

3. **Verify installation**:
   ```bash
   mongoimport --version
   ```

4. **Run import**:
   ```bash
   cd /Users/devangkankaria/Downloads/Cricketing-Prediction
   
   mongoimport \
     --uri="mongodb+srv://kankariadevang:FRg8Euj7xssSKpob@devangdb.2ckz3bw.mongodb.net/?retryWrites=true&w=majority&appName=devangDB" \
     --db="hello" \
     --collection="IPL-ALL" \
     --type=csv \
     --headerline \
     --file="IPL.csv" \
     --drop
   ```

---

## ✅ Option 3: MongoDB Atlas Web Interface

1. Go to: https://cloud.mongodb.com/
2. Log in to your account
3. Navigate to your cluster
4. Click **"Browse Collections"**
5. Select database `hello` → collection `IPL-ALL`
6. Click **"Insert Document"** → **"Import JSON or CSV"**
7. Upload `IPL.csv`

**Note**: Atlas web interface has a 100MB limit, your file is 103MB, so this might not work.

---

## ✅ Option 4: Using Node.js Script (Already have Node)

I can create a Node.js script that uses the mongodb driver you already have installed:

```bash
cd /Users/devangkankaria/Downloads/Cricketing-Prediction
node import-csv-node.js
```

Would you like me to create this script?

---

## 🎯 Recommended Approach

**Use MongoDB Compass** - It's the most reliable, shows progress, and handles large files well.

After import, verify the count:
```javascript
use('hello');
db.getCollection('IPL-ALL').countDocuments()
// Should return: 278205
```

Then refresh your browser at http://localhost:5173 and V Kohli's stats will be complete! 🏏
