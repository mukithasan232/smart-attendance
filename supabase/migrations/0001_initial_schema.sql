-- Enable vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist to apply clean migration
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS persons CASCADE;

-- Create persons table (Matching SQLAlchemy Models)
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    face_embedding vector(512) NOT NULL,
    snapshot_path VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    camera_id VARCHAR DEFAULT 'cam-01' NOT NULL,
    tenant_id VARCHAR DEFAULT 'default' NOT NULL
);

-- Create events table (Matching SQLAlchemy Models)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    snapshot_path VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'Unknown' NOT NULL,
    telegram_msg_id INTEGER,
    buffer_status VARCHAR DEFAULT 'pending' NOT NULL,
    face_embedding vector(512),
    camera_id VARCHAR DEFAULT 'cam-01' NOT NULL,
    tenant_id VARCHAR DEFAULT 'default' NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read/write
CREATE POLICY "Allow authenticated read/write on persons" ON persons
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on events" ON events
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
