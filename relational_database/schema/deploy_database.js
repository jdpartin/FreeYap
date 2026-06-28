const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const repoRoot = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getArgValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const databaseUrl =
  getArgValue('--database-url') ||
  process.env.RENDER_DATABASE_URL ||
  process.env.DATABASE_URL;

const skipIndexes = hasFlag('--skip-indexes');

function maskUrl(url) {
  return url.replace(/:\/\/.*:.*@/, '://***:***@');
}

function readSql(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

async function runSql(client, description, sql) {
  process.stdout.write(`${description}... `);
  await client.query(sql);
  console.log('ok');
}

async function runSqlFile(client, description, relativePath) {
  await runSql(client, description, readSql(relativePath));
}

async function main() {
  if (!databaseUrl) {
    console.error('No database URL found. Set RENDER_DATABASE_URL in .env, set DATABASE_URL, or pass --database-url.');
    process.exit(1);
  }

  console.log('FreeYap Database Deployment');
  console.log('===========================');
  console.log(`Database: ${maskUrl(databaseUrl)}`);
  console.log('');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await runSql(client, 'Connection test', 'SELECT 1 AS test;');
    await runSqlFile(client, 'Schema', 'relational_database/schema/create_schema.sql');
    await runSqlFile(client, 'UserQueueInfo type', 'relational_database/types/user_queue_info.sql');

    const functions = [
      ['get_and_delete_queue_entry', 'relational_database/functions/get_and_delete_queue_entry.sql'],
      ['get_bulk_topic_embeddings', 'relational_database/functions/get_bulk_topic_embeddings.sql'],
      ['get_oldest_delayed_term_user', 'relational_database/functions/get_oldest_delayed_term_user.sql'],
      ['get_oldest_random_topic_user', 'relational_database/functions/get_oldest_random_topic_user.sql'],
      ['get_oldest_topic_user', 'relational_database/functions/get_oldest_topic_user.sql'],
      ['get_popular_topics', 'relational_database/functions/get_popular_topics.sql'],
      ['get_queued_user_with_most_matches', 'relational_database/functions/get_queued_user_with_most_matches.sql'],
      ['get_topic_embedding', 'relational_database/functions/get_topic_embedding.sql'],
      ['get_topic_popularity', 'relational_database/functions/get_topic_popularity.sql'],
      ['get_user_topics', 'relational_database/functions/get_user_topics.sql'],
      ['get_vibe_checks', 'relational_database/functions/get_vibe_checks.sql'],
      ['is_user_vibe_checked', 'relational_database/functions/is_user_vibe_checked.sql'],
    ];

    for (const [name, file] of functions) {
      await runSqlFile(client, `Function ${name}`, file);
    }

    const procedures = [
      ['add_back_to_queue', 'relational_database/stored_procedures/add_back_to_queue.sql'],
      ['add_to_queue', 'relational_database/stored_procedures/add_to_queue.sql'],
      ['bulk_insert_topic_history', 'relational_database/stored_procedures/bulk_insert_topic_history.sql'],
      ['insert_matchmaking_blocking_entry', 'relational_database/stored_procedures/insert_matchmaking_blocking_entry.sql'],
      ['insert_vibe_check', 'relational_database/stored_procedures/insert_vibe_check.sql'],
      ['remove_from_queue', 'relational_database/stored_procedures/remove_from_queue.sql'],
      ['save_topic_embedding', 'relational_database/stored_procedures/save_topic_embedding.sql'],
    ];

    for (const [name, file] of procedures) {
      await runSqlFile(client, `Procedure ${name}`, file);
    }

    if (!skipIndexes) {
      const indexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_mode_topics_time ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_socket_id ON matchmaking_queue (socket_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_covering ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) INCLUDE (socket_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_socket_id ON queue_topics (socket_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_topic ON queue_topics (topic);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_socket_topic ON queue_topics (socket_id, topic);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_time_topic ON topic_history (used_at DESC, topic);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_popularity_covering ON topic_history (used_at DESC) INCLUDE (topic);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_topic_time ON topic_history (topic, used_at DESC);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_with_topics ON matchmaking_queue (chat_mode, inserted_at ASC) WHERE has_topics = TRUE;',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_without_topics ON matchmaking_queue (chat_mode, inserted_at ASC) WHERE has_topics = FALSE;',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_bidirectional ON matchmaking_blocking (source_ip, blocked_ip, expires);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_reverse ON matchmaking_blocking (blocked_ip, source_ip, expires);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_existence ON matchmaking_blocking (source_ip, blocked_ip) INCLUDE (expires);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_expires ON matchmaking_blocking (expires);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_time_analysis ON vibe_checks (hashed_ip, verified, inserted_at DESC, nudity, gore);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_source_tracking ON vibe_checks (hashed_ip, verified, source_ip) WHERE verified = FALSE;',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_verified_recent ON vibe_checks (hashed_ip, nudity, gore, inserted_at DESC) WHERE verified = TRUE;',
      ];

      for (const [index, sql] of indexes.entries()) {
        await runSql(client, `Index ${index + 1}/${indexes.length}`, sql);
      }
    } else {
      console.log('Indexes skipped.');
    }

    const verification = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'get_popular_topics',
          'get_topic_popularity',
          'get_bulk_topic_embeddings',
          'is_user_vibe_checked',
          'insert_vibe_check',
          'insert_matchmaking_blocking_entry'
        )
      ORDER BY routine_type, routine_name;
    `);

    console.log('');
    console.log('Verified routines:');
    for (const row of verification.rows) {
      console.log(`- ${row.routine_type.toLowerCase()} ${row.routine_name}`);
    }

    console.log('');
    console.log('Your FreeYap database is ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('');
  console.error('Database deployment failed:');
  console.error(error);
  process.exit(1);
});
