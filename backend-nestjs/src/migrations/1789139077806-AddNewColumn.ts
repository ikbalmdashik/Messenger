import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789139077806 implements MigrationInterface {
    name = 'AddNewColumn1789139077806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "conversation_participants" (
                "id" SERIAL NOT NULL,
                "conversationId" integer NOT NULL,
                "userId" integer NOT NULL,
                CONSTRAINT "UQ_e43efbfa3b850160b5b2c50e3ec" UNIQUE ("conversationId", "userId"),
                CONSTRAINT "PK_61b51428ad9453f5921369fbe94" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "conversations" (
                "conversationId" SERIAL NOT NULL,
                "type" character varying NOT NULL DEFAULT 'DIRECT',
                "name" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c7ec3c32470cfe61f947cd10b58" PRIMARY KEY ("conversationId")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "chat_messages" (
                "chatId" SERIAL NOT NULL,
                "senderId" integer NOT NULL,
                "receiverId" integer NOT NULL,
                "conversationId" integer,
                "message" character varying NOT NULL,
                "status" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e82334881c89c2aef308789c8be" PRIMARY KEY ("chatId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2236ea1bb6d953060da89af916" ON "chat_messages" ("conversationId", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "FK_4453e20858b14ab765a09ad728c" FOREIGN KEY ("conversationId") REFERENCES "conversations"("conversationId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def" FOREIGN KEY ("senderId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_9a197c82c9ea44d75bc145a6e2c" FOREIGN KEY ("receiverId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_9a197c82c9ea44d75bc145a6e2c"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_4453e20858b14ab765a09ad728c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2236ea1bb6d953060da89af916"
        `);
        await queryRunner.query(`
            DROP TABLE "chat_messages"
        `);
        await queryRunner.query(`
            DROP TABLE "conversations"
        `);
        await queryRunner.query(`
            DROP TABLE "conversation_participants"
        `);
    }

}
