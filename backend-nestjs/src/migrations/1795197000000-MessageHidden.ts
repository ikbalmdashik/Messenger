import { MigrationInterface, QueryRunner } from "typeorm";

export class MessageHidden1795197000000 implements MigrationInterface {
    name = 'MessageHidden1795197000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "message_hidden" (
                "id" SERIAL NOT NULL,
                "messageId" integer NOT NULL,
                "userId" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_message_hidden_message_user" UNIQUE ("messageId", "userId"),
                CONSTRAINT "PK_message_hidden_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_message_hidden_user" ON "message_hidden" ("userId")
        `);
        await queryRunner.query(`
            ALTER TABLE "message_hidden"
            ADD CONSTRAINT "FK_message_hidden_message" FOREIGN KEY ("messageId")
            REFERENCES "chat_messages"("messageId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "message_hidden"
            ADD CONSTRAINT "FK_message_hidden_user" FOREIGN KEY ("userId")
            REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message_hidden" DROP CONSTRAINT "FK_message_hidden_user"`);
        await queryRunner.query(`ALTER TABLE "message_hidden" DROP CONSTRAINT "FK_message_hidden_message"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_message_hidden_user"`);
        await queryRunner.query(`DROP TABLE "message_hidden"`);
    }

}
