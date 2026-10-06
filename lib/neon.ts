import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

function getSql() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'Missing DATABASE_URL environment variable. Set it to your PostgreSQL connection string.'
      )
    }
    _sql = postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      // TLS on by default so a missing var keeps Neon working. Local Postgres
      // opts out explicitly with DATABASE_SSL=false.
      ssl: process.env.DATABASE_SSL === 'false' ? false : 'require',
    })
  }
  return _sql
}

export function sql<T extends Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  return getSql()(strings, ...values as never[])
}
