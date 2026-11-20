import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionsBlocksSettings1795192801960 implements MigrationInterface {
    name = 'SessionsBlocksSettings1795192801960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_blocks" (
                "id" SERIAL NOT NULL,
                "blockerId" integer NOT NULL,
                "blockedId" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_user_blocks_pair" UNIQUE ("blockerId", "blockedId"),
                CONSTRAINT "PK_0bae5f5cab7574a84889462187c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_user_blocks_blocked" ON "user_blocks" ("blockedId")
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "clearedAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD "isHidden" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "groupSettings" jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "isDeactivated" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "deactivatedAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks"
            ADD CONSTRAINT "FK_eae09d4f95afa5ae30c28384607" FOREIGN KEY ("blockerId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks"
            ADD CONSTRAINT "FK_18d34df8212648b698828f244fb" FOREIGN KEY ("blockedId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_18d34df8212648b698828f244fb"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_eae09d4f95afa5ae30c28384607"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "deactivatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "isDeactivated"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "groupSettings"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "isHidden"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP COLUMN "clearedAt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_user_blocks_blocked"
        `);
        await queryRunner.query(`
            DROP TABLE "user_blocks"
        `);
    }

}
