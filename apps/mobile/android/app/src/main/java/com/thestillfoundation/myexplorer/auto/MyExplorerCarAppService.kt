package com.thestillfoundation.myexplorer.auto

import android.content.Intent
import androidx.car.app.CarAppService
import androidx.car.app.R as CarAppR
import androidx.car.app.Screen
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator
import com.thestillfoundation.myexplorer.BuildConfig
import com.thestillfoundation.myexplorer.navigation.NavigationSessionRepository

class MyExplorerCarAppService : CarAppService() {
  override fun onCreate() {
    super.onCreate()
    NavigationSessionRepository.init(applicationContext)
  }

  override fun createHostValidator(): HostValidator {
    return if (BuildConfig.DEBUG) {
      HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
    } else {
      HostValidator.Builder(applicationContext)
        .addAllowedHosts(CarAppR.array.hosts_allowlist_sample)
        .build()
    }
  }

  override fun onCreateSession(): Session = MyExplorerCarSession()
}

class MyExplorerCarSession : Session() {
  override fun onCreateScreen(intent: Intent): Screen {
    NavigationSessionRepository.init(carContext.applicationContext)
    return MyExplorerCarScreen(carContext)
  }
}
