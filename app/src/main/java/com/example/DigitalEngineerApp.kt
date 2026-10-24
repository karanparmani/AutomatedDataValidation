package com.example

import android.app.Application
import com.example.api.ProxyAppCheck

class DigitalEngineerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ProxyAppCheck.install(this)
    }
}
