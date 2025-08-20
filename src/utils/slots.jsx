import { hmToMinutes, dayKey, overlaps } from "./schedule";

// Build slots for a given date given availability {start:"HH:MM", end:"HH:MM"} and slotMinutes
export function buildSlotsForDay(date, availability, slotMinutes=30) {
  if (!availability?.enabled) return [];
  const base = new Date(date); base.setHours(0,0,0,0);
  const startM = hmToMinutes(availability.start);
  const endM = hmToMinutes(availability.end);
  const slots = [];
  for (let m = startM; m + slotMinutes <= endM; m += slotMinutes) {
    const s = new Date(base.getTime() + m*60000);
    const e = new Date(base.getTime() + (m+slotMinutes)*60000);
    slots.push({ start:s, end:e });
  }
  return slots;
}

// Remove slots that overlap existing appts
export function removeConflicts(slots, appts) {
  return slots.filter(sl => {
    const s = Math.floor(sl.start.getTime()/1000);
    const e = Math.floor(sl.end.getTime()/1000);
    return !appts.some(a => {
      if (!a.startsAt?.seconds || !a.endsAt?.seconds) return false;
      if (a.status==="cancelled" || a.status==="no_show") return false;
      return overlaps(s, e, a.startsAt.seconds, a.endsAt.seconds);
    });
  });
}
