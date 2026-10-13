package com.nuri.walk;

import androidx.room.Database;
import androidx.room.RoomDatabase;

@Database(entities = {WalkLocalSession.class, WalkPointChunk.class, WalkCommandReceipt.class}, version = 1, exportSchema = true)
public abstract class WalkDatabase extends RoomDatabase {
  public abstract WalkDao walkDao();
}
