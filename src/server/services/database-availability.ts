export function databaseIsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
