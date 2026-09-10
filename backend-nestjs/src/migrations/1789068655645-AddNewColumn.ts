import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789068655645 implements MigrationInterface {
    name = 'AddNewColumn1789068655645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "publicId" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "UQ_9099c98f00a1b5aca6b8f7f04a3" UNIQUE ("publicId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9099c98f00a1b5aca6b8f7f04a" ON "users" ("publicId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9099c98f00a1b5aca6b8f7f04a"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT "UQ_9099c98f00a1b5aca6b8f7f04a3"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "publicId"
        `);
    }

}
