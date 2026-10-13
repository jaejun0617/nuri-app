package com.nuri.walk;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "walk_qa_protocol")
public class WalkQaProtocol {
  @PrimaryKey public int id = 1;
  public long revision;
  @NonNull public byte[] nonce = new byte[0];
  @NonNull public byte[] ciphertext = new byte[0];
}
