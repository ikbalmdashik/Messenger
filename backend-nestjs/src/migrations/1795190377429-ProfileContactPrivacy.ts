import { MigrationInterface, QueryRunner } from "typeorm";

export class ProfileContactPrivacy1795190377429 implements MigrationInterface {
    name = 'ProfileContactPrivacy1795190377429'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "contact" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "privacy" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "privacy"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "contact"
        `);
    }

}
