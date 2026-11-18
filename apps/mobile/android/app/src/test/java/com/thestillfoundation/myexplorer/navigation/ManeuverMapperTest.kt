package com.thestillfoundation.myexplorer.navigation

import androidx.car.app.navigation.model.Maneuver as CarManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import org.junit.Assert.assertEquals
import org.junit.Test

class ManeuverMapperTest {
  @Test
  fun mapsTurnsForksRampsArrivalAndUnknownAccurately() {
    assertEquals(CarManeuver.TYPE_TURN_NORMAL_LEFT, ManeuverMapper.toCarManeuverType(SdkManeuver.TURN_LEFT))
    assertEquals(CarManeuver.TYPE_TURN_NORMAL_RIGHT, ManeuverMapper.toCarManeuverType(SdkManeuver.TURN_RIGHT))
    assertEquals(CarManeuver.TYPE_TURN_SHARP_LEFT, ManeuverMapper.toCarManeuverType(SdkManeuver.TURN_SHARP_LEFT))
    assertEquals(CarManeuver.TYPE_U_TURN_RIGHT, ManeuverMapper.toCarManeuverType(SdkManeuver.TURN_U_TURN_CLOCKWISE))
    assertEquals(CarManeuver.TYPE_FORK_LEFT, ManeuverMapper.toCarManeuverType(SdkManeuver.FORK_LEFT))
    assertEquals(CarManeuver.TYPE_FORK_RIGHT, ManeuverMapper.toCarManeuverType(SdkManeuver.FORK_RIGHT))
    assertEquals(CarManeuver.TYPE_ON_RAMP_NORMAL_LEFT, ManeuverMapper.toCarManeuverType(SdkManeuver.ON_RAMP_LEFT))
    assertEquals(CarManeuver.TYPE_OFF_RAMP_NORMAL_RIGHT, ManeuverMapper.toCarManeuverType(SdkManeuver.OFF_RAMP_RIGHT))
    assertEquals(CarManeuver.TYPE_DESTINATION, ManeuverMapper.toCarManeuverType(SdkManeuver.DESTINATION))
    assertEquals(CarManeuver.TYPE_UNKNOWN, ManeuverMapper.toCarManeuverType(SdkManeuver.UNKNOWN))
  }

  @Test
  fun mapsRoundaboutWithExitNumber() {
    val carManeuver = ManeuverMapper.toCarManeuver(
      SdkManeuver.ROUNDABOUT_LEFT_COUNTERCLOCKWISE,
      roundaboutExitNumber = 3,
    )
    assertEquals(CarManeuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW, carManeuver.type)
    assertEquals(3, carManeuver.roundaboutExitNumber)
  }
}
