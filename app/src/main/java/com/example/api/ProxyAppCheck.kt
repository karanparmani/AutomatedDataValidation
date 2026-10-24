package com.example.api

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

class AppCheckTokenException(message: String, cause: Throwable? = null) : IOException(message, cause)

// Attests that proxy requests come from the genuine app. The proxy must verify the
// X-Firebase-AppCheck header (Firebase Admin SDK) before forwarding to Gemini.
object ProxyAppCheck {
    const val HEADER = "X-Firebase-AppCheck"

    @Volatile
    var isEnabled: Boolean = false
        private set

    fun install(context: Context) {
        val app = FirebaseApp.initializeApp(context)
        if (app == null) {
            Log.w("ProxyAppCheck", "Firebase is not configured (missing google-services.json); live Gemini disabled.")
            return
        }
        FirebaseAppCheck.getInstance(app).installAppCheckProviderFactory(appCheckProviderFactory())
        isEnabled = true
    }

    val interceptor = Interceptor { chain ->
        val token = try {
            val result = Tasks.await(FirebaseAppCheck.getInstance().getAppCheckToken(false), 30, TimeUnit.SECONDS)
            result.token
        } catch (e: Exception) {
            throw AppCheckTokenException("Unable to obtain Firebase App Check token", e)
        }
        chain.proceed(chain.request().newBuilder().header(HEADER, token).build())
    }
}
