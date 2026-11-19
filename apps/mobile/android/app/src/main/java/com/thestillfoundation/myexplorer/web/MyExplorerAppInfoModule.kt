package com.thestillfoundation.myexplorer.web

import androidx.core.content.pm.PackageInfoCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MyExplorerAppInfoModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MyExplorerAppInfo"

  @ReactMethod
  fun getAppInfo(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val pkgName = reactContext.packageName
      val info = pm.getPackageInfo(pkgName, 0)
      val map = Arguments.createMap().apply {
        putString("packageName", pkgName)
        putString("versionName", info.versionName ?: "unknown")
        putDouble("versionCode", PackageInfoCompat.getLongVersionCode(info).toDouble())
      }
      promise.resolve(map)
    } catch (t: Throwable) {
      promise.reject("APP_INFO_ERROR", t.message, t)
    }
  }
}
