import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Simple security check using the DB password as secret
    if (secret !== 'wj8qimxarx7jd91yvwxd') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        console.log('Installing pg dynamically...');
        await execAsync('npm install pg');
        
        // Dynamically require pg after installation
        const { Client } = require('pg');
        
        console.log('Connecting to database...');
        const client = new Client({
            connectionString: 'postgresql://postgres:wj8qimxarx7jd91yvwxd@startarot-db:5432/startarot'
        });
        await client.connect();
        
        console.log('Modifying foreign key constraint...');
        await client.query(`
            ALTER TABLE public.transactions 
            DROP CONSTRAINT IF EXISTS transactions_user_id_fkey, 
            ADD CONSTRAINT transactions_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES public.profiles(id) 
            ON DELETE CASCADE;
        `);
        
        await client.end();
        console.log('Success!');
        
        return NextResponse.json({ 
            success: true, 
            message: 'Constraint transactions_user_id_fkey updated to ON DELETE CASCADE.' 
        });
    } catch (err: any) {
        console.error('Error executing query:', err);
        return NextResponse.json({ 
            success: false, 
            error: err.message 
        }, { status: 500 });
    }
}
