import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

function getSql() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'Missing DATABASE_URL environment variable. Set it to the local PostgreSQL connection string.'
      )
    }
    _sql = postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === 'true' ? 'require' : false,
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
