const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = 'postgresql://postgres:Manipal%400106@db.drkvwlaiwlvegfqrgopk.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Supabase DB');
    
    // Read and run auth schema
    const authSql = fs.readFileSync('database/migrations/002_auth_tables.sql', 'utf8');
    await client.query(authSql);
    console.log('Auth tables created successfully.');
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
