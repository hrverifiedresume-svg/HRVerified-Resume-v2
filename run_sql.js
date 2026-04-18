const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = 'postgresql://postgres:Manipal%400106@db.drkvwlaiwlvegfqrgopk.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Supabase DB');
    
    // Read and run initial schema
    const schemaSql = fs.readFileSync('database/migrations/001_initial_schema.sql', 'utf8');
    await client.query(schemaSql);
    console.log('Schema created successfully.');
    
    // Read and run templates seed
    const seedSql = fs.readFileSync('database/seeds/001_seed_templates.sql', 'utf8');
    await client.query(seedSql);
    console.log('Templates seeded successfully.');
    
    // Verify rows in templates
    const res = await client.query('SELECT COUNT(*) as count FROM templates');
    console.log('Templates row count:', res.rows[0].count);
    
    // Run verification queries
    const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);
    console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
