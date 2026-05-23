import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "agent_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"title" varchar,
  	"last_message_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_sessions_id" integer;
  ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "agent_sessions_user_idx" ON "agent_sessions" USING btree ("user_id");
  CREATE INDEX "agent_sessions_updated_at_idx" ON "agent_sessions" USING btree ("updated_at");
  CREATE INDEX "agent_sessions_created_at_idx" ON "agent_sessions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_sessions_fk" FOREIGN KEY ("agent_sessions_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_agent_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "agent_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "agent_sessions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_sessions_fk";
  
  DROP INDEX "payload_locked_documents_rels_agent_sessions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_sessions_id";`)
}
