import { AddSheet } from './components/AddSheet';
import { CRUMB_NOTES, CRUMBS, DevToolbar } from './components/DevToolbar';
import { densityFor, FIELD_SCREENS, ParticleField } from './components/ParticleField';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { ONBOARDING_ORDER, StoreProvider, useStore } from './state/store';
import { useIsMobile } from './lib/useIsMobile';

import { Ob1ColdOpen } from './screens/onboarding/Ob1ColdOpen';
import { Ob2AboutYou } from './screens/onboarding/Ob2AboutYou';
import { Ob3BuildStack } from './screens/onboarding/Ob3BuildStack';
import { Ob4Injectables } from './screens/onboarding/Ob4Injectables';
import { Ob5Audit } from './screens/onboarding/Ob5Audit';
import { Ob6Goals } from './screens/onboarding/Ob6Goals';
import { Ob6bRecommendations } from './screens/onboarding/Ob6bRecommendations';
import { Ob7ProgressPhoto } from './screens/onboarding/Ob7ProgressPhoto';
import { Ob8Sleep } from './screens/onboarding/Ob8Sleep';
import { Ob9Meals } from './screens/onboarding/Ob9Meals';
import { Ob10Schedule } from './screens/onboarding/Ob10Schedule';
import { Ob11Notifications } from './screens/onboarding/Ob11Notifications';
import { Ob12Paywall } from './screens/onboarding/Ob12Paywall';

import { Gate } from './screens/Gate';
import { Today } from './screens/Today';
import { StackScreen } from './screens/StackScreen';
import { ItemDetail } from './screens/ItemDetail';
import { Analysis } from './screens/Analysis';
import { Profile } from './screens/Profile';
import { YearInReview } from './screens/YearInReview';
import { DynamicTypeAX3, ReduceTransparency } from './screens/Accessibility';

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state } = useStore();
  const screen = state.screen;
  const mobile = useIsMobile();

  // On a real phone the app IS the viewport — no frame, no toolbar, no
  // breadcrumb. dvh, not vh, or iOS Safari's collapsing toolbar clips the arc.
  if (mobile) {
    return (
      <div className="mobile-root" style={{ width: '100vw', height: '100dvh', background: '#000' }}>
        <Device />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0E0E10] text-white">
      <DevToolbar />
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-6 pb-14 pt-10">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/[0.32]">
            {CRUMBS[screen] ?? ''}
          </span>
          <span className="text-[11px] text-white/[0.22]">{CRUMB_NOTES[screen] ?? ''}</span>
        </div>
        <PhoneFrame>
          <Device />
        </PhoneFrame>
      </main>
    </div>
  );
}

const MAIN_TABS = ['today', 'stack', 'analysis', 'profile', 'item'];

function Device() {
  const { state } = useStore();
  const { screen, gate, reduceMotion, lowPower } = state;

  const isOnboarding = screen.startsWith('ob');
  // The radial copper haze is ob1's alone. A signature used everywhere is
  // wallpaper; used once, it's an entrance.
  const cinematic = screen === 'ob1';
  const hasField = FIELD_SCREENS.includes(screen);
  const density = densityFor(screen);
  // Today sits under the gate so the 0.4s upward wipe reveals it.
  const showToday = screen === 'today' || (screen === 'gate' && gate === 'wipe');
  const showTabs = MAIN_TABS.includes(screen);
  const step = ONBOARDING_ORDER.indexOf(screen === 'ob5b' ? 'ob5' : screen);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      {cinematic && (
        <>
          <div
            className="pointer-events-none absolute left-1/2 rounded-full animate-glow-a"
            style={{
              top: '8%',
              width: 520,
              height: 420,
              background: 'radial-gradient(circle,rgba(200,121,65,0.16),transparent 62%)',
              animationPlayState: reduceMotion ? 'paused' : 'running',
              zIndex: 0,
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 rounded-full animate-glow-b"
            style={{
              bottom: '-8%',
              width: 600,
              height: 460,
              background: 'radial-gradient(circle,rgba(200,121,65,0.10),transparent 64%)',
              animationPlayState: reduceMotion ? 'paused' : 'running',
              zIndex: 0,
            }}
          />
        </>
      )}

      {/* One very soft copper radial anchored off the top-right corner. Almost
          subliminal alone — it exists so the glass has colour to pick up. */}
      {hasField && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            top: -150,
            right: -130,
            width: 440,
            height: 440,
            background: 'radial-gradient(circle,rgba(200,121,65,0.10),transparent 65%)',
            zIndex: 0,
          }}
        />
      )}

      {density > 0 && (
        <ParticleField density={density} reduceMotion={reduceMotion} lowPower={lowPower} />
      )}

      {/* Onboarding progress segments, pinned to the very top */}
      {isOnboarding && (
        <div className="absolute flex h-[3px] gap-1" style={{ top: 70, left: 20, right: 20, zIndex: 4 }}>
          {ONBOARDING_ORDER.map((id, i) => (
            <div
              key={id}
              className="h-[3px] flex-1 rounded-sm"
              style={{ background: i <= step ? '#C87941' : 'rgba(255,255,255,0.10)' }}
            />
          ))}
        </div>
      )}

      {screen === 'ob1' && <Ob1ColdOpen />}
      {screen === 'ob2' && <Ob2AboutYou />}
      {screen === 'ob3' && <Ob3BuildStack />}
      {screen === 'ob4' && <Ob4Injectables />}
      {(screen === 'ob5' || screen === 'ob5b') && <Ob5Audit />}
      {screen === 'ob6' && <Ob6Goals />}
      {screen === 'ob6b' && <Ob6bRecommendations />}
      {screen === 'ob7' && <Ob7ProgressPhoto />}
      {screen === 'ob8' && <Ob8Sleep />}
      {screen === 'ob9' && <Ob9Meals />}
      {screen === 'ob10' && <Ob10Schedule />}
      {screen === 'ob11' && <Ob11Notifications />}
      {screen === 'ob12' && <Ob12Paywall />}

      {showToday && <Today />}
      {screen === 'gate' && <Gate />}
      {screen === 'stack' && <StackScreen />}
      {screen === 'item' && <ItemDetail />}
      {screen === 'analysis' && <Analysis />}
      {screen === 'profile' && <Profile />}
      {screen === 'yir' && <YearInReview />}
      {screen === 'st_rt' && <ReduceTransparency />}
      {screen === 'st_ax3' && <DynamicTypeAX3 />}

      {showTabs && <TabBar />}

      <AddSheet />
    </div>
  );
}
