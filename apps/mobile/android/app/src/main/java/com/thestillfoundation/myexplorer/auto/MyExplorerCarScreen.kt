package com.thestillfoundation.myexplorer.auto

import android.app.Application
import android.app.Presentation
import android.content.Context
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import androidx.car.app.AppManager
import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.SurfaceCallback
import androidx.car.app.SurfaceContainer
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarColor
import androidx.car.app.model.DateTimeWithZone
import androidx.car.app.model.Distance
import androidx.car.app.model.MessageTemplate
import androidx.car.app.model.Template
import androidx.car.app.navigation.NavigationManager
import androidx.car.app.navigation.NavigationManagerCallback
import androidx.car.app.navigation.model.NavigationTemplate
import androidx.car.app.navigation.model.RoutingInfo
import androidx.car.app.navigation.model.Step
import androidx.car.app.navigation.model.TravelEstimate
import androidx.core.content.ContextCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.google.android.gms.maps.GoogleMap
import com.google.android.libraries.navigation.NavigationViewForAuto
import com.thestillfoundation.myexplorer.navigation.AndroidMainThreadDispatcher
import com.thestillfoundation.myexplorer.navigation.ManeuverMapper
import com.thestillfoundation.myexplorer.navigation.NavigationController
import com.thestillfoundation.myexplorer.navigation.NavigationSessionRepository
import com.thestillfoundation.myexplorer.navigation.NavigationSessionSnapshot
import com.thestillfoundation.myexplorer.navigation.NavigationSessionStatus
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Android Auto navigation screen bound to the phone-owned [NavigationSessionRepository],
 * rendering Navigation SDK's [NavigationViewForAuto] on the projected surface and
 * coordinating with [NavigationManager].
 */
class MyExplorerCarScreen(carContext: CarContext) : Screen(carContext) {
  private val navigationManager: NavigationManager by lazy {
    carContext.getCarService(NavigationManager::class.java)
  }

  private var virtualDisplay: VirtualDisplay? = null
  private var presentation: Presentation? = null
  private var navViewForAuto: NavigationViewForAuto? = null
  private var autoMap: GoogleMap? = null
  private var latestStableArea: Rect? = null

  private val hostCoordinator = CarHostUpdateCoordinator(
    mainDispatcher = AndroidMainThreadDispatcher,
    onNavigationStarted = { navigationManager.navigationStarted() },
    onNavigationEnded = { navigationManager.navigationEnded() },
    onInvalidateScreen = { invalidate() },
  )

  private val sessionListener: (NavigationSessionSnapshot) -> Unit = { snapshot ->
    hostCoordinator.onSnapshotChanged(snapshot)
  }

  private val surfaceCallback = object : SurfaceCallback {
    override fun onSurfaceAvailable(surfaceContainer: SurfaceContainer) {
      val surface = surfaceContainer.surface ?: return
      if (!surface.isValid) return

      teardownCarSurface()

      val displayManager =
        carContext.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
      val vd = displayManager.createVirtualDisplay(
        "MyExplorerCarDisplay",
        surfaceContainer.width.coerceAtLeast(1),
        surfaceContainer.height.coerceAtLeast(1),
        surfaceContainer.dpi.coerceAtLeast(160),
        surface,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY,
      )
      virtualDisplay = vd

      val pres = Presentation(carContext, vd.display)
      val autoView = NavigationViewForAuto(carContext)
      pres.setContentView(autoView)
      autoView.onCreate(null)
      autoView.onStart()
      autoView.onResume()
      pres.show()

      presentation = pres
      navViewForAuto = autoView

      autoView.getMapAsync { googleMap ->
        autoMap = googleMap
        if (NavigationController.hasPreciseLocationPermission(carContext)) {
          runCatching { googleMap.isMyLocationEnabled = true }
          runCatching { googleMap.followMyLocation(GoogleMap.CameraPerspective.TILTED) }
        }
        latestStableArea?.let { applyMapPadding(googleMap, it, surfaceContainer.width, surfaceContainer.height) }
      }
    }

    override fun onVisibleAreaChanged(visibleArea: Rect) {
      latestStableArea = visibleArea
    }

    override fun onStableAreaChanged(stableArea: Rect) {
      latestStableArea = stableArea
      val map = autoMap ?: return
      val vd = virtualDisplay ?: return
      val metrics = vd.display
      val width = metrics.width
      val height = metrics.height
      applyMapPadding(map, stableArea, width, height)
    }

    override fun onSurfaceDestroyed(surfaceContainer: SurfaceContainer) {
      teardownCarSurface()
    }
  }

  init {
    lifecycle.addObserver(object : DefaultLifecycleObserver {
      override fun onStart(owner: LifecycleOwner) {
        navigationManager.setNavigationManagerCallback(
          ContextCompat.getMainExecutor(carContext),
          object : NavigationManagerCallback {
            override fun onStopNavigation() {
              // Car host requested stopping navigation; propagate to phone-owned session.
              NavigationController.stopNavigation(carContext.applicationContext)
            }
          },
        )
        NavigationSessionRepository.addListener(sessionListener)
        carContext.getCarService(AppManager::class.java).setSurfaceCallback(surfaceCallback)
        hostCoordinator.onScreenStarted(NavigationSessionRepository.snapshot())
      }

      override fun onStop(owner: LifecycleOwner) {
        // Projection disconnect / screen stop must NOT end phone navigation.
        hostCoordinator.onScreenStopped()
        NavigationSessionRepository.removeListener(sessionListener)
        navigationManager.clearNavigationManagerCallback()
        teardownCarSurface()
      }
    })
  }

  override fun onGetTemplate(): Template {
    val snapshot = NavigationSessionRepository.snapshot()
    return when (snapshot.status) {
      NavigationSessionStatus.ACTIVE,
      NavigationSessionStatus.PREPARING,
      NavigationSessionStatus.PAUSED,
      NavigationSessionStatus.RECONNECTING -> buildNavigationTemplate(snapshot)
      else -> buildIdleTemplate(snapshot)
    }
  }

  private fun applyMapPadding(map: GoogleMap, stableArea: Rect, width: Int, height: Int) {
    if (width <= 0 || height <= 0) return
    val left = stableArea.left.coerceAtLeast(0)
    val top = stableArea.top.coerceAtLeast(0)
    val right = (width - stableArea.right).coerceAtLeast(0)
    val bottom = (height - stableArea.bottom).coerceAtLeast(0)
    runCatching { map.setPadding(left, top, right, bottom) }
  }

  private fun teardownCarSurface() {
    autoMap = null
    runCatching {
      navViewForAuto?.onPause()
      navViewForAuto?.onStop()
      navViewForAuto?.onDestroy()
    }
    navViewForAuto = null
    runCatching { presentation?.dismiss() }
    presentation = null
    runCatching { virtualDisplay?.release() }
    virtualDisplay = null
  }

  private fun buildIdleTemplate(snapshot: NavigationSessionSnapshot): Template {
    val message = when (snapshot.status) {
      NavigationSessionStatus.COMPLETED -> "You have arrived at your destination."
      else -> "Select or start a trip on your phone to begin turn-by-turn navigation."
    }
    return MessageTemplate.Builder(message)
      .setHeaderAction(Action.APP_ICON)
      .build()
  }

  private fun buildNavigationTemplate(snapshot: NavigationSessionSnapshot): Template {
    val routingInfo = if (snapshot.isRerouting || snapshot.nextInstructionText.isBlank()) {
      RoutingInfo.Builder().setLoading(true).build()
    } else {
      val maneuver = ManeuverMapper.toCarManeuver(
        snapshot.maneuverCode,
        snapshot.roundaboutExitNumber,
      )
      val step = Step.Builder(snapshot.nextInstructionText)
        .setManeuver(maneuver)
        .apply {
          if (snapshot.nextRoadName.isNotBlank()) {
            setRoad(snapshot.nextRoadName)
          }
        }
        .build()
      RoutingInfo.Builder()
        .setCurrentStep(step, toCarDistance(snapshot.stepDistanceMeters.coerceAtLeast(0)))
        .build()
    }

    val remainingDistance = toCarDistance(snapshot.remainingDistanceMeters.coerceAtLeast(0))
    val remainingSeconds = snapshot.remainingDurationSeconds.coerceAtLeast(0).toLong()
    val etaMillis = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(remainingSeconds)
    val arrivalTime = DateTimeWithZone.create(etaMillis, TimeZone.getDefault())
    val estimate = TravelEstimate.Builder(remainingDistance, arrivalTime)
      .setRemainingTimeSeconds(remainingSeconds)
      .setRemainingTimeColor(CarColor.GREEN)
      .build()

    val toggleAction = if (snapshot.status == NavigationSessionStatus.PAUSED) {
      Action.Builder()
        .setTitle("Resume")
        .setOnClickListener {
          val app = carContext.applicationContext as Application
          NavigationController.resumeNavigation(app, null)
        }
        .build()
    } else {
      Action.Builder()
        .setTitle("Pause")
        .setOnClickListener {
          NavigationController.pauseNavigation(carContext.applicationContext)
        }
        .build()
    }

    val stopAction = Action.Builder()
      .setTitle("End")
      .setOnClickListener {
        NavigationController.stopNavigation(carContext.applicationContext)
      }
      .build()

    val actionStrip = ActionStrip.Builder()
      .addAction(toggleAction)
      .addAction(stopAction)
      .build()

    return NavigationTemplate.Builder()
      .setNavigationInfo(routingInfo)
      .setDestinationTravelEstimate(estimate)
      .setActionStrip(actionStrip)
      .setBackgroundColor(CarColor.createCustom(0xFF0B1D35.toInt(), 0xFF0B1D35.toInt()))
      .build()
  }

  private fun toCarDistance(meters: Int): Distance {
    return if (meters >= 1000) {
      Distance.create(meters / 1000.0, Distance.UNIT_KILOMETERS)
    } else {
      Distance.create(meters.toDouble(), Distance.UNIT_METERS)
    }
  }
}
