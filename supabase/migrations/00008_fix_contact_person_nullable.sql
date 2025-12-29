-- Fix contact_person to allow NULL values
ALTER TABLE customers ALTER COLUMN contact_person DROP NOT NULL;
