package com.nuri.notifications

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okio.Buffer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationBulkDismissRequestTest {
  private val path = "https://example.test/rest/v1/rpc/dismiss_all_user_notifications_v1"
  private val json = "{}".toRequestBody("application/json".toMediaType())

  @Test
  fun bulkPostUsesOneShotBodyAndPreservesTheRequest() {
    val original = Request.Builder().url(path).post(json).header("Accept", "application/json").build()
    val request = NotificationBulkDismissRequest.withoutReplay(original)
    val body = requireNotNull(request.body)
    assertTrue(body.isOneShot())
    assertEquals(original.url, request.url)
    assertEquals(original.method, request.method)
    assertEquals(original.headers, request.headers)
    assertEquals(json.contentLength(), body.contentLength())
    assertEquals(json.contentType(), body.contentType())
    val buffer = Buffer()
    body.writeTo(buffer)
    assertEquals("{}", buffer.readUtf8())
  }

  @Test
  fun otherMethodsAndRpcRequestsKeepTheirOriginalTransport() {
    val get = Request.Builder().url(path).build()
    val lookup = Request.Builder().url(path.replace("dismiss_all", "get")).post(json).build()
    val single = Request.Builder().url(path.replace("dismiss_all_user_notifications", "dismiss_user_notification")).post(json).build()
    for (request in listOf(get, lookup, single)) {
      assertSame(request, NotificationBulkDismissRequest.withoutReplay(request))
    }
  }
}
