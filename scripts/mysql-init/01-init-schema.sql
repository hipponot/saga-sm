-- MySQL initialization script
-- This script runs when the MySQL container starts for the first time

-- Create tables for the saga_sm database
USE saga_sm;

-- Users table (example for future use)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'viewer') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Schedule metadata table (complementing MongoDB data)
CREATE TABLE IF NOT EXISTS schedule_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schedule_mongo_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId reference
    category VARCHAR(100),
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_schedule_mongo_id (schedule_mongo_id),
    INDEX idx_category (category),
    INDEX idx_priority (priority)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action ENUM('create', 'update', 'delete') NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample data
INSERT INTO users (email, name, role) VALUES 
    ('admin@saga-sm.com', 'System Admin', 'admin'),
    ('user@saga-sm.com', 'Regular User', 'user'),
    ('viewer@saga-sm.com', 'View Only User', 'viewer');

-- Insert sample schedule metadata
INSERT INTO schedule_metadata (schedule_mongo_id, category, priority, tags) VALUES 
    ('000000000000000000000001', 'meetings', 'high', '["daily", "standup", "team"]'),
    ('000000000000000000000002', 'planning', 'medium', '["sprint", "planning", "development"]');

-- Create a view for easy joining of schedule data
CREATE VIEW schedule_summary AS
SELECT 
    sm.id as metadata_id,
    sm.schedule_mongo_id,
    sm.category,
    sm.priority,
    sm.tags,
    sm.created_at as metadata_created_at
FROM schedule_metadata sm;

-- Grant permissions to saga_user
GRANT SELECT, INSERT, UPDATE, DELETE ON saga_sm.* TO 'saga_user'@'%';
FLUSH PRIVILEGES;

-- Log initialization
INSERT INTO audit_log (entity_type, entity_id, action, new_values) 
VALUES ('system', 'database', 'create', '{"message": "Database initialized successfully"}');

