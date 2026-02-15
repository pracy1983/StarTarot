-- Storage Policies for 'avatars' bucket

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow public read access (so anyone can see profile pictures)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3. Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 4. Policy: Allow authenticated users to update their own files (optional, but good for replacements)
-- Note: This is tricky with random filenames, but generally 'authenticated' update is fine if we restrict by folder structure or user_id metadata
-- For simplicity, we stick to INSERT for new files. If we want replacement, we might need more complex logic.
-- However, we can allow update if they created it (owner).
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 5. Policy: Allow users to delete their own files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
