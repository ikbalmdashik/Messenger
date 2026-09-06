import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788690377491 implements MigrationInterface {
    name = 'AddNewColumn1788690377491'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_tokens"
                RENAME COLUMN "type" TO "usedFor"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_tokens"
                RENAME COLUMN "usedFor" TO "type"
        `);
    }

}
