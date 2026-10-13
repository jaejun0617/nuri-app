package com.nuri.walk

import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class WalkSealedBytes(val nonce: ByteArray, val ciphertext: ByteArray)

class WalkCipher(private val key: () -> SecretKey) {
  fun encrypt(plain: ByteArray, aad: ByteArray): WalkSealedBytes {
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, key())
      cipher.updateAAD(aad)
      return WalkSealedBytes(cipher.iv, cipher.doFinal(plain))
    } catch (error: WalkFailure) { throw error }
    catch (_: Exception) { throw WalkFailure("WALK_LOCAL_ENCRYPTION_ERROR") }
  }
  fun decrypt(sealed: WalkSealedBytes, aad: ByteArray): ByteArray {
    if (sealed.nonce.size != 12 || sealed.ciphertext.size < 16) throw WalkFailure("WALK_LOCAL_ENCRYPTION_ERROR")
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, sealed.nonce))
      cipher.updateAAD(aad)
      return cipher.doFinal(sealed.ciphertext)
    } catch (error: WalkFailure) { throw error }
    catch (_: Exception) { throw WalkFailure("WALK_LOCAL_ENCRYPTION_ERROR") }
  }
  companion object {
    fun aad(session: String, entity: String, revisionOrIndex: Long) =
      "NURI_WALK:1:$session:$entity:$revisionOrIndex".toByteArray(Charsets.UTF_8)
  }
}
