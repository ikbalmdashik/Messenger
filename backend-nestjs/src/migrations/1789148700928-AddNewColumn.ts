import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789148700928 implements MigrationInterface {
    name = 'AddNewColumn1789148700928'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "UQ_e43efbfa3b850160b5b2c50e3ec"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "directKey" character varying(100)
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "type"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "type" character varying(20) NOT NULL DEFAULT 'DIRECT'
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "name" character varying(255)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_conversation_participants_conversation" ON "conversation_participants" ("conversationId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_conversation_participants_user" ON "conversation_participants" ("userId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_conversations_direct_key" ON "conversations" ("directKey")
            WHERE "directKey" IS NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "UQ_conversation_participants_conversation_user" UNIQUE ("conversationId", "userId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "UQ_conversation_participants_conversation_user"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."UQ_conversations_direct_key"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_conversation_participants_user"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_conversation_participants_conversation"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "name" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "type"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "type" character varying NOT NULL DEFAULT 'DIRECT'
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "directKey"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "UQ_e43efbfa3b850160b5b2c50e3ec" UNIQUE ("conversationId", "userId")
        `);
    }

}
