import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Parse DATABASE_URL manually to handle special characters
const getDbConfig = () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL is not defined in environment');
    }
    
    const url = new URL(dbUrl);
    return {
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.slice(1),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
};

const pool = new Pool(getDbConfig());

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
