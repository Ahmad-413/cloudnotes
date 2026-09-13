const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

let cachedDatabaseUrl = null;

/**
 * Resolves the database connection string.
 *
 * In production, set USE_SECRETS_MANAGER=true and SECRETS_MANAGER_SECRET_NAME
 * to the name of a secret in AWS Secrets Manager containing either:
 *   - a JSON blob with a "DATABASE_URL" key, or
 *   - the raw connection string as the secret value.
 *
 * The app authenticates to Secrets Manager via its IAM Instance Profile /
 * Task Role — no access keys are ever stored in code or env vars.
 *
 * Falls back to the DATABASE_URL environment variable for local development.
 */
async function getDatabaseUrl() {
  if (cachedDatabaseUrl) return cachedDatabaseUrl;

  const useSecretsManager = process.env.USE_SECRETS_MANAGER === 'true';

  if (!useSecretsManager) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set and USE_SECRETS_MANAGER is false');
    }
    cachedDatabaseUrl = process.env.DATABASE_URL;
    return cachedDatabaseUrl;
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const command = new GetSecretValueCommand({
    SecretId: process.env.SECRETS_MANAGER_SECRET_NAME,
  });

  const response = await client.send(command);
  const raw = response.SecretString;

  try {
    const parsed = JSON.parse(raw);
    cachedDatabaseUrl = parsed.DATABASE_URL || parsed.database_url;
    if (!cachedDatabaseUrl) {
      throw new Error('Secret JSON did not contain a DATABASE_URL field');
    }
  } catch {
    // Secret was stored as a plain connection string, not JSON.
    cachedDatabaseUrl = raw;
  }

  console.log('[secrets] Loaded DATABASE_URL from Secrets Manager');
  return cachedDatabaseUrl;
}

module.exports = { getDatabaseUrl };
