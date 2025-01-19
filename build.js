const { build } = require('next/dist/build');
const path = require('path');

async function main() {
  await build(path.join(__dirname), {
    config: {
      output: 'export',
      distDir: 'out',
      images: {
        unoptimized: true,
      },
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  });
}

main().catch(console.error);
