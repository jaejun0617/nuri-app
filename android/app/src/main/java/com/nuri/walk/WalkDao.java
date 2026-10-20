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
  @Query("SELECT * FROM walk_local_sessions WHERE sessionId > :after ORDER BY sessionId LIMIT :limit") List<WalkLocalSession> scan(String after, int limit);
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
  @Query("SELECT * FROM walk_point_chunks WHERE sessionId = :id AND accepted = 1 AND chunkIndex > :after ORDER BY chunkIndex LIMIT :limit") List<WalkPointChunk> routePage(String id, long after, int limit);
  @Query("SELECT COUNT(*) FROM walk_point_chunks WHERE sessionId = :id AND accepted = 1") long routeCount(String id);
  @Query("SELECT * FROM walk_point_chunks WHERE sessionId = :id AND accepted = 1 AND chunkIndex < :before ORDER BY chunkIndex DESC LIMIT :limit") List<WalkPointChunk> routeBefore(String id, long before, int limit);
  @Query("SELECT * FROM walk_qa_protocol WHERE id = 1") WalkQaProtocol qaProtocol();
  @Insert(onConflict = OnConflictStrategy.REPLACE) void saveQaProtocol(WalkQaProtocol row);
  @Query("DELETE FROM walk_command_receipts WHERE sessionId = :id") void deleteSessionReceipts(String id);
  @Query("DELETE FROM walk_local_sessions WHERE sessionId = :id") void deleteSession(String id);
  @Query("DELETE FROM walk_qa_protocol WHERE id = 1") void deleteQaProtocol();
}
