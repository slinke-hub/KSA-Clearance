/**
 * Prisma Database Connection Configuration
 * Configured for Supabase PostgreSQL with Supavisor Connection Pooler
 */

export const prismaConfig = {
  // Supavisor connection pooler for high-throughput runtime queries (port 6543)
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Direct PostgreSQL connection for migrations and DDL execution (port 5432)
  directUrl: process.env.DIRECT_URL || '',

  // Environment validation
  isValid(): boolean {
    return Boolean(this.databaseUrl && this.directUrl);
  }
};

export default prismaConfig;
