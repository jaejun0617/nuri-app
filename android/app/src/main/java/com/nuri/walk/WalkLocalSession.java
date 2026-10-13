package com.nuri.walk;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.ColumnInfo;
import androidx.room.Index;
import androidx.room.PrimaryKey;

@Entity(tableName = "walk_local_sessions", indices = {@Index(value = "activeSlot", unique = true)})
public class WalkLocalSession {
  @PrimaryKey @NonNull public String sessionId = "";
  public Integer activeSlot;
  @NonNull public String runtimeState = "IDLE";
  public long revision;
  public long metadataRevision;
  @NonNull public byte[] metadataNonce = new byte[0];
  @NonNull public byte[] metadataCiphertext = new byte[0];
  public byte[] finishNonce;
  public byte[] finishCiphertext;
  public long chunkCount;
  public long updatedAt;
  public String lastErrorCode;
  public byte[] distanceNonce;
  public byte[] distanceCiphertext;
  @ColumnInfo(defaultValue = "0") public long distanceRevision;
}
