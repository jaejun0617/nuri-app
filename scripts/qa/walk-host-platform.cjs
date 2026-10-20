'use strict';
// JVM platform port ONLY: production Kotlin/storage/DAO queries stay unchanged.
// SQLite uses the committed Room v2 schema. Android/Room/FGS/device behavior is
// not asserted by this host runner; all key material is injected per test.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function platform(root, output) {
  const directory = path.join(output, 'platform');
  function put(name, content) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
    return file;
  }
  const java = [];
  const annotations = {
    Dao: '', Insert: 'int onConflict() default 0;', Update: '',
    Query: 'String value();', PrimaryKey: '', NonNull: '',
    ColumnInfo: 'String defaultValue() default "";', Index: 'String[] value(); boolean unique() default false;',
    ForeignKey: 'int CASCADE=5; Class<?> entity(); String[] parentColumns(); String[] childColumns(); int onDelete();',
    Entity: 'String tableName(); Index[] indices() default {}; String[] primaryKeys() default {}; ForeignKey[] foreignKeys() default {};',
  };
  for (const [name, body] of Object.entries(annotations)) {
    const pkg = name === 'NonNull' ? 'androidx.annotation' : 'androidx.room';
    java.push(put(pkg.replaceAll('.', '/') + '/' + name + '.java',
      `package ${pkg}; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface ${name} {${body}}`));
  }
  java.push(put('androidx/room/OnConflictStrategy.java', 'package androidx.room; public class OnConflictStrategy {public static final int ABORT=3, REPLACE=1;}'));
  java.push(put('android/content/Context.java', `package android.content;
    public class Context {
      public static final String LOCATION_SERVICE="location";
      private final java.io.File root;
      public Context(java.io.File root){this.root=root;root.mkdirs();}
      public Context getApplicationContext(){return this;}
      public java.io.File getNoBackupFilesDir(){return root;}
      public java.io.File getExternalFilesDir(String type){return root;}
      public Object getSystemService(String name){return new android.location.LocationManager();}
      public Object getContentResolver(){return this;}
      public boolean deleteDatabase(String name){return new java.io.File(name).delete();}
    }`));
  java.push(put('android/content/Intent.java', 'package android.content; public class Intent {public String action; public Intent(Context c,Class<?> k){} public void setAction(String a){action=a;} public String getAction(){return action;} public Intent putExtra(String k,String v){return this;} }'));
  java.push(put('android/content/pm/PackageManager.java', 'package android.content.pm; public class PackageManager {public static final int PERMISSION_GRANTED=0;}'));
  java.push(put('android/Manifest.java', 'package android; public class Manifest {public static class permission {public static final String ACCESS_FINE_LOCATION="fine", ACCESS_COARSE_LOCATION="coarse", POST_NOTIFICATIONS="notifications";}}'));
  java.push(put('android/os/Build.java', 'package android.os; public class Build {public static class VERSION {public static final int SDK_INT=36;}}'));
  java.push(put('android/os/SystemClock.java', 'package android.os; public class SystemClock {public static long elapsedRealtimeNanos(){return System.nanoTime();} public static long elapsedRealtime(){return System.nanoTime()/1000000;}}'));
  java.push(put('android/os/Looper.java', 'package android.os; public class Looper {public static Looper getMainLooper(){return new Looper();}}'));
  java.push(put('android/os/Handler.java', 'package android.os; public class Handler {public Handler(Looper l){} public boolean post(Runnable r){r.run();return true;}}'));
  java.push(put('android/provider/Settings.java', 'package android.provider; public class Settings {public static class Global {public static final String BOOT_COUNT="boot"; public static int getInt(Object c,String k){return 1;}}}'));
  java.push(put('android/location/LocationManager.java', 'package android.location; public class LocationManager {}'));
  java.push(put('android/location/Location.java', `package android.location;
    public class Location {
      private double latitude,longitude; private float accuracy,speed,bearing; private long time,elapsedRealtimeNanos;
      public Location(String p){} public boolean hasSpeed(){return false;} public boolean hasBearing(){return false;}
      public boolean isMock(){return false;} public boolean isFromMockProvider(){return false;}
      public double getLatitude(){return latitude;} public void setLatitude(double v){latitude=v;}
      public double getLongitude(){return longitude;} public void setLongitude(double v){longitude=v;}
      public float getAccuracy(){return accuracy;} public void setAccuracy(float v){accuracy=v;}
      public float getSpeed(){return speed;} public float getBearing(){return bearing;}
      public long getTime(){return time;} public void setTime(long v){time=v;}
      public long getElapsedRealtimeNanos(){return elapsedRealtimeNanos;} public void setElapsedRealtimeNanos(long v){elapsedRealtimeNanos=v;}
      public static void distanceBetween(double a,double b,double c,double d,float[] r){
        double x=Math.toRadians(c-a),y=Math.toRadians(d-b),h=Math.pow(Math.sin(x/2),2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.pow(Math.sin(y/2),2);
        r[0]=(float)(6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));
      }
    }`));
  java.push(put('androidx/core/content/ContextCompat.java', 'package androidx.core.content; public class ContextCompat {public static int checkSelfPermission(android.content.Context c,String p){return 0;} public static void startForegroundService(android.content.Context c,android.content.Intent i){throw new AssertionError("HOST_FGS_MUST_BE_INJECTED");}}'));
  java.push(put('androidx/core/location/LocationManagerCompat.java', 'package androidx.core.location; public class LocationManagerCompat {public static boolean isLocationEnabled(android.location.LocationManager m){return true;}}'));
  java.push(put('android/util/AtomicFile.java', `package android.util; public class AtomicFile {
    private final java.io.File file; public AtomicFile(java.io.File f){file=f;}
    public byte[] readFully() throws java.io.IOException{return java.nio.file.Files.readAllBytes(file.toPath());}
    public java.io.File getBaseFile(){return file;}
    public java.io.FileOutputStream startWrite() throws java.io.IOException{return new java.io.FileOutputStream(file);}
    public void finishWrite(java.io.FileOutputStream s) throws java.io.IOException{s.close();}
    public void failWrite(java.io.FileOutputStream s) throws java.io.IOException{s.close();} public void delete(){file.delete();}
  }`));
  java.push(put('androidx/room/Room.java', `package androidx.room; public class Room {
    public static Builder databaseBuilder(android.content.Context c,Class<com.nuri.walk.WalkDatabase> k,String file){return new Builder(file);}
    public static class Builder {private final String file; Builder(String f){file=f;} public Builder addMigrations(Object m){return this;} public com.nuri.walk.WalkDatabase build(){return new com.nuri.walk.WalkDatabase(file);}}
  }`));
  java.push(put('androidx/test/ext/junit/runners/AndroidJUnit4.java', 'package androidx.test.ext.junit.runners; public class AndroidJUnit4 extends org.junit.runners.BlockJUnit4ClassRunner {public AndroidJUnit4(Class<?> k) throws org.junit.runners.model.InitializationError {super(k);}}'));
  java.push(put('androidx/test/platform/app/InstrumentationRegistry.java', `package androidx.test.platform.app; public class InstrumentationRegistry {
    public static InstrumentationRegistry getInstrumentation(){return new InstrumentationRegistry();}
    public android.content.Context getTargetContext(){return new android.content.Context(new java.io.File(System.getProperty("walk.host.data")));}
  }`));
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'android/app/schemas/com.nuri.walk.WalkDatabase/2.json'), 'utf8'));
  const sql = schema.database.entities.flatMap(e => [e.createSql, ...(e.indices || []).map(i => i.createSql)]
    .map(s => s.replaceAll('${TABLE_NAME}', e.tableName)));
  const schemaFile = put('schema.json', JSON.stringify(sql));
  java.push(put('com/nuri/walk/WalkDatabase.java', `package com.nuri.walk;
    import java.sql.*; import java.util.*; import java.lang.reflect.*;
    public class WalkDatabase {
      private final Connection connection; private final WalkDao dao; private int depth;
      public int scans=0, maxScan=0; public boolean failUpdate=false;
      public WalkDatabase(String file){try {
        connection=DriverManager.getConnection("jdbc:sqlite:"+file);
        connection.createStatement().execute("PRAGMA foreign_keys=ON");
        org.json.JSONArray sql=new org.json.JSONArray(java.nio.file.Files.readString(java.nio.file.Path.of(System.getProperty("walk.host.schema"))));
        for(int i=0;i<sql.length();i++) connection.createStatement().execute(sql.getString(i));
        dao=(WalkDao)Proxy.newProxyInstance(WalkDao.class.getClassLoader(),new Class[]{WalkDao.class},(p,m,a)->query(m,a));
      }catch(Exception e){throw new RuntimeException(e);}}
      public WalkDao walkDao(){return dao;}
      public OpenHelper getOpenHelper(){return new OpenHelper();}
      public class OpenHelper {public OpenHelper getWritableDatabase(){return this;}
        public AutoCloseable query(String sql) throws Exception {Statement s=connection.createStatement();s.execute(sql);return ()->s.close();}}
      public synchronized <T>T runInTransaction(java.util.concurrent.Callable<T> body) throws Exception {
        boolean outer=depth++==0; if(outer)connection.setAutoCommit(false);
        try {T v=body.call();if(outer)connection.commit();return v;}
        catch(Exception|Error e){if(outer)connection.rollback();throw e;}
        finally{depth--;if(outer)connection.setAutoCommit(true);}
      }
      public void close(){try{connection.close();}catch(Exception e){throw new RuntimeException(e);}}
      private Object query(Method m,Object[] args) throws Exception {
        if(m.getName().equals("scan")){scans++;maxScan=Math.max(maxScan,(Integer)args[1]);}
        if(m.getName().equals("updateSession")&&failUpdate){failUpdate=false;throw new IllegalStateException("INJECTED_UPDATE_FAILURE");}
        androidx.room.Query q=m.getAnnotation(androidx.room.Query.class);
        String sql; List<Object> values=new ArrayList<>();
        if(q!=null){
          java.util.regex.Matcher matcher=java.util.regex.Pattern.compile(":([a-zA-Z]+)").matcher(q.value()); StringBuffer b=new StringBuffer();
          while(matcher.find()){boolean found=false;for(int i=0;i<m.getParameters().length;i++)if(m.getParameters()[i].getName().equals(matcher.group(1))){values.add(args[i]);found=true;break;}
            if(!found)throw new AssertionError("UNKNOWN_SQL_PARAMETER"); matcher.appendReplacement(b,"?");}
          matcher.appendTail(b);sql=b.toString();
        }else{
          Object row=args[0];Class<?> k=row.getClass();String table=k.getAnnotation(androidx.room.Entity.class).tableName();
          List<String> names=new ArrayList<>();String pk=null;Object pkValue=null;
          for(Field f:k.getFields()){if(Modifier.isStatic(f.getModifiers()))continue;
            if(f.getAnnotation(androidx.room.PrimaryKey.class)!=null){pk=f.getName();pkValue=f.get(row);}
            names.add(f.getName());values.add(f.get(row));}
          if(m.getAnnotation(androidx.room.Update.class)!=null){if(pk==null)throw new AssertionError("PK_REQUIRED");
            sql="UPDATE "+table+" SET "+String.join(",",names.stream().map(n->n+"=?").toList())+" WHERE "+pk+"=?";values.add(pkValue);
          }else {boolean replace=m.getAnnotation(androidx.room.Insert.class).onConflict()==1;
            sql="INSERT "+(replace?"OR REPLACE ":"")+"INTO "+table+" ("+String.join(",",names)+") VALUES ("+String.join(",",Collections.nCopies(names.size(),"?"))+")";}
        }
        try(PreparedStatement statement=connection.prepareStatement(sql)){
          for(int i=0;i<values.size();i++)statement.setObject(i+1,values.get(i));
          if(!sql.startsWith("SELECT")){statement.executeUpdate();return null;}
          try(ResultSet r=statement.executeQuery()){
            if(m.getReturnType()==int.class)return r.next()?r.getInt(1):0;
            if(m.getReturnType()==long.class)return r.next()?r.getLong(1):0L;
            boolean list=m.getReturnType()==List.class;
            Class<?> k=list?(Class<?>)((ParameterizedType)m.getGenericReturnType()).getActualTypeArguments()[0]:m.getReturnType();
            List<Object> rows=new ArrayList<>();while(r.next()){
              Object row=k.getConstructor().newInstance();for(Field f:k.getFields()){
                Object v=f.getType()==byte[].class?r.getBytes(f.getName()):r.getObject(f.getName());
                if(f.getType()==boolean.class)v=r.getBoolean(f.getName());
                else if(f.getType()==long.class)v=r.getLong(f.getName());
                else if(f.getType()==int.class)v=r.getInt(f.getName());f.set(row,v);
              } rows.add(row);
            }return list?rows:rows.isEmpty()?null:rows.get(0);
          }
        }
      }
    }`));
  const kt = put('Ports.kt', `package com.nuri.walk
    import android.content.Context
    import android.location.Location
    import org.json.JSONObject
    object WalkRoomMigrations { val V1_TO_V2 = Unit }
    object WalkKeyStore {fun key(allowCreate:Boolean=true):javax.crypto.SecretKey = throw AssertionError("REAL_KEYSTORE_FORBIDDEN")}
    class WalkForegroundService {companion object{const val START="start"}}
    interface WalkLocationSource {fun start(onFix:(Location)->Unit,onAvailability:(Boolean)->Unit,done:(String?)->Unit);fun stop();val subscribed:Boolean}
    class FusedWalkLocationSource(context:Context):WalkLocationSource {
      override val subscribed=false
      override fun start(onFix:(Location)->Unit,onAvailability:(Boolean)->Unit,done:(String?)->Unit){throw AssertionError("REAL_LOCATION_FORBIDDEN")}
      override fun stop()=Unit
    }
    internal class WalkQaPerformance(context:Context){fun observe(v:JSONObject,force:Boolean=false)=v;fun summary(v:JSONObject)=v}
    internal object WalkQaFrames {val processIdentity="HOST_ONLY"}
    internal fun encodeWalkFix(location:Location,segmentIndex:Long):ByteArray = java.nio.ByteBuffer.allocate(59).apply{
      putInt(1);putLong(segmentIndex);putDouble(location.latitude);putDouble(location.longitude);putFloat(location.accuracy)
      putLong(location.elapsedRealtimeNanos);putLong(location.time);put(0);putFloat(0f);put(0);putFloat(0f);put(0)
    }.array()
  `);
  const build = put('com/nuri/BuildConfig.java', 'package com.nuri; public class BuildConfig {public static final boolean NURI_SECURITY_QA=false;}');
  java.push(build);
  const originalTest = fs.readFileSync(path.join(root, 'android/app/src/androidTest/java/com/nuri/walk/WalkPersistenceTest.kt'), 'utf8');
  const gatedTest = originalTest.replace('@Test fun androidKeystoreAeadIsNonExportableAndRejectsWrongAad()', '@org.junit.Ignore("Device keystore explicitly excluded from host scope") @Test fun androidKeystoreAeadIsNonExportableAndRejectsWrongAad()');
  if (gatedTest === originalTest) throw Error('EXPLICIT_KEYSTORE_EXCLUSION_NOT_FOUND');
  return {java, kotlin: [kt, put('WalkPersistenceTest.kt', gatedTest)], schemaFile};
};
