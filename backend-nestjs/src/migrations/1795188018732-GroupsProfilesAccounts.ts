import { MigrationInterface, QueryRunner } from "typeorm";

export class GroupsProfilesAccounts1795188018732 implements MigrationInterface {
    name = 'GroupsProfilesAccounts1795188018732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "role" character varying(20) NOT NULL DEFAULT 'MEMBER'
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "joinedAt" TIMESTAMP NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "description" character varying(500)
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "createdById" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations"
            ADD "permissions" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "type" character varying(20) NOT NULL DEFAULT 'TEXT'
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "address" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "education" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "education"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "address"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "type"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "createdById"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversations" DROP COLUMN "description"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "joinedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "role"
        `);
    }

}
