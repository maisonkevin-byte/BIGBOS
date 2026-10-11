window.ATLAS_SRS=(()=>{/**
 * SM-2 (Anki-flavored) spaced-repetition scheduler.
 *
 * Pure function: given the current SRS state of a card and a user grade,
 * returns the next SRS state. No I/O, no Date.now() side effects.
 *
 * Grade scale (0–3):
 *   0 = Again (raté)
 *   1 = Hard (péniblement)
 *   2 = Good (correct)
 *   3 = Easy (instantané)
 */

                                  

                           
               
                       
                      
                 
 

const INITIAL_STATE           = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const MAX_INTERVAL = 180; // 6 months cap

function clamp(v        , lo        , hi        ) {
  return Math.max(lo, Math.min(hi, v));
}

function schedule(prev          , grade       )           {
  // Again — reset
  if (grade === 0) {
    return {
      ease: clamp(prev.ease - 0.2, MIN_EASE, MAX_EASE),
      intervalDays: 1,
      repetitions: 0,
      lapses: prev.lapses + 1,
    };
  }

  let nextInterval        ;
  let nextEase = prev.ease;

  if (prev.repetitions === 0) {
    nextInterval = grade === 1 ? 1 : grade === 2 ? 2 : 4;
  } else if (prev.repetitions === 1) {
    nextInterval = grade === 1 ? 3 : grade === 2 ? 6 : 10;
  } else {
    const mult = grade === 1 ? 1.2 : grade === 2 ? prev.ease : prev.ease * 1.3;
    nextInterval = Math.round(prev.intervalDays * mult);
  }

  if (grade === 1) nextEase -= 0.15;
  else if (grade === 3) nextEase += 0.15;
  // grade === 2 → ease unchanged

  return {
    ease: clamp(Number(nextEase.toFixed(2)), MIN_EASE, MAX_EASE),
    intervalDays: clamp(nextInterval, 1, MAX_INTERVAL),
    repetitions: prev.repetitions + 1,
    lapses: prev.lapses,
  };
}

/** Convert intervalDays → next due date (YYYY-MM-DD, UTC). */
function nextDueDate(intervalDays        , fromISO         )         {
  const base = fromISO ? new Date(fromISO) : new Date();
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + Math.max(1, intervalDays));
  return d.toISOString().slice(0, 10);
}

/** Human label for the next interval (FR). */
function intervalLabel(days        )         {
  if (days <= 1) return "demain";
  if (days < 30) return `${days} j`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${(days / 365).toFixed(1)} an`;
}

;return {schedule,INITIAL_STATE,intervalLabel};})();