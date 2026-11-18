package com.thestillfoundation.myexplorer.navigation

import androidx.car.app.navigation.model.Maneuver as CarManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver

/**
 * Maps Navigation SDK TurnByTurn [SdkManeuver] constants to Android for Cars
 * [CarManeuver] types without fabricating instructions or collapsing turns to straight.
 */
object ManeuverMapper {
  fun toCarManeuver(
    sdkManeuver: Int,
    roundaboutExitNumber: Int? = null,
  ): CarManeuver {
    val carType = toCarManeuverType(sdkManeuver)
    val builder = CarManeuver.Builder(carType)
    if (
      roundaboutExitNumber != null &&
      roundaboutExitNumber > 0 &&
      isRoundaboutEnterAndExit(carType)
    ) {
      builder.setRoundaboutExitNumber(roundaboutExitNumber)
    }
    return builder.build()
  }

  fun toCarManeuverType(sdkManeuver: Int): Int = when (sdkManeuver) {
    SdkManeuver.DEPART -> CarManeuver.TYPE_DEPART
    SdkManeuver.DESTINATION -> CarManeuver.TYPE_DESTINATION
    SdkManeuver.DESTINATION_LEFT -> CarManeuver.TYPE_DESTINATION_LEFT
    SdkManeuver.DESTINATION_RIGHT -> CarManeuver.TYPE_DESTINATION_RIGHT
    SdkManeuver.STRAIGHT -> CarManeuver.TYPE_STRAIGHT

    SdkManeuver.TURN_LEFT -> CarManeuver.TYPE_TURN_NORMAL_LEFT
    SdkManeuver.TURN_RIGHT -> CarManeuver.TYPE_TURN_NORMAL_RIGHT
    SdkManeuver.TURN_KEEP_LEFT -> CarManeuver.TYPE_KEEP_LEFT
    SdkManeuver.TURN_KEEP_RIGHT -> CarManeuver.TYPE_KEEP_RIGHT
    SdkManeuver.TURN_SLIGHT_LEFT -> CarManeuver.TYPE_TURN_SLIGHT_LEFT
    SdkManeuver.TURN_SLIGHT_RIGHT -> CarManeuver.TYPE_TURN_SLIGHT_RIGHT
    SdkManeuver.TURN_SHARP_LEFT -> CarManeuver.TYPE_TURN_SHARP_LEFT
    SdkManeuver.TURN_SHARP_RIGHT -> CarManeuver.TYPE_TURN_SHARP_RIGHT
    SdkManeuver.TURN_U_TURN_CLOCKWISE -> CarManeuver.TYPE_U_TURN_RIGHT
    SdkManeuver.TURN_U_TURN_COUNTERCLOCKWISE -> CarManeuver.TYPE_U_TURN_LEFT

    SdkManeuver.MERGE_UNSPECIFIED -> CarManeuver.TYPE_MERGE_SIDE_UNSPECIFIED
    SdkManeuver.MERGE_LEFT -> CarManeuver.TYPE_MERGE_LEFT
    SdkManeuver.MERGE_RIGHT -> CarManeuver.TYPE_MERGE_RIGHT

    SdkManeuver.FORK_LEFT -> CarManeuver.TYPE_FORK_LEFT
    SdkManeuver.FORK_RIGHT -> CarManeuver.TYPE_FORK_RIGHT

    SdkManeuver.ON_RAMP_UNSPECIFIED -> CarManeuver.TYPE_ON_RAMP_NORMAL_RIGHT
    SdkManeuver.ON_RAMP_LEFT -> CarManeuver.TYPE_ON_RAMP_NORMAL_LEFT
    SdkManeuver.ON_RAMP_RIGHT -> CarManeuver.TYPE_ON_RAMP_NORMAL_RIGHT
    SdkManeuver.ON_RAMP_KEEP_LEFT,
    SdkManeuver.ON_RAMP_SLIGHT_LEFT -> CarManeuver.TYPE_ON_RAMP_SLIGHT_LEFT
    SdkManeuver.ON_RAMP_KEEP_RIGHT,
    SdkManeuver.ON_RAMP_SLIGHT_RIGHT -> CarManeuver.TYPE_ON_RAMP_SLIGHT_RIGHT
    SdkManeuver.ON_RAMP_SHARP_LEFT -> CarManeuver.TYPE_ON_RAMP_SHARP_LEFT
    SdkManeuver.ON_RAMP_SHARP_RIGHT -> CarManeuver.TYPE_ON_RAMP_SHARP_RIGHT
    SdkManeuver.ON_RAMP_U_TURN_CLOCKWISE -> CarManeuver.TYPE_ON_RAMP_U_TURN_RIGHT
    SdkManeuver.ON_RAMP_U_TURN_COUNTERCLOCKWISE -> CarManeuver.TYPE_ON_RAMP_U_TURN_LEFT

    SdkManeuver.OFF_RAMP_UNSPECIFIED -> CarManeuver.TYPE_OFF_RAMP_NORMAL_RIGHT
    SdkManeuver.OFF_RAMP_LEFT,
    SdkManeuver.OFF_RAMP_KEEP_LEFT,
    SdkManeuver.OFF_RAMP_SHARP_LEFT -> CarManeuver.TYPE_OFF_RAMP_NORMAL_LEFT
    SdkManeuver.OFF_RAMP_RIGHT,
    SdkManeuver.OFF_RAMP_KEEP_RIGHT,
    SdkManeuver.OFF_RAMP_SHARP_RIGHT -> CarManeuver.TYPE_OFF_RAMP_NORMAL_RIGHT
    SdkManeuver.OFF_RAMP_SLIGHT_LEFT -> CarManeuver.TYPE_OFF_RAMP_SLIGHT_LEFT
    SdkManeuver.OFF_RAMP_SLIGHT_RIGHT -> CarManeuver.TYPE_OFF_RAMP_SLIGHT_RIGHT
    SdkManeuver.OFF_RAMP_U_TURN_CLOCKWISE -> CarManeuver.TYPE_U_TURN_RIGHT
    SdkManeuver.OFF_RAMP_U_TURN_COUNTERCLOCKWISE -> CarManeuver.TYPE_U_TURN_LEFT

    SdkManeuver.ROUNDABOUT_CLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_ENTER_CW
    SdkManeuver.ROUNDABOUT_COUNTERCLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_ENTER_CCW
    SdkManeuver.ROUNDABOUT_EXIT_CLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_EXIT_CW
    SdkManeuver.ROUNDABOUT_EXIT_COUNTERCLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_EXIT_CCW
    SdkManeuver.ROUNDABOUT_STRAIGHT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_LEFT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_RIGHT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_SLIGHT_LEFT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_SLIGHT_RIGHT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_SHARP_LEFT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_SHARP_RIGHT_CLOCKWISE,
    SdkManeuver.ROUNDABOUT_U_TURN_CLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CW
    SdkManeuver.ROUNDABOUT_STRAIGHT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_LEFT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_RIGHT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_SLIGHT_LEFT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_SLIGHT_RIGHT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_SHARP_LEFT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_SHARP_RIGHT_COUNTERCLOCKWISE,
    SdkManeuver.ROUNDABOUT_U_TURN_COUNTERCLOCKWISE -> CarManeuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW

    else -> CarManeuver.TYPE_UNKNOWN
  }

  private fun isRoundaboutEnterAndExit(carType: Int): Boolean =
    carType == CarManeuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CW ||
      carType == CarManeuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW
}
