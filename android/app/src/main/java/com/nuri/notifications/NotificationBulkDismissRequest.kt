package com.nuri.notifications

import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okio.BufferedSink

internal object NotificationBulkDismissRequest : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response =
    chain.proceed(withoutReplay(chain.request()))

  internal fun withoutReplay(request: Request): Request {
    val body = request.body ?: return request
    if (request.method != "POST" ||
      request.url.encodedPath != "/rest/v1/rpc/dismiss_all_user_notifications_v1" ||
      body.isOneShot()
    ) return request

    // A second call takes a new inbox snapshot. Do not replay a sent body
    // when the server may have committed but its response was lost.
    return request.newBuilder().method(request.method, object : RequestBody() {
      override fun contentType() = body.contentType()
      override fun contentLength() = body.contentLength()
      override fun isOneShot() = true
      override fun writeTo(sink: BufferedSink) = body.writeTo(sink)
    }).build()
  }
}
