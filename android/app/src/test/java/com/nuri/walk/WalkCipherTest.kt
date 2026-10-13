package com.nuri.walk

import org.junit.Assert.*
import org.junit.Test
import javax.crypto.KeyGenerator

class WalkCipherTest {
  private fun key() = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
  @Test fun authenticatedEncryptionRoundtripAndNonceUniqueness() {
    val cipher = WalkCipher { keyValue }
    val aad = WalkCipher.aad("fixture", "point", 0)
    val plain = byteArrayOf(1, 2, 3, 4, 5)
    val nonces = mutableSetOf<String>()
    repeat(100) {
      val sealed = cipher.encrypt(plain, aad)
      assertTrue(cipher.decrypt(sealed, aad).contentEquals(plain))
      assertEquals(12, sealed.nonce.size)
      assertTrue(nonces.add(sealed.nonce.joinToString()))
    }
  }
  private val keyValue = key()
  @Test fun wrongKeyWrongSessionWrongAadTamperAndTruncationAllDeny() {
    val cipher = WalkCipher { keyValue }
    val aad = WalkCipher.aad("fixture", "point", 0)
    val sealed = cipher.encrypt(byteArrayOf(1, 2, 3), aad)
    val cases = listOf(
      Triple(WalkCipher { key() }, sealed, aad),
      Triple(cipher, sealed, WalkCipher.aad("another", "point", 0)),
      Triple(cipher, sealed, WalkCipher.aad("fixture", "point", 1)),
      Triple(cipher, sealed.copy(ciphertext = sealed.ciphertext.clone().also { it[0] = (it[0].toInt() xor 1).toByte() }), aad),
      Triple(cipher, sealed.copy(ciphertext = byteArrayOf()), aad),
    )
    for ((c, bytes, binding) in cases) {
      try { c.decrypt(bytes, binding); fail("Expected authenticated rejection") }
      catch (error: WalkFailure) { assertEquals("WALK_LOCAL_ENCRYPTION_ERROR", error.code) }
    }
  }
  @Test fun keyFailureHasNoPlaintextFallback() {
    val cipher = WalkCipher { throw WalkFailure("WALK_LOCAL_KEY_INVALIDATED") }
    try { cipher.encrypt(byteArrayOf(1), byteArrayOf(2)); fail("Expected key failure") }
    catch (error: WalkFailure) { assertEquals("WALK_LOCAL_KEY_INVALIDATED", error.code) }
  }
}
