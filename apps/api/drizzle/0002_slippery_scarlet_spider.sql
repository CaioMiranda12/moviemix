CREATE TABLE "ratings" (
	"user_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_media_id_pk" PRIMARY KEY("user_id","media_id"),
	CONSTRAINT "ratings_score_range_ck" CHECK ("ratings"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ratings_user_updated_idx" ON "ratings" USING btree ("user_id","updated_at");