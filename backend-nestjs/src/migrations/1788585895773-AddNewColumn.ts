import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788585895773 implements MigrationInterface {
    name = 'AddNewColumn1788585895773'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."auth_otps_type_enum" AS ENUM('FORGOT_PASSWORD')
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_otps" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "otpHash" character varying NOT NULL,
                "type" "public"."auth_otps_type_enum" NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "attempts" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "auth_otps"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."auth_otps_type_enum"
        `);
    }

}
