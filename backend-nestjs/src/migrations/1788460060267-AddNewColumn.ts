import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788460060267 implements MigrationInterface {
    name = 'AddNewColumn1788460060267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "Chats" (
                "chatId" SERIAL NOT NULL,
                "senderId" integer NOT NULL,
                "receiverId" integer NOT NULL,
                "message" character varying NOT NULL,
                "status" character varying NOT NULL,
                "createdAt" character varying NOT NULL,
                CONSTRAINT "PK_cf55b28aed23b1b076c192f89de" PRIMARY KEY ("chatId")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "userId" SERIAL NOT NULL,
                "fullName" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "role" character varying NOT NULL,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_tokens" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "token" character varying NOT NULL,
                "type" character varying NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL,
                CONSTRAINT "UQ_0db4d75e7b32888464cdf8e3745" UNIQUE ("token"),
                CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_c7d42f55bd3993c72705a56bba5" FOREIGN KEY ("senderId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_2e43b233241208de67edd538632" FOREIGN KEY ("receiverId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Chats" DROP CONSTRAINT "FK_2e43b233241208de67edd538632"
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats" DROP CONSTRAINT "FK_c7d42f55bd3993c72705a56bba5"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "Chats"
        `);
    }

}
