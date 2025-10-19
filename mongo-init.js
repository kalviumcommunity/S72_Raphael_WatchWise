// MongoDB initialization script
db = db.getSiblingDB('watchwise');

// Create a user for the application
db.createUser({
  user: 'watchwise_user',
  pwd: 'watchwise_password',
  roles: [
    {
      role: 'readWrite',
      db: 'watchwise'
    }
  ]
});

// Create collections with some basic indexes
db.createCollection('users');
db.createCollection('userstats');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "name": 1 });

print('✅ MongoDB database initialized successfully');
