import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Missing DATABASE_URL environment variable. Set DATABASE_URL to your Neon connection string.'
  )
}

export const sql = postgres(connectionString, { ssl: 'require' })
