import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1788686679412 implements MigrationInterface {
    name = 'AddNewColumn1788686679412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."user_sessions_status_enum" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED')
        `);
        await queryRunner.query(`
            CREATE TABLE "user_sessions" (
                "sessionId" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "tokenIdentifier" character varying NOT NULL,
                "deviceInfo" character varying,
                "ipAddress" character varying,
                "status" "public"."user_sessions_status_enum" NOT NULL DEFAULT 'ACTIVE',
                "expiresAt" TIMESTAMP NOT NULL,
                "lastActiveAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_8ae3a73cd43e47132cb86e07816" UNIQUE ("tokenIdentifier"),
                CONSTRAINT "PK_f1d56cb09724333a500af7fe914" PRIMARY KEY ("sessionId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8ae3a73cd43e47132cb86e0781" ON "user_sessions" ("tokenIdentifier")
        `);
        await queryRunner.query(`
            ALTER TABLE "user_sessions"
            ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_55fa4db8406ed66bc7044328427"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8ae3a73cd43e47132cb86e0781"
        `);
        await queryRunner.query(`
            DROP TABLE "user_sessions"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."user_sessions_status_enum"
        `);
    }

}
