// MongoDB initialization script for staging environment
print('Starting MOI staging database initialization...');

// Switch to moi_staging database
db = db.getSiblingDB('moi_staging');

// Create staging user with read/write permissions
db.createUser({
  user: 'staginguser',
  pwd: 'stagingpassword',
  roles: [
    {
      role: 'readWrite',
      db: 'moi_staging'
    }
  ]
});

// Create collections with some initial data for testing
db.users.insertOne({
  _id: ObjectId(),
  email: 'staging@test.com',
  firstName: 'Staging',
  lastName: 'User',
  authProvider: 'local',
  createdAt: new Date(),
  updatedAt: new Date()
});

db.content.insertOne({
  _id: ObjectId(),
  title: 'Welcome to Staging Environment',
  text: 'This is a test content item for the staging environment.',
  platform: 'linkedin',
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MOI staging database initialization completed successfully!');
print('Created collections: users, content');
print('Created staging user with readWrite permissions');