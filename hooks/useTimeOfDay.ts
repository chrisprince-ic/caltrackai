import { useEffect, useState } from 'react';

/** Segment used for time-of-day visuals (greeting flair). */
export type TimeOfDaySegment = 'morning' | 'midday' | 'evening' | 'night';

export function getTimeOfDaySegment(date = new Date()): TimeOfDaySegment {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'midday';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function useTimeOfDay(): TimeOfDaySegment {
  const [seg, setSeg] = useState(() => getTimeOfDaySegment());
  useEffect(() => {
    const id = setInterval(() => setSeg(getTimeOfDaySegment()), 60_000);
    return () => clearInterval(id);
  }, []);
  return seg;
}
