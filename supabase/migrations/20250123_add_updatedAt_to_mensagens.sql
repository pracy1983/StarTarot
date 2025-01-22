-- Add updatedAt column to mensagens table
ALTER TABLE mensagens
ADD COLUMN updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();
