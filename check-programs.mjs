import mysql from 'mysql2/promise';
const url = process.env.DATABASE_URL;
if (!url) { console.log('No DATABASE_URL'); process.exit(1); }
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute('SELECT id, tenantId, name, status FROM cctv_maintenance_programs LIMIT 10');
console.log('Programs:', JSON.stringify(rows, null, 2));
const [logs] = await conn.execute('SELECT COUNT(*) as cnt FROM cctv_maintenance_log');
console.log('Log entries:', JSON.stringify(logs));
const [users] = await conn.execute('SELECT id, openId, tenantId, role FROM users LIMIT 5');
console.log('Users:', JSON.stringify(users, null, 2));
await conn.end();
