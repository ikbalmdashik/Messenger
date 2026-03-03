import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1772364179117 implements MigrationInterface {
    name = 'AddNewColumn1772364179117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "isEmailVerified" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "isEmailVerified"
        `);
    }

}
