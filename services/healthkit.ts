import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Type-only imports — erased by the TypeScript / Babel pipeline so they do not
 * cause Metro to bundle the native module at runtime.
 */
import type {
  QuantityTypeIdentifier,
  QueryStatisticsResponse,
} from '@kingstinct/react-native-healthkit';

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

/** Mirror of HKAuthorizationRequestStatus so Expo Go never has to load the package. */
export const AuthorizationRequestStatus = {
  unknown: 0,
  shouldRequest: 1,
  unnecessary: 2,
} as const;
export type AuthorizationRequestStatus =
  (typeof AuthorizationRequestStatus)[keyof typeof AuthorizationRequestStatus];

const isExpoGo = Constants.appOwnership === 'expo';

let cachedModule: HealthKitModule | null = null;
let didLogStartup = false;

function logStartupOnce(enabled: boolean) {
  if (didLogStartup) return;
  didLogStartup = true;
  console.log(
    enabled
      ? 'Running in native build – HealthKit enabled'
      : 'Running in Expo Go – HealthKit disabled'
  );
}

/**
 * Lazily resolves the HealthKit module via `require()` on iOS native builds only.
 * Returns `null` in Expo Go, on Android/web, or if the package fails to load
 * (e.g. dev client built before the dependency was added).
 */
function loadHealthKitModule(): HealthKitModule | null {
  if (cachedModule) return cachedModule;
  if (Platform.OS !== 'ios' || isExpoGo) {
    logStartupOnce(false);
    return null;
  }
  try {
    cachedModule = require('@kingstinct/react-native-healthkit') as HealthKitModule;
    logStartupOnce(true);
    return cachedModule;
  } catch (e) {
    if (__DEV__) {
      console.log(
        'HealthKit not available:',
        e instanceof Error ? e.message : String(e)
      );
    }
    logStartupOnce(false);
    return null;
  }
}

/** Read-only quantity types we need for total energy expenditure. */
const ENERGY_READ_TYPES = [
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
] as const satisfies readonly QuantityTypeIdentifier[];

export type TodayEnergyResult = {
  activeKcal: number;
  basalKcal: number;
  totalKcal: number;
  /** True when both sums are zero (may mean no data or an empty day). */
  isEmpty: boolean;
};

/** True only on iOS native builds where the HealthKit module is actually linked. */
export function isHealthKitPlatform(): boolean {
  return Platform.OS === 'ios' && !isExpoGo;
}

/** Cheap probe that does not throw — useful for UI gating. */
export function isHealthKitAvailable(): boolean {
  return loadHealthKitModule() != null;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function sumKcalForInterval(
  hk: HealthKitModule,
  identifier: (typeof ENERGY_READ_TYPES)[number],
  start: Date,
  end: Date
): Promise<number> {
  const res = (await hk.queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
    filter: { date: { startDate: start, endDate: end } },
  })) as QueryStatisticsResponse;
  const q = res.sumQuantity?.quantity;
  return typeof q === 'number' && Number.isFinite(q) ? q : 0;
}

const EMPTY_TODAY: TodayEnergyResult = {
  activeKcal: 0,
  basalKcal: 0,
  totalKcal: 0,
  isEmpty: true,
};

/**
 * Active + basal energy (kcal) for the current local day. iOS native only;
 * everywhere else returns zeros without touching the native module.
 */
export async function fetchTodayEnergyBurned(): Promise<TodayEnergyResult> {
  const hk = loadHealthKitModule();
  if (!hk) return EMPTY_TODAY;
  try {
    const available = await hk.isHealthDataAvailableAsync();
    if (!available) return EMPTY_TODAY;
    const start = startOfLocalDay(new Date());
    const end = new Date();
    const [activeKcal, basalKcal] = await Promise.all([
      sumKcalForInterval(hk, 'HKQuantityTypeIdentifierActiveEnergyBurned', start, end),
      sumKcalForInterval(hk, 'HKQuantityTypeIdentifierBasalEnergyBurned', start, end),
    ]);
    const totalKcal = activeKcal + basalKcal;
    return {
      activeKcal: Math.round(activeKcal),
      basalKcal: Math.round(basalKcal),
      totalKcal: Math.round(totalKcal),
      isEmpty: totalKcal <= 0,
    };
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[HealthKit] fetchTodayEnergyBurned failed:',
        e instanceof Error ? e.message : String(e)
      );
    }
    return EMPTY_TODAY;
  }
}

/** Last 7 local calendar days, oldest → newest. Empty array of zeros if unavailable. */
export async function fetchLast7DaysTotalBurnedKcal(): Promise<number[]> {
  const hk = loadHealthKitModule();
  if (!hk) return Array(7).fill(0);
  try {
    const available = await hk.isHealthDataAvailableAsync();
    if (!available) return Array(7).fill(0);
    const out: number[] = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setDate(now.getDate() - offset);
      const start = startOfLocalDay(day);
      const isToday = offset === 0;
      const end = isToday
        ? now
        : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
      const [a, b] = await Promise.all([
        sumKcalForInterval(hk, 'HKQuantityTypeIdentifierActiveEnergyBurned', start, end),
        sumKcalForInterval(hk, 'HKQuantityTypeIdentifierBasalEnergyBurned', start, end),
      ]);
      out.push(Math.round(a + b));
    }
    return out;
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[HealthKit] fetchLast7DaysTotalBurnedKcal failed:',
        e instanceof Error ? e.message : String(e)
      );
    }
    return Array(7).fill(0);
  }
}

/**
 * Requests read access to Active + Basal energy. Returns whether the system dialog
 * completed; `false` in Expo Go or when the module is unavailable.
 */
export async function requestEnergyReadAuthorization(): Promise<boolean> {
  const hk = loadHealthKitModule();
  if (!hk) return false;
  try {
    return await hk.requestAuthorization({ toRead: [...ENERGY_READ_TYPES] });
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[HealthKit] requestAuthorization failed:',
        e instanceof Error ? e.message : String(e)
      );
    }
    return false;
  }
}

export async function getEnergyAuthRequestStatus(): Promise<AuthorizationRequestStatus> {
  const hk = loadHealthKitModule();
  if (!hk) return AuthorizationRequestStatus.unknown;
  try {
    const status = await hk.getRequestStatusForAuthorization({
      toRead: [...ENERGY_READ_TYPES],
    });
    // The native enum has the same numeric values as our local mirror.
    return status as unknown as AuthorizationRequestStatus;
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[HealthKit] getRequestStatusForAuthorization failed:',
        e instanceof Error ? e.message : String(e)
      );
    }
    return AuthorizationRequestStatus.unknown;
  }
}

export { ENERGY_READ_TYPES };
