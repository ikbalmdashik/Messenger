import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1795184964074 implements MigrationInterface {
    name = 'AddNewColumn1795184964074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "message_reactions" (
                "id" SERIAL NOT NULL,
                "messageId" integer NOT NULL,
                "userId" integer NOT NULL,
                "emoji" character varying(16) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_message_reactions_message_user" UNIQUE ("messageId", "userId"),
                CONSTRAINT "PK_654a9f0059ff93a8f156be66a5b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_message_reactions_message" ON "message_reactions" ("messageId")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "replyToMessageId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "editedAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "isDeleted" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "lastSeenAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "message_reactions"
            ADD CONSTRAINT "FK_7623d77216e8457a552490259e0" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("messageId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "message_reactions"
            ADD CONSTRAINT "FK_82d59cb474d00eea46d7e192f28" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_7f14f98223ed064c8904067dce1" FOREIGN KEY ("replyToMessageId") REFERENCES "chat_messages"("messageId") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_7f14f98223ed064c8904067dce1"
        `);
        await queryRunner.query(`
            ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_82d59cb474d00eea46d7e192f28"
        `);
        await queryRunner.query(`
            ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_7623d77216e8457a552490259e0"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "lastSeenAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "isDeleted"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "editedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "replyToMessageId"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_message_reactions_message"
        `);
        await queryRunner.query(`
            DROP TABLE "message_reactions"
        `);
    }

}
