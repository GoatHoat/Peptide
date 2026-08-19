import { useEffect, useRef, useState } from 'react';
import { FLOW, NO_CHROME, type Step } from './flow';
import { markOnboarded, useOnboardingStore } from './store';
import { Header } from './chrome';
import { Auth, Welcome } from './screens/Intro';
import { Info, MULTI_QUESTIONS, MultiSelectScreen, Profile, QUESTIONS, SurveyScreen } from './screens/Survey';
import { CurrentStack, Day } from './screens/Day';
import { Goals } from './screens/Goals';
import { FreePick } from './screens/FreePick';
import {
  Commitment,
  GoalPriority,
  PlanPreview,
  Sex,
  StackCount,
  StackInsight,
} from './screens/Extra';
import { Notifications, Paywall } from './screens/Commit';
import { Building, Done, Recommendations, ScheduleBuilder, type Recommendation } from './screens/Results';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import { supabase } from '../lib/supabaseClient';
import {
  addScheduleItem,
  getProfile,
  markOnboardedRemote,
  rememberFact,
  updateProfile,
} from '../lib/api';
import { toISODate } from '../lib/date';

/**
 * Drives the flow. Every screen is handed its slice of the store and a way
 * forward; none of them knows what comes next, which is what makes reordering
 * FLOW enough to reorder the product.
 */
export function Onboarding({ onFinished }: { onFinished: () => void }) {
  const { state, step, patch, hydrate, next, back, goTo } = useOnboardingStore();
  const { session } = useAuth();
  const { refresh: refreshProfile } = usePrefs();
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

  /**
   * Signing in mid-flow moves past the auth screens on its own.
   *
   * This deliberately does NOT decide whether the account has already
   * onboarded. An earlier version awaited that check here and held the flow
   * until it came back, which raced `Auth`'s own onDone — the form sat on
   * "Please wait…" and neither path advanced. The gate in App.tsx owns that
   * decision, reads the same two facts, and swaps the app in over the top.
   * The cost is that a returning user may see the first question for the
   * length of one round trip; the alternative was a form that never returned.
   */
  useEffect(() => {
    if (session && step === 'auth') {
      patch({ auth: { userId: session.user.id, email: session.user.email ?? null } });
      goTo(FLOW.indexOf('profile'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, step]);

  /* Answers given on another device live on the profile row, not in this
     device's localStorage. Read them back once so a returning user is not
     asked the same three questions again. */
  const hydrated = useRef(false);
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || hydrated.current) return;
    hydrated.current = true;
    getProfile(userId)
      .then((p) =>
        hydrate({
          diet: p.diet,
          reactions: p.reactions,
          reactionsNote: p.reactions_note,
          forms: p.form_prefs,
        }),
      )
      .catch(() => {});
  }, [session, hydrate]);

  const finish = async () => {
    const userId = session?.user.id;
    if (userId) {
      // everything collected that the app proper actually reads
      await updateProfile(userId, {
        wake_time: state.wake,
        sleep_time: state.sleep,
        // the supplement sheet reads these to personalise the intake
        age: state.profile.age,
        sex: state.profile.gender,
      }).catch(() => {});
      /* Written on its own, because these columns arrive with migration 0018
         and a database that has not run it yet must still keep the age, sex
         and waking window above — one update carrying all of it would lose
         the lot to a single unknown column. */
      await updateProfile(userId, {
        diet: state.diet,
        reactions: state.reactions,
        reactions_note: state.reactionsNote.trim() || null,
        form_prefs: state.forms,
      }).catch(() => {});

      /* The free-text reaction becomes memory the assistant can read. Stored
         uninterpreted — interpretation is lazy and deliberately never happens
         during onboarding, because a model call between two taps is a network
         round trip the flow cannot afford. */
      if (state.reactionsNote.trim()) {
        await rememberFact({
          userId,
          source: 'onboarding_reaction',
          rawText: state.reactionsNote,
        }).catch(() => {});
      }

      for (const item of state.schedule) {
        const rec = picks.find((p) => p.id === item.id);
        if (!rec) continue;
        await addScheduleItem(userId, {
          name: rec.name,
          // the person's own reference intake where one exists; blank means
          // there is no established amount and they set it themselves
          amount: rec.amount,
          scheduled_time: `${item.time}:00`,
          glossary_id: rec.id,
          start_date: toISODate(new Date()),
        }).catch((err) => {
          /* Swallowed entirely before, so an item that never reached the
             schedule left no trace anywhere — the schedule simply came out
             shorter than the list the person had just approved. Onboarding
             still must not stop for one row, but it says which and why. */
          console.error(`onboarding: ${rec.name} did not reach the schedule`, err);
        });
      }
      /* The profile provider read this row when the account was created,
         which was before any of the above existed, and it only refetches when
         the user id changes — which it does not, here. Without this the app
         opens on the row as it was: the Today arc spans the default 07:00 to
         23:00 rather than the window just set, and the intake figures use the
         default age and sex. Both correct themselves on the next cold start,
         which is the worst kind of wrong. */
      await refreshProfile().catch(() => {});
    }
    markOnboarded(session?.user?.id ?? null);
    /* The column, not just the device cache — otherwise signing in on a second
       phone re-runs a flow this account has already finished. */
    markOnboardedRemote().catch(() => {});
    onFinished();
  };

  const skip = () => {
    if (step === 'q2') patch({ survey: { ...state.survey, q2: null } });
    if (step === 'q3') patch({ survey: { ...state.survey, q3: null } });
    // an empty answer is a real answer on these three: it means no preference
    if (step === 'diet') patch({ diet: [] });
    if (step === 'reactions') patch({ reactions: [], reactionsNote: '' });
    if (step === 'forms') patch({ forms: [] });
    next();
  };

  const body = (() => {
    switch (step) {
      case 'welcome':
        return <Welcome onNext={next} />;

      case 'auth':
        return (
          <Auth
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

      case 'sex':
        return (
          <Sex
            value={state.profile.gender}
            onDone={(gender) => {
              patch({ profile: { age: state.profile.age, gender } });
              next();
            }}
          />
        );

      case 'stack-count':
        return (
          <StackCount
            value={state.stackCount}
            onDone={(stackCount) => {
              patch({ stackCount });
              next();
            }}
          />
        );

      case 'stack-insight':
        return (
          <StackInsight
            currentStack={state.currentStack}
            mealTimes={state.meals.map((m) => m.time)}
            sleepTime={state.sleep}
            onDone={next}
          />
        );

      case 'goal-priority':
        return (
          <GoalPriority
            goals={state.goals}
            value={state.goalPriority}
            onDone={(goalPriority) => {
              patch({ goalPriority });
              next();
            }}
          />
        );

      case 'commitment':
        return (
          <Commitment
            value={state.commitmentDays}
            onDone={(commitmentDays) => {
              patch({ commitmentDays });
              next();
            }}
          />
        );

      case 'plan-preview':
        return (
          <PlanPreview
            goals={state.goalPriority.length ? state.goalPriority : state.goals}
            productCount={picks.length}
            commitmentDays={state.commitmentDays}
            onDone={next}
          />
        );

      case 'diet':
      case 'reactions':
      case 'forms':
        return (
          <MultiSelectScreen
            question={MULTI_QUESTIONS[step]}
            value={state[step]}
            onChange={(v) =>
              patch(step === 'diet' ? { diet: v } : step === 'reactions' ? { reactions: v } : { forms: v })
            }
            note={step === 'reactions' ? state.reactionsNote : undefined}
            onNote={step === 'reactions' ? (reactionsNote) => patch({ reactionsNote }) : undefined}
            onNext={next}
          />
        );

      case 'info':
        return <Info onNext={next} />;

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

      /* One screen, twice. `Day` already renders the waking window and the
         meals as two blocks; `only` picks which. Splitting the component would
         have duplicated the time-picker plumbing for no gain. */
      case 'day':
        return (
          <Day
            only="window"
            wake={state.wake}
            sleep={state.sleep}
            meals={state.meals}
            onChange={patch}
            onMeals={(meals) => patch({ meals })}
            onNext={next}
          />
        );

      case 'meals':
        return (
          <Day
            only="meals"
            wake={state.wake}
            sleep={state.sleep}
            meals={state.meals}
            onChange={patch}
            onMeals={(meals) => patch({ meals })}
            onNext={next}
          />
        );

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
              next();
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
            diet={state.diet}
            reactions={state.reactions}
            forms={state.forms}
            age={state.profile.age}
            sex={state.profile.gender}
            onDone={(chosen) => {
              setPicks(chosen);
              patch({ recommendations: chosen.map((c) => ({ id: c.id, selected: true })) });
              next();
            }}
          />
        );

      case 'free-pick':
        return (
          <FreePick
            picks={picks}
            onDone={(chosenId) => {
              /* The schedule is built from `picks`, so narrowing it here is
                 what makes the free tier one product rather than six with five
                 that silently fail to save. The full list stays in the store,
                 so upgrading later has something to restore from. */
              setPicks((all) => all.filter((p) => p.id === chosenId));
              patch({
                recommendations: state.recommendations.map((r) => ({
                  ...r,
                  selected: r.id === chosenId,
                })),
              });
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
    /* data-step is the only thing outside this file that knows which screen is
       up. Without it a test has to guess from a heading, and half the screens
       say "Continue" — which is how a reordered flow passes a green suite. */
    <div className="ob-root" data-step={step}>
      {!NO_CHROME.has(step) && <Header step={step} onBack={back} onSkip={skip} />}
      <div className="ob-stage">
        <div key={step} className={`ob-screen ${dir === 'fwd' ? 'enter' : 'enter-back'}`}>
          {body}
        </div>
      </div>
    </div>
  );
}
