// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the saga_sm database
db = db.getSiblingDB('saga_sm');

// Create a user for the application
db.createUser({
    user: 'saga_user',
    pwd: 'password123',
    roles: [
        {
            role: 'readWrite',
            db: 'saga_sm'
        }
    ]
});

// Create initial collections with sample data
db.schedules.insertMany([
    {
        _id: ObjectId(),
        name: "Morning Standup",
        description: "Daily team standup meeting",
        startTime: new Date("2024-01-01T09:00:00Z"),
        endTime: new Date("2024-01-01T09:30:00Z"),
        recurring: true,
        frequency: "daily",
        participants: ["team@example.com"],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: ObjectId(),
        name: "Sprint Planning",
        description: "Bi-weekly sprint planning session",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        recurring: true,
        frequency: "biweekly",
        participants: ["dev-team@example.com", "product@example.com"],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

// Create indexes for better performance
db.schedules.createIndex({ "startTime": 1 });
db.schedules.createIndex({ "status": 1 });
db.schedules.createIndex({ "participants": 1 });

print("MongoDB initialization completed successfully");

