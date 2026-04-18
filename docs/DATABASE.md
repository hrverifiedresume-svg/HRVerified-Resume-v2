# Database Schema Documentation - HRVerified Resume v2

## Overview
PostgreSQL database hosted on Supabase with complete schema for resume management, job matching, and talent acquisition.

## Database Structure

### Core Tables
- **users** - Main user table with authentication and profile data
- **auth_methods** - Multiple authentication methods per user
- **user_profiles** - Extended profile information
- **user_skills** - Skills possessed by users

### Resume Management
- **resumes** - Resume documents
- **resume_sections** - Individual sections within resumes
- **resume_downloads** - Download history and tracking
- **resume_versions** - Version control for resumes

### Templates
- **templates** - Resume templates (professional, community-created)
- **template_usage** - Track template usage statistics

### Job Matching & Skills
- **job_descriptions** - Job postings/descriptions from various sources
- **skill_gaps** - Analysis of missing skills for specific jobs
- **skill_recommendations** - AI-generated skill recommendations

### Interview Prep
- **interview_questions** - AI-generated interview questions
- **interview_answers** - User answers and AI feedback
- **interview_sessions** - Interview practice sessions

### Organizations & B2B
- **organizations** - Universities and companies
- **organization_users** - User membership in organizations
- **job_postings** - Job openings by organizations
- **internship_programs** - Internship opportunities
- **job_applications** - User applications to jobs

### Community
- **alumni_clubs** - Clubs within organizations
- **club_members** - Club membership
- **club_messages** - Messages within clubs
- **user_connections** - User connections for networking

### Analytics
- **user_analytics** - Track all user actions
- **organization_analytics** - Organization metrics
- **daily_active_users** - Daily aggregated stats

### Support
- **feature_requests** - User feature requests
- **feature_request_votes** - Voting on features
- **support_tickets** - Support tickets and issues

## Key Relationships

### User to Resume
- One user can have multiple resumes
- Each resume belongs to one user
- Resumes contain multiple sections

### Resume to Jobs
- One resume can be matched against multiple job descriptions
- Each match generates a skill_gap record
- Skill gaps generate recommendations and interview questions

### Organizations
- Users can belong to multiple organizations
- Each organization can have multiple job postings
- Alumni clubs exist within organizations

## Security

### Row Level Security (RLS)
- Users can only view their own data
- Public resumes are visible to everyone
- Organization data is filtered by membership

### Authentication
- JWT-based authentication
- Multiple auth methods supported per user
- OAuth integration with Gmail and LinkedIn

## Performance Optimizations

### Indexes
- User email lookup (frequently used for login)
- Foreign key lookups
- Status filters (resume status, job posting status, etc.)
- Date-based queries (analytics)

### Views
- user_resume_summary - Quick user resume stats
- user_skill_gaps_summary - Skill gap analytics
- organization_stats - Organization metrics

## Data Types

- **UUID** - Primary keys (uuid-ossp extension)
- **JSONB** - Flexible data storage (resume content, analytics metadata)
- **TEXT[]** - Arrays for skill lists, requirements
- **DECIMAL** - Precise numerical values (percentages, salaries)
- **TIMESTAMP WITH TIME ZONE** - All timestamps include timezone

## Backup & Disaster Recovery

- Supabase handles automatic daily backups
- Point-in-time recovery available
- Test backup restoration monthly

## Migration Strategy

- Use numbered migration files (001_initial_schema.sql)
- Each migration is cumulative
- Tested locally before production deployment
- Rollback procedures documented

## Future Enhancements
- Full-text search on resumes and job descriptions
- Partition tables for analytics (by date)
- Read replicas for scaling
- Archive tables for historical data