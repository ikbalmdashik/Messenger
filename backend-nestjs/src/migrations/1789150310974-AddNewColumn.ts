import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789150310974 implements MigrationInterface {
    name = 'AddNewColumn1789150310974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_9a197c82c9ea44d75bc145a6e2c"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "PK_e82334881c89c2aef308789c8be"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "chatId"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "receiverId"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "messageId" SERIAL NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "PK_30251e3ffecb8151f2e4c7732c1" PRIMARY KEY ("messageId")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_45745953065384cc9c4264c2a3d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2236ea1bb6d953060da89af916"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ALTER COLUMN "conversationId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2236ea1bb6d953060da89af916" ON "chat_messages" ("conversationId", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_45745953065384cc9c4264c2a3d" FOREIGN KEY ("conversationId") REFERENCES "conversations"("conversationId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_45745953065384cc9c4264c2a3d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2236ea1bb6d953060da89af916"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ALTER COLUMN "conversationId" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2236ea1bb6d953060da89af916" ON "chat_messages" USING btree ("conversationId", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_45745953065384cc9c4264c2a3d" FOREIGN KEY ("conversationId") REFERENCES "conversations"("conversationId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "PK_30251e3ffecb8151f2e4c7732c1"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP COLUMN "messageId"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "receiverId" integer NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD "chatId" SERIAL NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "PK_e82334881c89c2aef308789c8be" PRIMARY KEY ("chatId")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_9a197c82c9ea44d75bc145a6e2c" FOREIGN KEY ("receiverId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

}
