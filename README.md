# ExaminerPro Web Application

ExaminerPro is a comprehensive examination management solution designed for educational institutions to manage examiners and examination processes efficiently.

## Features

- Add, edit, and manage examiners
- Upload and manage examiner profile pictures
- Search and filter examiner records
- Dark/Light mode support
- Responsive design for all devices

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Hook Form
- **Backend**: Node.js, Express
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## Running the Application

### Prerequisites

- Node.js and npm

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT
JWT_SECRET=your_jwt_secret_at_least_32_chars_long

# SMTP (for authentication emails)
GOTRUE_SMTP_HOST=your_smtp_host
GOTRUE_SMTP_PORT=your_smtp_port
GOTRUE_SMTP_USER=your_smtp_username
GOTRUE_SMTP_PASS=your_smtp_password
GOTRUE_SMTP_ADMIN_EMAIL=your_admin_email
```

### Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Access the application at http://localhost:3000

## Development

### Project Structure

```
├── public/                 # Static assets
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── contexts/           # React context providers
│   ├── lib/                # Utility libraries
│   ├── pages/              # Page components
│   ├── services/           # API service functions
│   └── types/              # TypeScript type definitions
├── server/                 # Backend source code
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── uploads/            # Temporary file uploads
│   └── server.js           # Express server entry point
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database migrations
│   └── seed.sql            # Seed data for development
├── .env                    # Environment variables
└── README.md               # Project documentation
```

## API Documentation

### Examiner Endpoints

- `GET /api/examiners` - Get all examiners
- `GET /api/examiners/:id` - Get examiner by ID
- `POST /api/examiners` - Create a new examiner
- `PUT /api/examiners/:id` - Update an examiner
- `DELETE /api/examiners/:id` - Delete an examiner
- `POST /api/examiners/:id/profile-picture` - Upload profile picture

## License

This project is proprietary software. All rights reserved.

## Contact

For support or inquiries, please contact the project maintainer.
