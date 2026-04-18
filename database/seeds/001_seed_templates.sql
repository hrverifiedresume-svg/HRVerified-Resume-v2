-- Seed initial professional templates

-- Professional Classic Template
INSERT INTO templates (
    id,
    name,
    description,
    category,
    preview_image_url,
    layout_json,
    styling_json,
    is_active,
    is_community,
    created_at
) VALUES (
    uuid_generate_v4(),
    'Professional Classic',
    'Clean, ATS-friendly professional resume template perfect for all career stages',
    'professional',
    '/templates/professional-classic-preview.png',
    '{
        "sections": ["header", "personal_info", "education", "experience", "skills", "projects", "certifications"],
        "layout": "single-column",
        "colors": ["#1F2937", "#2563EB"]
    }'::jsonb,
    '{
        "primaryColor": "#1F2937",
        "accentColor": "#2563EB",
        "font": "Calibri",
        "fontSize": 11,
        "margins": "1 inch"
    }'::jsonb,
    TRUE,
    FALSE,
    NOW()
);

-- Additional templates will be added in Phase 3
