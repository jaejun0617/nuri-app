package com.nuri.walk;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;
import java.util.List;

@Dao public interface WalkDao {
  @Query("SELECT COUNT(*) FROM walk_local_sessions") int sessionCount();
  @Query("SELECT * FROM walk_local_sessions WHERE activeSlot = 1 LIMIT 1") WalkLocalSession active();
  @Query("SELECT * FROM walk_local_sessions WHERE sessionId = :id") WalkLocalSession session(String id);
  @Query("SELECT * FROM walk_local_sessions ORDER BY updatedAt DESC LIMIT 100") List<WalkLocalSession> recent();
  @Insert(onConflict = OnConflictStrategy.ABORT) void insertSession(WalkLocalSession row);
  @Update void updateSession(WalkLocalSession row);
  @Insert(onConflict = OnConflictStrategy.ABORT) void insertChunk(WalkPointChunk row);
  @Query("SELECT * FROM walk_point_chunks WHERE sessionId = :id ORDER BY chunkIndex") List<WalkPointChunk> chunks(String id);
  @Query("DELETE FROM walk_point_chunks WHERE sessionId = :id") void deleteChunks(String id);
  @Query("SELECT * FROM walk_command_receipts WHERE commandId = :id") WalkCommandReceipt receipt(String id);
  @Query("SELECT COUNT(*) FROM walk_command_receipts WHERE sessionId = :id") int receiptCount(String id);
  @Query("UPDATE walk_command_receipts SET outcome = :code WHERE sessionId = :id AND outcome = 'PENDING'") void failPending(String id, String code);
  @Insert(onConflict = OnConflictStrategy.ABORT) void insertReceipt(WalkCommandReceipt row);
  @Update void updateReceipt(WalkCommandReceipt row);
}
