import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { agentError, agentLog } from './logger'

let cached: { saver: PostgresSaver; setupPromise: Promise<void> } | null = null

function resolveConnectionString(): string {
  const conn =
    process.env.AGENT_CHECKPOINT_DATABASE_URI ||
    process.env.DATABASE_URI ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_URL
  if (!conn) {
    throw new Error(
      'No Postgres connection string for the agent checkpointer. ' +
        'Set DATABASE_URI (or AGENT_CHECKPOINT_DATABASE_URI).',
    )
  }
  return conn
}

/**
 * Returns a singleton PostgresSaver. Tables (checkpoints, checkpoint_writes,
 * checkpoint_blobs) live in the `agent_checkpoints` schema so they don't
 * collide with Payload-owned tables.
 */
export async function getCheckpointer(): Promise<PostgresSaver> {
  if (!cached) {
    agentLog('checkpointer.init')
    const saver = PostgresSaver.fromConnString(resolveConnectionString(), {
      schema: process.env.AGENT_CHECKPOINT_SCHEMA ?? 'agent_checkpoints',
    })
    cached = {
      saver,
      setupPromise: saver.setup().then(() => {
        agentLog('checkpointer.ready', {
          schema: process.env.AGENT_CHECKPOINT_SCHEMA ?? 'agent_checkpoints',
        })
      }),
    }
  }
  try {
    await cached.setupPromise
  } catch (err) {
    agentError('checkpointer.setup_failed', err)
    throw err
  }
  return cached.saver
}
