require('dotenv').config();
const { MongoClient } = require('mongodb');

async function listUsers() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ MongoDB URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(process.env.DB_NAME || 'hello');
    const usersCollection = db.collection('users');

    const users = await usersCollection
      .find({})
      .project({ password: 0 }) // Exclude password
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('=' .repeat(100));

    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   ID:         ${user._id}`);
        console.log(`   Name:       ${user.name}`);
        console.log(`   Email:      ${user.email}`);
        console.log(`   Created:    ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}`);
        console.log('-'.repeat(100));
      });

      console.log(`\n✨ Total: ${users.length} user(s) registered`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

listUsers();
