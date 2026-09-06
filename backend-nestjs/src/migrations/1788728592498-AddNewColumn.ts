import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788728592498 implements MigrationInterface {
    name = 'AddNewColumn1788728592498'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "type"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."auth_otps_type_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "used"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "usedFor" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "isUsed" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "ipAddress" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "otpHash"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "otpHash" character varying(255) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "expiresAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_USER_OTP_LOOKUP" ON "auth_otps" ("userId", "usedFor", "isUsed", "expiresAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD CONSTRAINT "FK_a55bbdc21152fbc055cde340454" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP CONSTRAINT "FK_a55bbdc21152fbc055cde340454"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_USER_OTP_LOOKUP"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "expiresAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "expiresAt" TIMESTAMP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "otpHash"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "otpHash" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "id" SERIAL NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "ipAddress"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "isUsed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps" DROP COLUMN "usedFor"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "used" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."auth_otps_type_enum" AS ENUM('FORGOT_PASSWORD')
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD "type" "public"."auth_otps_type_enum" NOT NULL
        `);
    }

}
