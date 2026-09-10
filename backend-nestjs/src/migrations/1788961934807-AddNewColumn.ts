import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788961934807 implements MigrationInterface {
    name = 'AddNewColumn1788961934807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Chats" DROP CONSTRAINT "FK_2e43b233241208de67edd538632"
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats" DROP CONSTRAINT "FK_c7d42f55bd3993c72705a56bba5"
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_c7d42f55bd3993c72705a56bba5" FOREIGN KEY ("senderId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_2e43b233241208de67edd538632" FOREIGN KEY ("receiverId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_c7d42f55bd3993c72705a56bba5" FOREIGN KEY ("senderId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "Chats"
            ADD CONSTRAINT "FK_2e43b233241208de67edd538632" FOREIGN KEY ("receiverId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

}
