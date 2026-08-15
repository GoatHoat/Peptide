import { useEffect, useRef, useState } from 'react';
import { FLOW, NO_CHROME, type Step } from './flow';
import { markOnboarded, useOnboardingStore } from './store';
import { Header } from './chrome';
import { AuthChoice, AuthForm, Welcome } from './screens/Intro';
import { Info, Profile, QUESTIONS, SurveyScreen } from './screens/Survey';
import { CurrentStack, Meals, Sleep } from './screens/Day';
import { Goals } from './screens/Goals';
import { Notifications, Paywall } from './screens/Commit';
import { Building, Done, Recommendations, ScheduleBuilder, type Recommendation } from './screens/Results';
import { SKIP_PAYWALL } from '../lib/billing';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import { addScheduleItem, updateProfile } from '../lib/api';
import { toISODate } from '../lib/date';

/**
 * Drives the flow. Every screen is handed its slice of the store and a way
 * forward; none of them knows what comes next, which is what makes reordering
 * FLOW enough to reorder the product.
 */
export function Onboarding({ onFinished }: { onFinished: () => void }) {
  const { state, step, patch, next, back, goTo } = useOnboardingStore();
  const { session } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [picks, setPicks] = useState<Recommendation[]>([]);

  /* direction drives the slide; back slides the other way */
  const prev = useRef<Step>(step);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  useEffect(() => {
    if (prev.current !== step) {
      setDir(FLOW.indexOf(step) >= FLOW.indexOf(prev.current) ? 'fwd' : 'back');
      prev.current = step;
    }
  }, [step]);

  /* signing in mid-flow moves past the auth screens on its own */
  useEffect(() => {
    if (session && (step === 'auth-choice' || step === 'auth-form')) {
      patch({ auth: { userId: session.user.id, email: session.user.email ?? null } });
      goTo(FLOW.indexOf('profile'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, step]);

  const finish = async () => {
    const userId = session?.user.id;
    if (userId) {
      // everything collected that the app proper actually reads
      await updateProfile(userId, {
        wake_time: state.wake,
        sleep_time: state.sleep,
      }).catch(() => {});
      for (const item of state.schedule) {
        const rec = picks.find((p) => p.id === item.id);
        if (!rec) continue;
        await addScheduleItem(userId, {
          name: rec.name,
          amount: '',
          scheduled_time: `${item.time}:00`,
          glossary_id: rec.id,
          start_date: toISODate(new Date()),
        }).catch(() => {});
      }
    }
    markOnboarded();
    onFinished();
  };

  const skip = () => {
    if (step === 'q1') patch({ survey: { ...state.survey, q1: null } });
    if (step === 'q2') patch({ survey: { ...state.survey, q2: null } });
    if (step === 'q3') patch({ survey: { ...state.survey, q3: null } });
    next();
  };

  const body = (() => {
    switch (step) {
      case 'welcome':
        return <Welcome onNext={next} />;

      case 'auth-choice':
        return (
          <AuthChoice
            onEmail={() => {
              setAuthMode('signup');
              next();
            }}
            onSignIn={() => {
              setAuthMode('signin');
              next();
            }}
          />
        );

      case 'auth-form':
        return (
          <AuthForm
            mode={authMode}
            onSwitch={setAuthMode}
            onDone={async (_id, email) => {
              const { data } = await supabase.auth.getSession();
              patch({ auth: { userId: data.session?.user.id ?? null, email } });
              next();
            }}
          />
        );

      case 'profile':
        return (
          <Profile
            age={state.profile.age}
            gender={state.profile.gender}
            onChange={(p) => patch({ profile: { age: p.age ?? state.profile.age, gender: p.gender } })}
            onNext={next}
          />
        );

      case 'info-library':
      case 'info-recs':
        return <Info which={step} onNext={next} />;

      case 'q1':
      case 'q2':
      case 'q3':
        return (
          <SurveyScreen
            question={QUESTIONS[step]}
            value={state.survey[step]}
            onPick={(v) =>
              patch({
                survey:
                  // answering "never tried" retires q3, so its answer goes too
                  step === 'q2' && v === 'never'
                    ? { ...state.survey, q2: v, q3: null }
                    : { ...state.survey, [step]: v },
              })
            }
            onNext={next}
          />
        );

      case 'sleep':
        return <Sleep wake={state.wake} sleep={state.sleep} onChange={patch} onNext={next} />;

      case 'meals':
        return <Meals meals={state.meals} onChange={(meals) => patch({ meals })} onNext={next} />;

      case 'current-stack':
        return (
          <CurrentStack
            picked={state.currentStack}
            onChange={(currentStack) => patch({ currentStack })}
            onNext={next}
          />
        );

      case 'goals':
        return <Goals selected={state.goals} onChange={(goals) => patch({ goals })} onNext={next} />;

      case 'notifications':
        return (
          <Notifications
            onDone={(granted) => {
              patch({ notificationsGranted: granted });
              // the paywall is skippable in dev so the rest stays testable
              goTo(FLOW.indexOf(SKIP_PAYWALL ? 'building-recs' : 'paywall'));
            }}
          />
        );

      case 'paywall':
        return (
          <Paywall
            onDone={(subscribed) => {
              patch({ subscribed });
              next();
            }}
          />
        );

      case 'building-recs':
        return <Building variant="recs" onDone={next} />;

      case 'recommendations':
        return (
          <Recommendations
            goalIds={state.goals}
            currentStack={state.currentStack}
            onDone={(chosen) => {
              setPicks(chosen);
              patch({ recommendations: chosen.map((c) => ({ id: c.id, selected: true })) });
              next();
            }}
          />
        );

      case 'building-schedule':
        return <Building variant="schedule" onDone={next} />;

      case 'schedule':
        return (
          <ScheduleBuilder
            picks={picks}
            meals={state.meals}
            wake={state.wake}
            sleep={state.sleep}
            onDone={(schedule) => {
              patch({ schedule });
              next();
            }}
          />
        );

      case 'done':
        return <Done onFinish={finish} />;
    }
  })();

  return (
    <div className="ob-root">
      {!NO_CHROME.has(step) && <Header step={step} onBack={back} onSkip={skip} />}
      <div className="ob-stage">
        <div key={step} className={`ob-screen ${dir === 'fwd' ? 'enter' : 'enter-back'}`}>
          {body}
        </div>
      </div>
    </div>
  );
}
