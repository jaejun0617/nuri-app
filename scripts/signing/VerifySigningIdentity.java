import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.util.Arrays;
import java.util.HexFormat;

// A memory-only signing challenge verifies both passwords and the approved certificate.
// No keystore write, private-key encoding/export, or generated signing identity exists here.
class VerifySigningIdentity {
  public static void main(String[] args) {
    char[] storePassword = null;
    char[] keyPassword = null;
    int status = 0;
    try {
      storePassword = required("NURI_UPLOAD_STORE_PASSWORD").toCharArray();
      keyPassword = required("NURI_UPLOAD_KEY_PASSWORD").toCharArray();
      KeyStore store = KeyStore.getInstance(new File(required("NURI_UPLOAD_STORE_FILE")), storePassword);
      String alias = required("NURI_UPLOAD_KEY_ALIAS");
      if (!store.isKeyEntry(alias)) throw new IllegalStateException();
      var certificate = store.getCertificate(alias);
      String actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded()));
      if (!actual.equalsIgnoreCase(required("NURI_APPROVED_SIGNER_SHA256"))) throw new IllegalStateException();
      var key = store.getKey(alias, keyPassword);
      if (!(key instanceof PrivateKey)) throw new IllegalStateException();
      String algorithm = switch (key.getAlgorithm()) {
        case "RSA" -> "SHA256withRSA";
        case "EC" -> "SHA256withECDSA";
        case "DSA" -> "SHA256withDSA";
        default -> throw new IllegalStateException();
      };
      byte[] challenge = "NURI signing readiness only; not a release artifact".getBytes(StandardCharsets.UTF_8);
      Signature signer = Signature.getInstance(algorithm);
      signer.initSign((PrivateKey) key);
      signer.update(challenge);
      byte[] proof = signer.sign();
      signer.initVerify(certificate);
      signer.update(challenge);
      if (!signer.verify(proof)) throw new IllegalStateException();
      Arrays.fill(proof, (byte) 0);
      System.out.println("NURI_SIGNING_IDENTITY_VERIFIED");
    } catch (Exception ignored) {
      status = 2;
    } finally {
      if (storePassword != null) Arrays.fill(storePassword, '\0');
      if (keyPassword != null) Arrays.fill(keyPassword, '\0');
    }
    System.exit(status);
  }

  private static String required(String name) {
    String value = System.getenv(name);
    if (value == null || value.isEmpty()) throw new IllegalStateException();
    return value;
  }
}
