package com.nuri.walk;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.ForeignKey;

@Entity(tableName = "walk_point_chunks", primaryKeys = {"sessionId", "chunkIndex"},
  foreignKeys = @ForeignKey(entity = WalkLocalSession.class, parentColumns = "sessionId", childColumns = "sessionId", onDelete = ForeignKey.CASCADE))
public class WalkPointChunk {
  @NonNull public String sessionId = "";
  public long chunkIndex;
  @NonNull public byte[] nonce = new byte[0];
  @NonNull public byte[] ciphertext = new byte[0];
  public int sampleCount;
  public int schemaVersion = 1;
}
