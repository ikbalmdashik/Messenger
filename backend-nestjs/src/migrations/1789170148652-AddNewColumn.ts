import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1789170148652 implements MigrationInterface {
    name = 'AddNewColumn1789170148652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "conversation_participants" (
                "id" SERIAL NOT NULL,
                "conversationId" integer NOT NULL,
                "userId" integer NOT NULL,
                "unreadCount" integer NOT NULL DEFAULT '0',
                CONSTRAINT "UQ_conversation_participants_conversation_user" UNIQUE ("conversationId", "userId"),
                CONSTRAINT "PK_61b51428ad9453f5921369fbe94" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_conversation_participants_conversation" ON "conversation_participants" ("conversationId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_conversation_participants_user" ON "conversation_participants" ("userId")
        `);
        await queryRunner.query(`
            CREATE TABLE "conversations" (
                "conversationId" SERIAL NOT NULL,
                "type" character varying(20) NOT NULL DEFAULT 'DIRECT',
                "name" character varying(255),
                "directKey" character varying(100),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c7ec3c32470cfe61f947cd10b58" PRIMARY KEY ("conversationId")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_conversations_direct_key" ON "conversations" ("directKey")
            WHERE "directKey" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "chat_messages" (
                "messageId" SERIAL NOT NULL,
                "conversationId" integer NOT NULL,
                "senderId" integer NOT NULL,
                "message" character varying NOT NULL,
                "status" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_30251e3ffecb8151f2e4c7732c1" PRIMARY KEY ("messageId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2236ea1bb6d953060da89af916" ON "chat_messages" ("conversationId", "createdAt")
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "userId" SERIAL NOT NULL,
                "fullName" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "publicId" character varying,
                "role" character varying NOT NULL,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_9099c98f00a1b5aca6b8f7f04a3" UNIQUE ("publicId"),
                CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9099c98f00a1b5aca6b8f7f04a" ON "users" ("publicId")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_tokens" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "token" character varying NOT NULL,
                "usedFor" character varying NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL,
                CONSTRAINT "UQ_0db4d75e7b32888464cdf8e3745" UNIQUE ("token"),
                CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_otps" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" integer NOT NULL,
                "otpHash" character varying(255) NOT NULL,
                "usedFor" character varying NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "isUsed" boolean NOT NULL DEFAULT false,
                "attempts" integer NOT NULL DEFAULT '0',
                "ipAddress" character varying,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b486cc6a733e8caa0e8f1bd0ca2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_USER_OTP_LOOKUP" ON "auth_otps" ("userId", "usedFor", "isUsed", "expiresAt")
        `);
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
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "FK_4453e20858b14ab765a09ad728c" FOREIGN KEY ("conversationId") REFERENCES "conversations"("conversationId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants"
            ADD CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def" FOREIGN KEY ("senderId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_45745953065384cc9c4264c2a3d" FOREIGN KEY ("conversationId") REFERENCES "conversations"("conversationId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_otps"
            ADD CONSTRAINT "FK_a55bbdc21152fbc055cde340454" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "auth_otps" DROP CONSTRAINT "FK_a55bbdc21152fbc055cde340454"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_45745953065384cc9c4264c2a3d"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf"
        `);
        await queryRunner.query(`
            ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_4453e20858b14ab765a09ad728c"
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
        await queryRunner.query(`
            DROP INDEX "public"."IDX_USER_OTP_LOOKUP"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_otps"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_tokens"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9099c98f00a1b5aca6b8f7f04a"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2236ea1bb6d953060da89af916"
        `);
        await queryRunner.query(`
            DROP TABLE "chat_messages"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."UQ_conversations_direct_key"
        `);
        await queryRunner.query(`
            DROP TABLE "conversations"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_conversation_participants_user"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_conversation_participants_conversation"
        `);
        await queryRunner.query(`
            DROP TABLE "conversation_participants"
        `);
    }

}
