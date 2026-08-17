import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { TabBar, TAB_SPRING } from './components/TabBar';
import { Today } from './screens/Today';
import { Discover } from './screens/Discover';
import { You } from './screens/You';
import { Auth } from './screens/Auth';
import { CatchUp } from './screens/CatchUp';
import {
  fetchOnboardedAt,
  getDosesForDate,
  hasSchedule,
  markOnboardedRemote,
  getMissedSince,
  setDoseTaken,
  skipDose,
  touchLastOpened,
  type Dose,
} from './lib/api';
import { Onboarding } from './onboarding/Onboarding';
import { hasOnboarded, markOnboarded } from './onboarding/store';
import { useAuth } from './lib/auth';
import { usePrefs } from './lib/prefs';
import { SheetPortalProvider } from './lib/sheetPortal';
import { ActiveTabProvider, GoToTabProvider } from './lib/activeTab';
import { EntitlementProvider } from './lib/entitlements';
import { onBlockRequested, registerNotificationRouter } from './lib/notificationRouter';
import { registerNotificationActions, syncScheduleNotifications } from './lib/notifications';
import { enqueueMark, flushQueue } from './lib/doseQueue';
import { markShown, shownToday } from './lib/catchup';

/** Commit to an axis inside the first 10px and never revisit it. */
const AXIS_THRESHOLD = 10;
/** Past either end the finger only moves the track a third as far. */
const RUBBER = 0.35;

export default function App() {
  const isTouch = useTouch();

  /* Only the desktop phone-box draws a status bar. On a device there is
     already one above the web view — the OS's when installed, Safari's when
     not — and drawing a second one is what put a band of dead space above
     every title. */
  if (isTouch) return <Body framed={false} />;
  return (
    <div className="frame-host">
      <div className="frame">
        <Body framed />
      </div>
    </div>
  );
}

function Body({ framed }: { framed: boolean }) {
  const { loading, session } = useAuth();
  /* Onboarding owns the account creation, so it runs before the auth gate
     rather than behind it. Once finished it is never shown again on this
     device unless localStorage is cleared. */
  /* Keyed to the account, not the browser. This read a single unscoped flag,
     so completing onboarding once meant every account that ever signed in on
     the device skipped it and landed on a Today screen built from the first
     person's answers. With no session there is nobody to have onboarded, so the
     flow always runs — which is also what a brand new install should do. */
  const userId = session?.user?.id ?? null;
  const [onboarded, setOnboarded] = useState(() => hasOnboarded(null));

  /* ── notifications, wired once and outside every screen ─────────────────
     The action types have to be declared before anything is scheduled, or the
     banner carries no buttons. The router has to outlive every component,
     because the tap that matters most arrives when nothing is mounted. Both
     read the user through a getter rather than a captured value, so a tap
     handled an hour from now sees whoever is signed in then. */
  const userRef = useRef<string | null>(userId);
  userRef.current = userId;
  useEffect(() => {
    registerNotificationActions();
    registerNotificationRouter(() => userRef.current);
  }, []);

  /* Doses marked from the lock screen that never reached the server. Flushed
     when a session appears rather than at module load, because the write needs
     an authenticated client. */
  useEffect(() => {
    if (!userId) return;
    flushQueue(userId).then((sent) => {
      if (sent > 0) syncScheduleNotifications(userId);
    });
  }, [userId]);

  /* `schedule: { on: { hour, minute }, repeats: true }` is device-local, which
     is right — but iOS does not move an already-scheduled notification when the
     phone crosses a timezone. Re-syncing on foreground is what corrects that.
     `visibilitychange` rather than @capacitor/app's appStateChange: it fires in
     the WebView on resume, and it costs no new dependency. */
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncScheduleNotifications(userId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId]);

  useEffect(() => {
    /* The cache first, so a returning user does not see the flow flash before
       the round trip lands. Then the column, which is the source of truth and
       the only thing that knows about other devices. `undefined` means we could
       not tell — offline, or 0035 not applied — and the cache stands. */
    setOnboarded(hasOnboarded(userId));
    if (!userId) return;
    let live = true;
    fetchOnboardedAt(userId).then(async (at) => {
      if (!live) return;
      if (at) {
        setOnboarded(true);
        markOnboarded(userId);
        return;
      }
      /* Two cases fall through to here and both need the same answer.
         `null` is "the column says no", which is wrong for every account that
         finished onboarding before 0035 added it. `undefined` is "could not
         tell" — offline, or, as `supabase migration list` confirms today,
         0035 not applied at all, so selecting the column errors. This used to
         return early on `undefined`, which meant the fallback never ran against
         the actual production database. A schedule is evidence they finished. */
      const built = await hasSchedule(userId).catch(() => false);
      if (!live || !built) return;
      setOnboarded(true);
      markOnboarded(userId);
      markOnboardedRemote().catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (loading) return <div className="app splash" />;
  if (!onboarded) return <Onboarding onFinished={() => setOnboarded(true)} />;
  if (!session) return <AuthScreen framed={framed} />;
  return (
    <EntitlementProvider>
      <CatchUpGate framed={framed} />
    </EntitlementProvider>
  );
}

/**
 * The catch-up screen, before the app.
 *
 * Fires when a scheduled dose came due while the app was closed and is still
 * unmarked. `touchLastOpened` stamps this open and returns the previous one in
 * a single round trip, so two launches cannot race each other into consuming
 * the same window.
 *
 * A null previous open means a first launch on this device, and never fires —
 * somebody installing the app must not be told they missed a week.
 */
function CatchUpGate({ framed }: { framed: boolean }) {
  const { user } = useAuth();
  const [missed, setMissed] = useState<Dose[] | null>(null);
  const [checked, setChecked] = useState(false);

  /**
   * The window is consumed by whoever calls first, so it must be called once.
   *
   * StrictMode runs every effect twice in development — mount, cleanup, mount.
   * Both passes called `touchLastOpened()`. The first stamped `last_opened_at`
   * and returned the real previous open, but `live` was already false so the
   * result was thrown away; the second returned what the first had written
   * milliseconds earlier, and `getMissedSince` over a 3ms window is always
   * empty. The RPC's own comment says it exists so "two launches cannot race
   * each other into consuming the same window" — StrictMode is exactly that
   * race, and the second caller is built to lose.
   *
   * Keyed on the user id rather than a bare boolean, so switching account still
   * re-checks. Cleared on foreground below, because this stops a double-invoke
   * within one mount, not the check for the rest of the app's life.
   */
  const consumed = useRef<string | null>(null);
  /** when the check last ran, for the foreground debounce */
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (!user) return;
    if (consumed.current === user.id) return;
    consumed.current = user.id;
    lastCheck.current = Date.now();
    try {
      const previous = await touchLastOpened();
      /* Null is a first launch on this device, and a first launch must not be
         told it missed a week. It is also what an unapplied 0034 returns — see
         the warning in api.ts, which is the only thing distinguishing them. */
      if (!previous) {
        setChecked(true);
        return;
      }
      const now = new Date();
      const rows = await getMissedSince(user.id, previous, now);
      /* Past due and unmarked is the honest window; offering the same dose
         every time the app opens is nagging. Once a day, per account. */
      const seen = shownToday(user.id, now);
      const fresh = (rows ?? []).filter((d) => !seen.has(d.id));
      if (fresh.length > 0) markShown(user.id, fresh.map((d) => d.id), now);
      setMissed(fresh);
      setChecked(true);
    } catch {
      setChecked(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void check();
  }, [check]);

  /**
   * And again when the app comes back.
   *
   * `[user?.id]` alone means once per mount, and reopening a backgrounded iOS
   * app does not remount React — the WebView is still alive. So the screen only
   * ever appeared after a full kill and relaunch, which is not how a phone is
   * used.
   *
   * A second listener on `visibilitychange` rather than extending the one in
   * `Shell`: that one is about notification scheduling and lives with the user
   * id, this one is about a gate that only exists while signed in, and the two
   * have different debounces. Both are one-liners; merging them would put
   * unrelated reasoning in one handler.
   */
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      /* visibilitychange also fires on browser tab focus and can arrive in
         bursts. A minute is long enough that flicking between tabs costs
         nothing and short enough that a real resume is caught. */
      if (Date.now() - lastCheck.current < 60_000) return;
      consumed.current = null;
      void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id, check]);

  /* A tapped reminder lands here rather than on Today, because this is already
     the screen for "these came due, did you take them?" and it confirms with a
     drag. A tap must never mark anything — people tap notifications to dismiss
     them — and reusing this is what guarantees that rather than remembering to. */
  useEffect(() => {
    if (!user) return;
    return onBlockRequested((time) => {
      getDosesForDate(user.id, new Date())
        .then((doses) => {
          const inBlock = doses.filter(
            (d) => d.scheduled_time && d.scheduled_time.slice(0, 5) === time && !d.taken,
          );
          /* Deliberately not filtered by `shownToday`. Tapping a reminder is an
             explicit request for that block, so it opens even if the block was
             already offered and dismissed this morning. */
          if (inBlock.length > 0) {
            setMissed(inBlock);
            setChecked(true);
          }
        })
        .catch((err) => console.error('could not open the block a reminder asked for', err));
    });
  }, [user?.id]);

  /* The app renders while the check is in flight rather than behind a spinner.
     A blank screen on every launch to ask a question that usually has no answer
     is a worse trade than the screen appearing a moment later. */
  if (checked && missed && missed.length > 0 && user) {
    return (
      <CatchUp
        doses={missed}
        onTaken={(dose) =>
          setDoseTaken(dose.id, true)
            // the streak moved, so tomorrow's banner copy is now stale
            .then(() => void syncScheduleNotifications(user.id))
            /* Unhandled, this rejected into nothing whenever the catch-up
               screen was reached without a connection. Queued rather than
               dropped: this screen is also where a tapped reminder lands, and
               it is reached on a train as often as anywhere. */
            .catch((err) => {
              console.error('catch-up mark failed', err);
              enqueueMark(user.id, { doseId: dose.id, taken: true, at: new Date().toISOString() });
            })
        }
        onSkipped={(dose, reason, note) =>
          skipDose({ userId: user.id, doseId: dose.id, reason, note })
            .then(() => void syncScheduleNotifications(user.id))
            .catch((err) => console.error('skip failed', err))
        }
        onDismiss={() => setMissed([])}
      />
    );
  }

  return <Gate framed={framed} />;
}

function AuthScreen({ framed }: { framed: boolean }) {
  return (
    <div className={`app${framed ? ' framed' : ''}`}>
      {framed && (
        <div className="status">
          <span>9:41</span>
        </div>
      )}
      <div className="auth-panel">
        <Auth />
      </div>
    </div>
  );
}

/** Waits on the profile row (created by a DB trigger on signup) before rendering the app. */
function Gate({ framed }: { framed: boolean }) {
  const { profile, loading } = usePrefs();
  if (loading || !profile) return <div className="app splash" />;
  return <Shell framed={framed} largerText={profile.larger_text} />;
}

function Shell({ framed, largerText }: { framed: boolean; largerText: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  /** 0..2, continuous. The pill and the content both derive from this. */
  const progress = useMotionValue(0);
  const [index, setIndex] = useState(0);

  /**
   * The container width, as a motion value rather than a ref.
   *
   * `useTransform` recomputes when the values it is given change. A ref is not
   * one of those — so when the ResizeObserver corrected `width.current` from a
   * guessed 402 to the real width, `trackX` kept the offset it already had and
   * nothing recomputed until `progress` next moved. Tapping a tab moved it,
   * which is exactly why tapping a tab appeared to fix the layout.
   *
   * As a motion value the observer's write is a dependency, so a width change
   * recomputes the offset immediately with no tab change. Measured in a layout
   * effect as well, so the first painted frame already has the real width
   * rather than a guess at a phone.
   */
  const widthMV = useMotionValue(402);
  useLayoutEffect(() => {
    const measure = () => {
      const w = hostRef.current?.clientWidth;
      if (w) widthMV.set(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hostRef.current) ro.observe(hostRef.current);
    /* Rotation resizes the window without necessarily resizing the observed
       element on some browsers, so both are listened for. */
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [widthMV]);

  const trackX = useTransform([progress, widthMV], ([p, w]: number[]) => -p * w);

  const goTo = (i: number, velocity = 0) => {
    const target = Math.max(0, Math.min(2, i));
    setIndex(target);
    animate(progress, target, { ...TAB_SPRING, velocity });
  };

  /* ── the drag ──────────────────────────────────────────────
     Content tracks the finger 1:1 and the pill is derived from the same
     value on every frame. Nothing is applied on release except the snap.  */
  const drag = useRef({
    active: false,
    axis: null as null | 'x' | 'y',
    startX: 0,
    startY: 0,
    startP: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    progress.stop();
    drag.current = {
      active: true,
      axis: null,
      startX: e.clientX,
      startY: e.clientY,
      startP: progress.get(),
      lastX: e.clientX,
      lastT: performance.now(),
      vel: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.axis === null) {
      if (Math.abs(dx) > AXIS_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x';
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > AXIS_THRESHOLD) {
        // vertical: hand it back to the panel's native momentum scrolling
        d.axis = 'y';
        d.active = false;
        return;
      } else {
        return;
      }
    }
    if (d.axis !== 'x') return;

    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) {
      // tabs per second, smoothed
      const inst = ((d.lastX - e.clientX) / widthMV.get() / dt) * 1000;
      d.vel = d.vel * 0.7 + inst * 0.3;
      d.lastX = e.clientX;
      d.lastT = now;
    }

    const raw = d.startP - dx / widthMV.get();
    const p = raw < 0 ? raw * RUBBER : raw > 2 ? 2 + (raw - 2) * RUBBER : raw;
    progress.set(p);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active || d.axis !== 'x') {
      d.active = false;
      return;
    }
    d.active = false;

    const p = progress.get();
    // project where the flick was heading; a fast flick under 50% still advances
    const projected = p + d.vel * 0.22;
    const target = Math.max(0, Math.min(2, Math.round(projected)));
    setIndex(target);
    animate(progress, target, { ...TAB_SPRING, velocity: d.vel });
  };

  return (
    <div className={`app${framed ? ' framed' : ''}${largerText ? ' larger-text' : ''}`} ref={hostRef}>
      <SheetPortalProvider hostRef={hostRef}>
        <ActiveTabProvider value={index}>
          <GoToTabProvider value={goTo}>
          {framed && (
            <div className="status">
              <span>9:41</span>
            </div>
          )}

          <motion.div
            className="track"
            style={{ x: trackX }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="panel">
              <Today />
            </div>
            <div className="panel">
              <Discover />
            </div>
            <div className="panel">
              <You />
            </div>
          </motion.div>

          <TabBar progress={progress} onSelect={goTo} />
          <span hidden data-active-tab={index} />
          </GoToTabProvider>
        </ActiveTabProvider>
      </SheetPortalProvider>
    </div>
  );
}

/**
 * Whether this is the phone layout, decided before the first paint.
 *
 * This was `useState(false)` with the media query only running inside the
 * effect, so every launch painted one frame as the desktop, unframed layout and
 * then flipped. `.app.framed .panel` swaps padding-top from the safe-area inset
 * to 54px and the frame changes the container's width, so that first frame was
 * measured against a container about to change size — which is half of why
 * everything sat shifted left until a tab was tapped.
 *
 * Guarded for no-window so a non-DOM environment still gets a value.
 */
function useTouch() {
  const [v, setV] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640),
  );
  useEffect(() => {
    const check = () =>
      setV(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return v;
}
