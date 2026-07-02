const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = (match[2] || '').replace(/^"|"$/g, '');
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'];

const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
};

async function fixBucket() {
    try {
        console.log('Fetching buckets...');
        const res = await fetch(`${url}/storage/v1/bucket`, { headers });
        const buckets = await res.json();
        
        const avatarsBucket = buckets.find(b => b.name === 'avatars');
        
        if (!avatarsBucket) {
            console.log('Bucket "avatars" does not exist. Creating...');
            const createRes = await fetch(`${url}/storage/v1/bucket`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: 'avatars',
                    name: 'avatars',
                    public: true,
                    allowed_mime_types: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
                    file_size_limit: 5242880
                })
            });
            const createData = await createRes.json();
            console.log('Create result:', createData);
        } else {
            console.log('Bucket "avatars" exists. Updating to public...');
            const updateRes = await fetch(`${url}/storage/v1/bucket/avatars`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    public: true,
                    allowed_mime_types: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
                    file_size_limit: 5242880
                })
            });
            const updateData = await updateRes.json();
            console.log('Update result:', updateData);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

fixBucket();
