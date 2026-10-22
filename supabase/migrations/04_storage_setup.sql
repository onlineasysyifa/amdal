-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- Migration 04: Storage Bucket Setup & Security Policies
-- ==============================================================================

-- Create Private Storage Bucket for Clinic Operational Documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clinic-documents',
    'clinic-documents',
    false, -- STRICTLY PRIVATE BUCKET
    10485760, -- Max 10MB per file
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760;

-- Storage RLS Policies: Only Authenticated Users have access
-- 1. View / Download files
CREATE POLICY "Authenticated users can read clinic documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clinic-documents');

-- 2. Upload files
CREATE POLICY "Authenticated users can upload clinic documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'clinic-documents' AND
    auth.role() = 'authenticated'
);

-- 3. Update files
CREATE POLICY "Authenticated users can update clinic documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic-documents');

-- 4. Delete files
CREATE POLICY "Authenticated users can delete clinic documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic-documents');
