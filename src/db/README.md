# Supabase Database Setup for ExaminerPro

This directory contains SQL scripts to set up the necessary tables in Supabase for the ExaminerPro application.

## Tables Overview

1. **settings** - Stores application settings (theme, PDF save location, evaluation rate)
2. **examiners** - Stores information about chief examiners
3. **calculations** - Stores salary calculation records
4. **staff** - Stores staff members assigned to examiners

## Setup Instructions

To set up your Supabase database:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of each SQL file in this directory:
   - `settings_table.sql`
   - `examiners_table.sql`
   - `calculations_table.sql`
   - `staff_table.sql`
5. Run each query to create the tables and security policies

## Row Level Security

Each table has row-level security policies that ensure:
- Users can only access their own data
- Authentication is required for all operations

## Default Settings

The settings table is pre-populated with default values:
- Theme: Light mode
- PDF Save Location: "./downloads"
- Evaluation Rate: 20.0

## Database Schema Migration

If you're migrating from SQLite in the Flutter app to Supabase:

1. Use the backup functionality in the app to create a backup of your data
2. Convert the SQLite database format to Supabase format 
3. Use the restore functionality in the web app to import your data

## Troubleshooting

If you encounter issues with the tables:

1. Check that your Supabase project has the correct permissions
2. Verify that you've executed all the SQL scripts
3. Ensure your application's .env file contains the correct Supabase URL and API keys 