// Parse "HH:MM" to minutes since midnight
export function hmToMinutes(hm){ const [h,m]=hm.split(":").map(Number); return h*60+m; }

// Does [aStart,aEnd) overlap [bStart,bEnd)?
export function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && bStart < aEnd; }

// Day key from Date
export function dayKey(d){ return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()]; }
