import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

function getSql() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'Missing DATABASE_URL environment variable. Set DATABASE_URL to your Neon connection string.'
      )
    }
    _sql = postgres(connectionString, { ssl: 'require' })
  }
  return _sql
}

export function sql<T extends Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T> {
  return getSql()(strings, ...values)
}
