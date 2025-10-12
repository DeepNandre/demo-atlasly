import SunCalc from 'suncalc';

/**
 * Solar position calculations using NREL SPA-equivalent algorithms
 * All angles in degrees, azimuth from North clockwise
 */

export interface SunPosition {
  azimuth: number;      // degrees from North, clockwise (0° = N, 90° = E, 180° = S, 270° = W)
  altitude: number;     // degrees above horizon
  zenith: number;       // degrees from vertical
  timestamp: Date;
}

export interface SolarAnalysisParams {
  latitude: number;
  longitude: number;
  date: Date;
  startTime?: string;   // "HH:MM" format
  endTime?: string;     // "HH:MM" format
  stepMinutes?: number; // default 15
}

/**
 * Get sun position for a specific date/time at a location
 */
export function getSunPosition(lat: number, lng: number, date: Date): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lng);
  
  // Convert SunCalc's output to our convention:
  // SunCalc azimuth: 0=South, positive=West, negative=East (radians)
  // Our azimuth: 0=North, positive=clockwise (degrees)
  let azimuth = (pos.azimuth * 180 / Math.PI) + 180; // Convert to 0=North
  if (azimuth >= 360) azimuth -= 360;
  if (azimuth < 0) azimuth += 360;
  
  const altitude = pos.altitude * 180 / Math.PI;
  const zenith = 90 - altitude;
  
  return {
    azimuth,
    altitude,
    zenith,
    timestamp: date
  };
}

/**
 * Get sun positions for a time range (e.g., daily analysis)
 */
export function getSunPath(params: SolarAnalysisParams): SunPosition[] {
  const { latitude, longitude, date, stepMinutes = 15 } = params;
  
  const positions: SunPosition[] = [];
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  // Use civil sunrise/sunset (when sun is 6° below horizon)
  let start = times.dawn;
  let end = times.dusk;
  
  // Override with user times if provided
  if (params.startTime) {
    const [h, m] = params.startTime.split(':').map(Number);
    start = new Date(date);
    start.setHours(h, m, 0, 0);
  }
  if (params.endTime) {
    const [h, m] = params.endTime.split(':').map(Number);
    end = new Date(date);
    end.setHours(h, m, 0, 0);
  }
  
  // Generate positions at step intervals
  const current = new Date(start);
  while (current <= end) {
    const pos = getSunPosition(latitude, longitude, current);
    if (pos.altitude > 0) { // Only include when sun is above horizon
      positions.push(pos);
    }
    current.setMinutes(current.getMinutes() + stepMinutes);
  }
  
  return positions;
}

/**
 * Get sun direction vector in ENU coordinates (local meters)
 * Returns normalized vector pointing FROM ground TO sun
 */
export function getSunDirectionVector(position: SunPosition): [number, number, number] {
  const azimuthRad = position.azimuth * Math.PI / 180;
  const altitudeRad = position.altitude * Math.PI / 180;
  
  // ENU: X=East, Y=North, Z=Up
  const x = Math.sin(azimuthRad) * Math.cos(altitudeRad);  // East component
  const y = Math.cos(azimuthRad) * Math.cos(altitudeRad);  // North component
  const z = Math.sin(altitudeRad);                         // Up component
  
  return [x, y, z];
}

/**
 * Get solar times for a specific date
 */
export function getSolarTimes(lat: number, lng: number, date: Date) {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,
    dawn: times.dawn,
    dusk: times.dusk,
    goldenHour: times.goldenHour,
    goldenHourEnd: times.goldenHourEnd
  };
}

/**
 * Preset dates for common analysis scenarios
 */
export function getPresetDate(preset: 'summer' | 'winter' | 'spring' | 'fall', year?: number): Date {
  const y = year || new Date().getFullYear();
  
  switch (preset) {
    case 'summer':
      return new Date(y, 5, 21); // June 21 - Summer solstice
    case 'winter':
      return new Date(y, 11, 21); // December 21 - Winter solstice
    case 'spring':
      return new Date(y, 2, 20); // March 20 - Spring equinox
    case 'fall':
      return new Date(y, 8, 22); // September 22 - Fall equinox
  }
}

/**
 * Check if a facade normal is illuminated by the sun
 * Returns true if sun is hitting the facade (dot product > 0)
 */
export function isFacadeIlluminated(
  facadeNormal: [number, number, number],
  sunDirection: [number, number, number],
  grazingAngleDeg: number = 85
): boolean {
  // Normalize vectors
  const normalizeFn = (v: [number, number, number]) => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len] as [number, number, number];
  };
  
  const fn = normalizeFn(facadeNormal);
  const sd = normalizeFn(sunDirection);
  
  const dot = fn[0] * sd[0] + fn[1] * sd[1] + fn[2] * sd[2];
  const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  
  return dot > 0 && angleDeg < grazingAngleDeg;
}
