import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789159497451 implements MigrationInterface {
    name = 'AddNewColumn1789159497451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "unreadCount" integer NOT NULL DEFAULT '0'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "unreadCount"
        `);
    }

}
