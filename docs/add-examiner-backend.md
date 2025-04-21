# Add Examiner Backend Implementation Guide

This document explains the backend implementation for the Add Examiner feature in ExaminerPro.

## Overview

The Add Examiner feature allows administrators to create new examiner profiles in the system, including personal information and profile pictures.

## Architecture

The backend implementation follows a clean architecture approach with the following components:

1. **API Routes**: REST endpoints for examiner-related operations
2. **Models**: Data models for validation and transformation
3. **Database**: Supabase PostgreSQL for data storage
4. **Storage**: Supabase Storage for profile pictures

## Database Schema

The examiners table is defined in `supabase/migrations/01_create_examiners_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS examiners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  examiner_id TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  profile_picture TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### 1. Create Examiner

**Endpoint**: `POST /api/examiners`

**Request Body**:
```json
{
  "full_name": "Dr. John Smith",
  "examiner_id": "EX123",
  "department": "Computer Science",
  "position": "Chief Examiner",
  "email": "john.smith@example.com",
  "phone": "1234567890"
}
```

**Response**:
```json
{
  "id": "uuid-value",
  "full_name": "Dr. John Smith",
  "examiner_id": "EX123",
  "department": "Computer Science",
  "position": "Chief Examiner",
  "email": "john.smith@example.com",
  "phone": "1234567890",
  "profile_picture": null,
  "status": "active",
  "created_at": "2023-04-06T10:00:00Z",
  "updated_at": "2023-04-06T10:00:00Z"
}
```

### 2. Upload Profile Picture

**Endpoint**: `POST /api/examiners/:id/profile-picture`

**Request**:
- `Content-Type: multipart/form-data`
- Form field: `profile_picture` (image file)

**Response**:
```json
{
  "message": "Profile picture uploaded successfully",
  "data": {
    "id": "uuid-value",
    "full_name": "Dr. John Smith",
    "examiner_id": "EX123",
    "profile_picture": "https://storage-url/profile_pictures/EX123_timestamp.jpg",
    "...": "..."
  }
}
```

## Implementation Details

### Validation

The Examiner model (`server/models/Examiner.js`) handles validation:

- Required fields: full_name, examiner_id, department, position, email, phone
- Email format validation using regex
- Phone number format validation (10 digits)

### File Upload

Profile picture upload is handled by:

1. **Multer**: Middleware for handling `multipart/form-data`
2. **Validation**: Size limit (2MB) and file type checks (JPEG, PNG)
3. **Storage**: Uploaded to Supabase Storage bucket `profile_pictures`
4. **Database Update**: Profile picture URL saved to examiner record

## Security Considerations

1. **Row Level Security**: Supabase RLS policies restrict access to authenticated users
2. **Input Validation**: All inputs are validated to prevent injection attacks
3. **File Validation**: File uploads are checked for size and type

## Docker Setup

The backend is containerized using Docker:

1. **Node.js Container**: Runs the Express server
2. **Supabase Components**: Includes PostgreSQL, Storage, Auth, and REST API
3. **Volume Mounts**: For persistence of data and code changes in development

## Testing

Manual testing procedure:
1. Start the development containers: `./examinerpro-docker.bat start-dev`
2. Create a new examiner using the form
3. Verify the examiner record in the database: `./examinerpro-docker.bat psql` then `SELECT * FROM examiners;`
4. Test profile picture upload and verify the URL is saved correctly

## Troubleshooting

Common issues:

1. **Database connection errors**: Check the database service is running
2. **File upload errors**: Check storage bucket permissions
3. **Validation errors**: Check the request format matches the expected schema

## References

- [Supabase Documentation](https://supabase.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Docker Documentation](https://docs.docker.com/) 