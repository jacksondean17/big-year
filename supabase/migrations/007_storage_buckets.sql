-- Create verification-files bucket for images and videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-files',
  'verification-files',
  true,  -- Public bucket so users can view others' verifications
  52428800,  -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
);

-- Storage policies
CREATE POLICY "Anyone can view verification files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'verification-files');

CREATE POLICY "Authenticated users can upload verification files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own verification files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
