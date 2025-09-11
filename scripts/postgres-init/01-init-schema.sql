-- PostgreSQL initialization script
-- This script runs when the PostgreSQL container starts for the first time

-- Create tables for the saga_sm database

-- Users table (example for future use)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Schedule metadata table (complementing MongoDB data)
CREATE TABLE IF NOT EXISTS schedule_metadata (
    id SERIAL PRIMARY KEY,
    schedule_mongo_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId reference
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    tags JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_mongo_id ON schedule_metadata (schedule_mongo_id);
CREATE INDEX IF NOT EXISTS idx_category ON schedule_metadata (category);
CREATE INDEX IF NOT EXISTS idx_priority ON schedule_metadata (priority);

CREATE TRIGGER update_schedule_metadata_updated_at BEFORE UPDATE ON schedule_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log (timestamp);

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
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO saga_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO saga_user;

-- Log initialization
INSERT INTO audit_log (entity_type, entity_id, action, new_values) 
VALUES ('system', 'database', 'create', '{"message": "Database initialized successfully"}');
