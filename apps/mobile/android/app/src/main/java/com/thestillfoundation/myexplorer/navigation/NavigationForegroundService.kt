package com.thestillfoundation.myexplorer.navigation

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import androidx.core.app.NotificationCompat
import com.google.android.libraries.mapsplatform.turnbyturn.TurnByTurnManager
import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import com.thestillfoundation.myexplorer.MainActivity
import com.thestillfoundation.myexplorer.R

/**
 * Binding-scoped TurnByTurn feed receiver that captures [boundFeedGeneration] at
 * registration/bind time so messages from an older route binding cannot mutate a
 * newer active session.
 */
internal class BoundFeedReceiver(
  private val boundFeedGeneration: Long,
) {
  fun onNavInfo(
    navState: Int,
    instructionText: String?,
    roadName: String?,
    maneuverCode: Int,
    roundaboutExitNumber: Int?,
    stepDistanceMeters: Int?,
    nextDestDistanceMeters: Int?,
    nextDestTimeSeconds: Int?,
    finalDestDistanceMeters: Int?,
    finalDestTimeSeconds: Int?,
  ): NavigationSessionSnapshot = NavigationSessionRepository.applyNavInfoForFeedGeneration(
    boundFeedGeneration = boundFeedGeneration,
    navState = navState,
    instructionText = instructionText,
    roadName = roadName,
    maneuverCode = maneuverCode,
    roundaboutExitNumber = roundaboutExitNumber,
    stepDistanceMeters = stepDistanceMeters,
    nextDestDistanceMeters = nextDestDistanceMeters,
    nextDestTimeSeconds = nextDestTimeSeconds,
    finalDestDistanceMeters = finalDestDistanceMeters,
    finalDestTimeSeconds = finalDestTimeSeconds,
  )
}

/**
 * Foreground location service keeping the phone-owned navigation session alive
 * while the app is backgrounded or projecting to Android Auto, and receiving
 * TurnByTurn [TurnByTurnManager.MSG_NAV_INFO] updates.
 */
class NavigationForegroundService : Service() {
  private val turnByTurnManager by lazy { TurnByTurnManager.createInstance() }

  override fun onBind(intent: Intent?): IBinder {
    val boundFeedGen = NavigationSessionRepository.currentFeedGeneration()
    val receiver = BoundFeedReceiver(boundFeedGen)
    val messenger = Messenger(object : Handler(Looper.getMainLooper()) {
      override fun handleMessage(msg: Message) {
        if (msg.what == TurnByTurnManager.MSG_NAV_INFO) {
          val navInfo = turnByTurnManager.readNavInfoFromBundle(msg.data) ?: return
          val step = navInfo.currentStep
          receiver.onNavInfo(
            navState = navInfo.navState,
            instructionText = step?.fullInstructionText,
            roadName = step?.fullRoadName,
            maneuverCode = step?.maneuver ?: SdkManeuver.UNKNOWN,
            roundaboutExitNumber = step?.roundaboutTurnNumber,
            stepDistanceMeters = navInfo.distanceToCurrentStepMeters,
            nextDestDistanceMeters = navInfo.distanceToNextDestinationMeters ?: navInfo.distanceToDestinationMeters,
            nextDestTimeSeconds = navInfo.timeToNextDestinationSeconds ?: navInfo.timeToDestinationSeconds,
            finalDestDistanceMeters = navInfo.distanceToFinalDestinationMeters,
            finalDestTimeSeconds = navInfo.timeToFinalDestinationSeconds,
          )
        } else {
          super.handleMessage(msg)
        }
      }
    })
    return messenger.binder
  }

  override fun onUnbind(intent: Intent?): Boolean = false

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val snapshot = NavigationSessionRepository.snapshot()
    if (!snapshot.status.isRunnable()) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val notification = buildNotification(snapshot)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    return START_NOT_STICKY
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java)
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Turn-by-turn navigation",
        NotificationManager.IMPORTANCE_LOW,
      )
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(snapshot: NavigationSessionSnapshot): Notification {
    val openIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val title = snapshot.tripName.ifBlank { "MyExplorer Navigation" }
    val text = when {
      snapshot.isRerouting -> "Rerouting..."
      snapshot.nextInstructionText.isNotBlank() -> snapshot.nextInstructionText
      else -> "Active turn-by-turn guidance"
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(text)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "myexplorer_navigation_channel"
    private const val NOTIFICATION_ID = 7201
    private const val ACTION_START = "com.thestillfoundation.myexplorer.action.START_NAV_SERVICE"
    private const val ACTION_STOP = "com.thestillfoundation.myexplorer.action.STOP_NAV_SERVICE"

    fun start(context: Context): Result<Unit> = runCatching {
      val intent = Intent(context, NavigationForegroundService::class.java).apply {
        action = ACTION_START
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      val intent = Intent(context, NavigationForegroundService::class.java).apply {
        action = ACTION_STOP
      }
      runCatching { context.startService(intent) }
    }
  }
}
