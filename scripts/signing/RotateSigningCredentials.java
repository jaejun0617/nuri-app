import java.io.*;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.util.*;

// Two-phase, same-inode password change. The coordinator persists secrets in Keychain
// before COMMIT. No filesystem backup, key export, new keypair or replacement file.
class RotateSigningCredentials {
  interface StoreIO {
    byte[] read() throws Exception;
    void replace(byte[] bytes) throws Exception;
  }
  record Prepared(byte[] bytes, String alias, String certificate) {}
  static String required(String name) {
    String value = System.getenv(name);
    if (value == null || value.isEmpty()) throw new IllegalStateException();
    return value;
  }
  static String digest(byte[] bytes) throws Exception {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
  }
  static KeyStore load(byte[] bytes, char[] password) throws Exception {
    KeyStore store = KeyStore.getInstance("PKCS12");
    store.load(new ByteArrayInputStream(bytes), password);
    return store;
  }
  static void require(boolean condition) throws GeneralSecurityException {
    if (!condition) throw new GeneralSecurityException();
  }
  static void prove(KeyStore store, String alias, char[] password, String expected) throws Exception {
    require(store.size() == 1 && store.isKeyEntry(alias));
    var certificate = store.getCertificate(alias);
    require(certificate != null && digest(certificate.getEncoded()).equals(expected));
    var key = store.getKey(alias, password);
    require(key instanceof PrivateKey);
    String algorithm = switch (key.getAlgorithm()) {
      case "RSA" -> "SHA256withRSA";
      case "EC" -> "SHA256withECDSA";
      case "DSA" -> "SHA256withDSA";
      default -> throw new GeneralSecurityException();
    };
    Signature proof = Signature.getInstance(algorithm);
    byte[] challenge = "NURI credential verification only".getBytes(StandardCharsets.UTF_8);
    proof.initSign((PrivateKey) key);
    proof.update(challenge);
    byte[] signature = proof.sign();
    try {
      proof.initVerify(certificate);
      proof.update(challenge);
      require(proof.verify(signature));
    } finally { Arrays.fill(signature, (byte) 0); }
  }
  static void verifyChanged(byte[] bytes, String alias, String expected, char[] oldStore,
      char[] oldKey, char[] newStore, char[] newKey) throws Exception {
    KeyStore store = load(bytes, newStore);
    prove(store, alias, newKey, expected);
    boolean oldStoreDenied = false;
    try { load(bytes, oldStore); } catch (IOException rejected) { oldStoreDenied = true; }
    require(oldStoreDenied);
    boolean oldKeyDenied = false;
    try { store.getKey(alias, oldKey); } catch (UnrecoverableKeyException rejected) { oldKeyDenied = true; }
    require(oldKeyDenied);
  }
  static Prepared prepare(byte[] original, String alias, String expected, char[] oldStore,
      char[] oldKey, char[] newStore, char[] newKey) throws Exception {
    require(!Arrays.equals(oldStore, newStore) && !Arrays.equals(oldKey, newKey));
    require(newStore.length >= 40 && newKey.length >= 40 && !Arrays.equals(newStore, newKey));
    KeyStore store = load(original, oldStore);
    prove(store, alias, oldKey, expected);
    var key = store.getKey(alias, oldKey);
    var chain = store.getCertificateChain(alias);
    store.setKeyEntry(alias, key, newKey, chain);
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    store.store(buffer, newStore);
    byte[] rotated = buffer.toByteArray();
    verifyChanged(rotated, alias, expected, oldStore, oldKey, newStore, newKey);
    var newChain = load(rotated, newStore).getCertificateChain(alias);
    require(newChain.length == chain.length);
    for (int i = 0; i < chain.length; i++) require(Arrays.equals(chain[i].getEncoded(), newChain[i].getEncoded()));
    return new Prepared(rotated, alias, expected);
  }
  static String commit(StoreIO io, byte[] original, Prepared prepared, char[] oldStore,
      char[] oldKey, char[] newStore, char[] newKey) throws Exception {
    require(Arrays.equals(io.read(), original));
    try {
      io.replace(prepared.bytes());
      byte[] actual = io.read();
      try {
        require(Arrays.equals(actual, prepared.bytes()));
        verifyChanged(actual, prepared.alias(), prepared.certificate(), oldStore, oldKey, newStore, newKey);
        return digest(actual);
      } finally { Arrays.fill(actual, (byte) 0); }
    } catch (Exception writeFailure) {
      // Restore only this same open file, from encrypted bytes held in memory.
      try {
        io.replace(original);
        require(Arrays.equals(io.read(), original));
      } catch (Exception recoveryFailure) { throw new IOException("RECOVERY_REQUIRED"); }
      throw new IOException("ROLLED_BACK");
    }
  }
  static byte[] readChannel(FileChannel channel) throws Exception {
    require(channel.size() > 0 && channel.size() <= 1024 * 1024);
    ByteBuffer bytes = ByteBuffer.allocate((int) channel.size());
    channel.position(0);
    while (bytes.hasRemaining()) require(channel.read(bytes) > 0);
    return bytes.array();
  }
  static void rotate() throws Exception {
    Path file = Path.of(required("NURI_UPLOAD_STORE_FILE"));
    require(file.isAbsolute() && file.toRealPath().equals(file));
    require(!Files.isSymbolicLink(file) && Files.isRegularFile(file));
    require(Files.getPosixFilePermissions(file).equals(PosixFilePermissions.fromString("rw-------")));
    char[] oldStore = required("NURI_ROTATION_OLD_STORE_PASSWORD").toCharArray();
    char[] oldKey = required("NURI_ROTATION_OLD_KEY_PASSWORD").toCharArray();
    char[] newStore = required("NURI_UPLOAD_STORE_PASSWORD").toCharArray();
    char[] newKey = required("NURI_UPLOAD_KEY_PASSWORD").toCharArray();
    byte[] original = null;
    Prepared prepared = null;
    try (FileChannel channel = FileChannel.open(file, StandardOpenOption.READ, StandardOpenOption.WRITE);
         var lock = channel.tryLock()) {
      require(lock != null);
      original = readChannel(channel);
      require(digest(original).equals(required("NURI_ROTATION_EXPECTED_FILE_SHA256")));
      prepared = prepare(original, required("NURI_UPLOAD_KEY_ALIAS"), required("NURI_APPROVED_SIGNER_SHA256"), oldStore, oldKey, newStore, newKey);
      System.out.println("NURI_ROTATION_READY");
      System.out.flush();
      // EOF/cancellation before the secure-store readback never mutates the file.
      String command = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)).readLine();
      require("NURI_ROTATION_COMMIT".equals(command));
      StoreIO io = new StoreIO() {
        public byte[] read() throws Exception { return readChannel(channel); }
        public void replace(byte[] bytes) throws Exception {
          channel.position(0);
          ByteBuffer buffer = ByteBuffer.wrap(bytes);
          while (buffer.hasRemaining()) require(channel.write(buffer) > 0);
          channel.truncate(bytes.length);
          channel.force(true);
        }
      };
      String hash = commit(io, original, prepared, oldStore, oldKey, newStore, newKey);
      require(Files.getPosixFilePermissions(file).equals(PosixFilePermissions.fromString("rw-------")));
      System.out.println("NURI_ROTATION_COMMITTED:" + hash);
    } finally {
      for (char[] value : new char[][]{oldStore, oldKey, newStore, newKey}) Arrays.fill(value, '\0');
      if (original != null) Arrays.fill(original, (byte) 0);
      if (prepared != null) Arrays.fill(prepared.bytes(), (byte) 0);
    }
  }
  static char[] randomPassword() {
    byte[] random = new byte[32];
    new SecureRandom().nextBytes(random);
    try { return Base64.getEncoder().encodeToString(random).toCharArray(); }
    finally { Arrays.fill(random, (byte) 0); }
  }
  static void selfTest() throws Exception {
    // The repository's public Android debug fixture is read only. Nothing is created on disk.
    KeyStore debug = KeyStore.getInstance(new File(required("NURI_PUBLIC_DEBUG_FIXTURE")), "android".toCharArray());
    String alias = "androiddebugkey";
    String certificate = digest(debug.getCertificate(alias).getEncoded());
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    KeyStore memory = KeyStore.getInstance("PKCS12");
    memory.load(null, null);
    char[] oldStore = randomPassword(), oldKey = randomPassword(), newStore = randomPassword(), newKey = randomPassword();
    memory.setKeyEntry(alias, debug.getKey(alias, "android".toCharArray()), oldKey, debug.getCertificateChain(alias));
    memory.store(buffer, oldStore);
    byte[] original = buffer.toByteArray();
    Prepared prepared = prepare(original, alias, certificate, oldStore, oldKey, newStore, newKey);
    class MemoryIO implements StoreIO {
      byte[] value = original.clone(); int failures = 0; int writes = 0;
      public byte[] read() { return value.clone(); }
      public void replace(byte[] bytes) throws Exception {
        writes++;
        value = bytes.clone();
        if (failures-- > 0) throw new IOException();
      }
    }
    MemoryIO success = new MemoryIO();
    require(commit(success, original, prepared, oldStore, oldKey, newStore, newKey).equals(digest(prepared.bytes())));
    require(success.writes == 1);
    MemoryIO failure = new MemoryIO(); failure.failures = 1;
    try { commit(failure, original, prepared, oldStore, oldKey, newStore, newKey); throw new AssertionError(); }
    catch (IOException expected) { require(expected.getMessage().equals("ROLLED_BACK")); }
    require(Arrays.equals(failure.value, original) && failure.writes == 2);
    MemoryIO unrecoverable = new MemoryIO(); unrecoverable.failures = 2;
    try { commit(unrecoverable, original, prepared, oldStore, oldKey, newStore, newKey); throw new AssertionError(); }
    catch (IOException expected) { require(expected.getMessage().equals("RECOVERY_REQUIRED")); }
    MemoryIO drift = new MemoryIO(); drift.value = new byte[]{1};
    try { commit(drift, original, prepared, oldStore, oldKey, newStore, newKey); throw new AssertionError(); }
    catch (GeneralSecurityException expected) { require(drift.writes == 0); }
    try { prepare(original, alias, "0".repeat(64), oldStore, oldKey, newStore, newKey); throw new AssertionError(); }
    catch (GeneralSecurityException expected) { /* Wrong signer must stop before a file write. */ }
    try { prepare(original, alias, certificate, oldStore, oldKey, oldStore, newKey); throw new AssertionError(); }
    catch (GeneralSecurityException expected) { /* Reusing a historical credential is rejected. */ }
    for (char[] value : new char[][]{oldStore, oldKey, newStore, newKey}) Arrays.fill(value, '\0');
    Arrays.fill(original, (byte) 0); Arrays.fill(prepared.bytes(), (byte) 0);
    System.out.println("NURI_ROTATION_SELF_TEST_PASS");
  }
  public static void main(String[] args) {
    try {
      if (args.length == 1 && args[0].equals("--self-test")) selfTest();
      else if (args.length == 0) rotate();
      else throw new IllegalArgumentException();
    } catch (Throwable ignored) {
      System.out.println("NURI_ROTATION_BLOCKED");
      System.exit(2);
    }
  }
}
