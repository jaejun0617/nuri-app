package com.nuri.walk

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

object WalkKeyStore {
  private const val ALIAS = "nuri_walk_location_v1"
  @Synchronized fun key(allowCreate: Boolean = true): SecretKey {
    try {
      val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      if (store.containsAlias(ALIAS)) return store.getKey(ALIAS, null) as? SecretKey
        ?: throw WalkFailure("WALK_LOCAL_KEY_INVALIDATED")
      if (!allowCreate) throw WalkFailure("WALK_LOCAL_KEY_INVALIDATED")
      return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
        init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
          .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setRandomizedEncryptionRequired(true).build())
      }.generateKey()
    } catch (_: KeyPermanentlyInvalidatedException) { throw WalkFailure("WALK_LOCAL_KEY_INVALIDATED") }
    catch (error: WalkFailure) { throw error }
    catch (_: Exception) { throw WalkFailure("WALK_LOCAL_ENCRYPTION_ERROR") }
  }
}
