package com.nuri.walk

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

object WalkRoomMigrations {
  val V1_TO_V2=object:Migration(1,2){
    override fun migrate(db:SupportSQLiteDatabase){
      db.execSQL("ALTER TABLE walk_local_sessions ADD COLUMN distanceNonce BLOB")
      db.execSQL("ALTER TABLE walk_local_sessions ADD COLUMN distanceCiphertext BLOB")
      db.execSQL("ALTER TABLE walk_local_sessions ADD COLUMN distanceRevision INTEGER NOT NULL DEFAULT 0")
      db.execSQL("ALTER TABLE walk_point_chunks ADD COLUMN accepted INTEGER NOT NULL DEFAULT 0")
      db.execSQL("ALTER TABLE walk_point_chunks ADD COLUMN routeSegment INTEGER NOT NULL DEFAULT 0")
      db.execSQL("CREATE TABLE IF NOT EXISTS walk_qa_protocol (id INTEGER NOT NULL, revision INTEGER NOT NULL, nonce BLOB NOT NULL, ciphertext BLOB NOT NULL, PRIMARY KEY(id))")
    }
  }
}
