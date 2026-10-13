package com.nuri.walk;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;

@Entity(tableName = "walk_command_receipts", indices = {@Index("sessionId")})
public class WalkCommandReceipt {
  @PrimaryKey @NonNull public String commandId = "";
  @NonNull public String sessionId = "";
  @NonNull public String inputDigest = "";
  @NonNull public String outcome = "PENDING";
  public long resultingRevision;
  public byte[] resultNonce;
  public byte[] resultCiphertext;
}
