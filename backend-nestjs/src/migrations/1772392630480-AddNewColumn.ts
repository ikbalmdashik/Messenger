import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1772392630480 implements MigrationInterface {
    name = 'AddNewColumn1772392630480'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "auth_tokens"
        `);
    }

}
