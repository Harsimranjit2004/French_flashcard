import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userSnapshots = sqliteTable("user_snapshots", {
  userId: text("user_id").primaryKey(), payload: text("payload").notNull(), updatedAt: text("updated_at").notNull(),
});
export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), name: text("name").notNull(), description: text("description").notNull().default(""), cardTypes: text("card_types").notNull(), archivedAt: text("archived_at"),
}, t => [uniqueIndex("decks_user_name").on(t.userId,t.name)]);
export const notes = sqliteTable("notes", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(), deckId:text("deck_id").notNull(), lemma:text("lemma").notNull(), normalizedLemma:text("normalized_lemma").notNull(), article:text("article"), gender:text("gender"), partOfSpeech:text("part_of_speech").notNull(), translations:text("translations").notNull(), ipa:text("ipa"), exampleFr:text("example_fr"), exampleEn:text("example_en"), audioUrl:text("audio_url"), tags:text("tags").notNull().default("[]"), cefrLevel:text("cefr_level"), needsReview:integer("needs_review",{mode:"boolean"}).notNull().default(false), source:text("source").notNull(), createdAt:text("created_at").notNull(), deletedAt:text("deleted_at"),
}, t => [uniqueIndex("notes_user_deck_lemma_part").on(t.userId,t.deckId,t.normalizedLemma,t.partOfSpeech),index("notes_user_deck").on(t.userId,t.deckId)]);
export const cards = sqliteTable("cards", {
  id:text("id").primaryKey(), noteId:text("note_id").notNull(), userId:text("user_id").notNull(), type:text("type").notNull(), due:text("due").notNull(), stability:real("stability").notNull().default(0), difficulty:real("difficulty").notNull().default(0), elapsedDays:integer("elapsed_days").notNull().default(0), scheduledDays:integer("scheduled_days").notNull().default(0), reps:integer("reps").notNull().default(0), lapses:integer("lapses").notNull().default(0), state:integer("state").notNull().default(0), lastReview:text("last_review"), suspendedAt:text("suspended_at"), revision:integer("revision").notNull().default(0),
}, t => [uniqueIndex("cards_note_type").on(t.noteId,t.type),index("cards_user_due").on(t.userId,t.due)]);
export const reviewLogs = sqliteTable("review_logs", {
  id:text("id").primaryKey(), clientEventId:text("client_event_id").notNull(), cardId:text("card_id").notNull(), userId:text("user_id").notNull(), rating:integer("rating").notNull(), stateBefore:integer("state_before").notNull(), dueBefore:text("due_before").notNull(), stabilityBefore:real("stability_before").notNull(), difficultyBefore:real("difficulty_before").notNull(), stateAfter:integer("state_after").notNull(), dueAfter:text("due_after").notNull(), stabilityAfter:real("stability_after").notNull(), difficultyAfter:real("difficulty_after").notNull(), elapsedDays:integer("elapsed_days").notNull(), scheduledDays:integer("scheduled_days").notNull(), reviewedAt:text("reviewed_at").notNull(), durationMs:integer("duration_ms").notNull(), answerMethod:text("answer_method").notNull(), asrTranscript:text("asr_transcript"), asrOverridden:integer("asr_overridden",{mode:"boolean"}).notNull().default(false),
}, t => [uniqueIndex("review_logs_client_event").on(t.userId,t.clientEventId),index("review_logs_user_time").on(t.userId,t.reviewedAt),index("review_logs_card_time").on(t.cardId,t.reviewedAt)]);
export const apiKeys = sqliteTable("api_keys", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(), keyHash:text("key_hash").notNull(), keyPrefix:text("key_prefix").notNull(), label:text("label").notNull(), createdAt:text("created_at").notNull(), lastUsedAt:text("last_used_at"), revokedAt:text("revoked_at"),
}, t => [uniqueIndex("api_keys_hash").on(t.keyHash),index("api_keys_user").on(t.userId)]);
export const audioAssets = sqliteTable("audio_assets", {
  id:text("id").primaryKey(), contentHash:text("content_hash").notNull(), textValue:text("text_value").notNull(), voice:text("voice").notNull(), provider:text("provider").notNull(), objectKey:text("object_key").notNull(), createdAt:text("created_at").notNull(),
}, t => [uniqueIndex("audio_assets_hash").on(t.contentHash)]);
