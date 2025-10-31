require('dotenv').config();
const { MongoClient } = require('mongodb');

async function makeAdmin() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
  }

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

    // Find the user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    // Update user to admin
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase() },
      { $set: { isAdmin: true, role: 'admin' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ User "${user.name}" (${email}) has been granted admin privileges!`);
      console.log(`\n📋 Updated user details:`);
      console.log(`   Name:    ${user.name}`);
      console.log(`   Email:   ${email}`);
      console.log(`   Role:    Admin`);
      console.log(`   isAdmin: true`);
    } else {
      console.log(`ℹ️  User "${user.name}" already has admin privileges`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

makeAdmin();
