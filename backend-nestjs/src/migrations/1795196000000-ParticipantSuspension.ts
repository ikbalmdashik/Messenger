import { MigrationInterface, QueryRunner } from "typeorm";

export class ParticipantSuspension1795196000000 implements MigrationInterface {
    name = 'ParticipantSuspension1795196000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "suspendedUntil" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "suspendedById" integer
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "suspendedById"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "suspendedUntil"
        `);
    }

}
