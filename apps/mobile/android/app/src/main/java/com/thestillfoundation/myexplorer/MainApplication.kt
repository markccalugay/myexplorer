package com.thestillfoundation.myexplorer

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.thestillfoundation.myexplorer.navigation.NavigationPackage
import com.thestillfoundation.myexplorer.navigation.NavigationSessionRepository

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(NavigationPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    NavigationSessionRepository.init(this)
    loadReactNative(this)
  }
}
