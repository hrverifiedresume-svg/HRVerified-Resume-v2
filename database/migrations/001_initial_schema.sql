-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS & B2B TABLES (Moved up to satisfy foreign key in users)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('university', 'company')),
    org_id_unique VARCHAR(255) UNIQUE,
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    website_url VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(255),
    country VARCHAR(100),
    industry VARCHAR(255),
    size VARCHAR(50),
    established_year INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_type ON organizations(type);

-- 2. AUTHENTICATION & USER MANAGEMENT TABLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    phone VARCHAR(20),
    headline VARCHAR(255),
    bio TEXT,
    quote VARCHAR(500),
    university_id UUID REFERENCES organizations(id),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE auth_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL CHECK (method IN ('gmail', 'magic_link', 'otp', 'linkedin')),
    oauth_id VARCHAR(255),
    oauth_email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, method)
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    banner_image_url TEXT,
    location VARCHAR(255),
    website_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    bio_full TEXT,
    preferences_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    endorsements_count INTEGER DEFAULT 0,
    years_of_experience DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_auth_methods_user_id ON auth_methods(user_id);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

-- Rest of ORGANIZATIONS & B2B TABLES
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'recruiter', 'member', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    posted_by_user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    batch_year VARCHAR(4),
    department VARCHAR(255),
    job_type VARCHAR(100) CHECK (job_type IN ('full-time', 'part-time', 'internship', 'contract')),
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    location VARCHAR(255),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP WITH TIME ZONE,
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE internship_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    duration_weeks INTEGER,
    stipend DECIMAL(12,2),
    spots_available INTEGER,
    applications_received INTEGER DEFAULT 0,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_org_users_user_id ON organization_users(user_id);
CREATE INDEX idx_org_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_job_postings_org_id ON job_postings(organization_id);
CREATE INDEX idx_internship_org_id ON internship_programs(organization_id);

-- 3. TEMPLATE MANAGEMENT TABLES (Moved up since resumes references it)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) DEFAULT 'professional',
    preview_image_url TEXT,
    template_html TEXT,
    template_css TEXT,
    layout_json JSONB DEFAULT '{}',
    styling_json JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_community BOOLEAN DEFAULT FALSE,
    creator_user_id UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_is_active ON templates(is_active);
CREATE INDEX idx_templates_category ON templates(category);

-- 4. RESUME MANAGEMENT TABLES
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES templates(id),
    content_json JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
    is_primary BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(50) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'shared')),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE resume_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section_type VARCHAR(100) NOT NULL CHECK (section_type IN (
        'header', 'personal_info', 'education', 'experience', 'internship', 
        'skills', 'projects', 'certifications', 'achievements', 'languages', 'publications'
    )),
    data_json JSONB NOT NULL DEFAULT '{}',
    section_order INTEGER,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resume_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    format VARCHAR(50) NOT NULL CHECK (format IN ('pdf', 'docs')),
    file_url TEXT,
    file_size_bytes INTEGER,
    downloaded_by_user_id UUID REFERENCES users(id),
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    UNIQUE(resume_id, version_number)
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resume_sections_resume_id ON resume_sections(resume_id);
CREATE INDEX idx_resume_downloads_resume_id ON resume_downloads(resume_id);

CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);

-- Rest of Job Applications (depends on resumes)
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id),
    cover_letter TEXT,
    application_status VARCHAR(50) DEFAULT 'pending' CHECK (application_status IN (
        'pending', 'under_review', 'shortlisted', 'rejected', 'offered', 'accepted'
    )),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(job_posting_id, user_id)
);

CREATE INDEX idx_job_apps_user_id ON job_applications(user_id);

-- 5. JOB MATCHING & SKILL ANALYSIS TABLES
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    description TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'linkedin', 'indeed', 'other')),
    source_url TEXT,
    job_board_id VARCHAR(255),
    salary_range VARCHAR(255),
    location VARCHAR(255),
    job_type VARCHAR(100) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'intern')),
    posted_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_gaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    required_skills TEXT[] DEFAULT '{}',
    present_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    match_percentage DECIMAL(5,2),
    proficiency_gaps JSONB DEFAULT '{}',
    analysis_json JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_gap_id UUID REFERENCES skill_gaps(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    priority VARCHAR(50) CHECK (priority IN ('high', 'medium', 'low')),
    learning_resources JSONB DEFAULT '{}',
    estimated_hours INTEGER,
    suggested_courses JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX idx_skill_gaps_resume_id ON skill_gaps(resume_id);
CREATE INDEX idx_skill_gaps_job_id ON skill_gaps(job_description_id);

-- 6. INTERVIEW PREPARATION TABLES
CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    category VARCHAR(100) CHECK (category IN (
        'technical', 'behavioral', 'situational', 'domain_specific', 'general'
    )),
    difficulty VARCHAR(50) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    ai_generated BOOLEAN DEFAULT TRUE,
    source_job_id UUID REFERENCES job_descriptions(id),
    keywords_extracted TEXT[] DEFAULT '{}',
    sample_answer TEXT,
    answer_tips JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_answer TEXT,
    ai_guidance TEXT,
    feedback_json JSONB DEFAULT '{}',
    rating DECIMAL(3,2),
    improvement_suggestions TEXT,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id),
    job_description_id UUID REFERENCES job_descriptions(id),
    total_questions INTEGER,
    questions_answered INTEGER DEFAULT 0,
    total_rating DECIMAL(3,2),
    session_notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER
);

CREATE INDEX idx_interview_questions_resume_id ON interview_questions(resume_id);
CREATE INDEX idx_interview_answers_question_id ON interview_answers(question_id);
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);

-- 7. COMMUNITY & NETWORKING TABLES
CREATE TABLE alumni_clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    UNIQUE(organization_id, name)
);

CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES alumni_clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, user_id)
);

CREATE TABLE club_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES alumni_clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document')),
    attachments_json JSONB DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'networking' CHECK (connection_type IN (
        'networking', 'mentoring', 'mentee', 'colleague'
    )),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    connected_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id_1, user_id_2),
    CHECK (user_id_1 < user_id_2)
);

CREATE INDEX idx_alumni_clubs_org_id ON alumni_clubs(organization_id);
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
CREATE INDEX idx_club_messages_club_id ON club_messages(club_id);
CREATE INDEX idx_user_connections_user_1 ON user_connections(user_id_1);
CREATE INDEX idx_user_connections_user_2 ON user_connections(user_id_2);

-- 8. ANALYTICS & TRACKING TABLES
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL CHECK (action IN (
        'view', 'create', 'edit', 'delete', 'download', 'share', 'search', 'click'
    )),
    metadata_json JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organization_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(12,2),
    metric_type VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_active_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE,
    active_user_count INTEGER,
    new_user_count INTEGER,
    resume_created_count INTEGER,
    downloads_count INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_created_at ON user_analytics(created_at);
CREATE INDEX idx_org_analytics_org_id ON organization_analytics(organization_id);

-- 9. FEATURE REQUESTS & SUPPORT TABLES
CREATE TABLE feature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    votes_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'approved', 'rejected', 'in_progress', 'completed'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feature_request_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, user_id)
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- TASK 2: Create Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id OR is_verified = TRUE);

CREATE POLICY "Users can edit their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own resumes" ON resumes
    FOR SELECT USING (
        auth.uid() = user_id OR 
        visibility = 'public' OR
        (visibility = 'shared' AND auth.uid() IN (
            SELECT user_id FROM user_connections WHERE user_id_2 = resumes.user_id
        ))
    );

CREATE POLICY "Users can edit their own resumes" ON resumes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Resume sections inherit resume visibility" ON resume_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resumes 
            WHERE resumes.id = resume_sections.resume_id 
            AND (resumes.user_id = auth.uid() OR resumes.visibility = 'public')
        )
    );

-- TASK 3: Create Useful Database Views
CREATE OR REPLACE VIEW user_resume_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT r.id) as total_resumes,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_resumes,
    SUM(r.view_count) as total_resume_views,
    COUNT(DISTINCT rd.id) as total_downloads,
    MAX(r.updated_at) as last_resume_update
FROM users u
LEFT JOIN resumes r ON u.id = r.user_id
LEFT JOIN resume_downloads rd ON r.id = rd.resume_id
GROUP BY u.id, u.name, u.email;

CREATE OR REPLACE VIEW user_skill_gaps_summary AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(DISTINCT sg.id) as total_job_matches,
    AVG(sg.match_percentage) as average_match_percentage,
    COUNT(DISTINCT CASE WHEN sg.match_percentage >= 80 THEN sg.id END) as high_match_jobs,
    COUNT(DISTINCT CASE WHEN sg.match_percentage >= 60 AND sg.match_percentage < 80 THEN sg.id END) as medium_match_jobs
FROM users u
LEFT JOIN skill_gaps sg ON u.id = (SELECT user_id FROM resumes WHERE resumes.id = sg.resume_id)
GROUP BY u.id, u.name;

CREATE OR REPLACE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    o.type,
    COUNT(DISTINCT ou.user_id) as member_count,
    COUNT(DISTINCT jp.id) as active_job_postings,
    COUNT(DISTINCT ip.id) as active_internships,
    COUNT(DISTINCT ac.id) as alumni_clubs
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id
LEFT JOIN job_postings jp ON o.id = jp.organization_id AND jp.is_active = TRUE
LEFT JOIN internship_programs ip ON o.id = ip.organization_id AND ip.is_active = TRUE
LEFT JOIN alumni_clubs ac ON o.id = ac.organization_id
GROUP BY o.id, o.name, o.type;
