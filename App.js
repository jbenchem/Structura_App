// Catalyst — root. Wires the providers, onboarding flow, the
// five-tab main app (Account bottom right) and overlays.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/theme';
import { DeviceFrame } from './src/components/DeviceFrame';
import { AppProvider, useApp } from './src/state/store';
import { Welcome, GoalStep, NameStep } from './src/screens/onboarding/Onboarding';
import { Home } from './src/screens/main/Home';
import { Learn } from './src/screens/main/Learn';
import { Practice } from './src/screens/main/Practice';
import { Progress } from './src/screens/main/Progress';
import { Sandbox } from './src/screens/main/Sandbox';
import { Account } from './src/screens/main/Account';
import { DevTools } from './src/screens/main/DevTools';
import { LessonOverlay, PracticeOverlay, RedeemModal, FocusOverlay } from './src/screens/main/Overlays';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { TourProvider, SpotlightTour, useTourTarget } from './src/components/Spotlight';
import { warmUpVoices } from './src/components/ReadAloud';
import { TOUR_STEPS } from './src/content/tour';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { id: 'learn', label: 'Learn', icon: 'book', iconOutline: 'book-outline' },
  { id: 'practice', label: 'Practice', icon: 'create', iconOutline: 'create-outline' },
  { id: 'sandbox', label: 'Sandbox', icon: 'flask', iconOutline: 'flask-outline' },
  { id: 'progress', label: 'Progress', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { id: 'account', label: 'Account', icon: 'person-circle', iconOutline: 'person-circle-outline' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        {/* On web this frames the app at phone size; on device it is a
            pass-through and renders nothing of its own. */}
        <DeviceFrame>
          {/* Screens register the elements the first-run tour points at.
              The provider sits inside the frame so the coordinates the tour
              measures are the app's, not the browser page's. */}
          <TourProvider>
            <Root />
          </TourProvider>
        </DeviceFrame>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { state } = useApp();
  if (!state.hydrated) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }
  return state.onboarded ? <MainApp /> : <OnboardingFlow />;
}

// ── Onboarding: welcome → goal → level → name → app ──────────
function OnboardingFlow() {
  const { state, dispatch, redeemCode } = useApp();
  const [step, setStep] = useState(0);

  if (step === 0) return <Welcome onStart={() => setStep(1)} />;
  if (step === 1)
    return (
      <GoalStep
        value={state.user.goal}
        onSelect={(goal) => dispatch({ type: 'setUser', payload: { goal } })}
        onBack={() => setStep(0)}
        onContinue={() => setStep(2)}
      />
    );
  return (
    <NameStep
      onBack={() => setStep(1)}
      onDone={(name, code) => {
        dispatch({ type: 'setUser', payload: { name } });
        dispatch({ type: 'completeOnboarding' });
        // Redeem AFTER onboarding completes, so the code's entitlement
        // replaces the seven-day trial rather than being overwritten by it.
        if (code) redeemCode(code);
      }}
    />
  );
}

// ── Main app: five tabs + overlays ───────────────────────────
function MainApp() {
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();

  // Enumerating the device's voices takes a moment on Android, and the first
  // press of the speaker was paying for all of it: press, silence, then
  // speech. Done once here instead, while the student is still on Home.
  useEffect(() => {
    warmUpVoices();
  }, []);
  const [tab, setTab] = useState('home');
  const [overlay, setOverlay] = useState(null); // {type:'lesson'|'session', ...}
  const [devOpen, setDevOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [practicePrefill, setPracticePrefill] = useState(null);
  const [prevTab, setPrevTab] = useState('home');

  // The sandbox takes the whole screen, so the hardware back button is the
  // way out of it — otherwise there would be no way back on Android.
  useEffect(() => {
    if (tab !== 'sandbox') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setTab(prevTab === 'sandbox' ? 'home' : prevTab);
      return true;
    });
    return () => sub.remove();
  }, [tab, prevTab]);

  const goTab = (next) => {
    if (next !== tab) setPrevTab(tab);
    setTab(next);
  };

  const openRedeem = () => setRedeemOpen(true);
  const openLesson = (unitId) => setOverlay({ type: 'lesson', unitId });
  const startSession = (config) => setOverlay({ type: 'session', config });
  // The recommendation on the Progress screen opens a set built from exactly
  // the skill it named, rather than dropping the student on a generic practice
  // screen to configure it themselves.
  const practiceFocus = (focus, count, title) =>
    setOverlay({ type: 'focus', focus, count, title });
  const closeOverlay = () => setOverlay(null);
  const goPractice = (mode) => {
    setPracticePrefill({ mode, ts: Date.now() });
    goTab('practice');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <ErrorBoundary label="Home">
            <Home openLesson={openLesson} goPractice={goPractice} goSandbox={() => goTab('sandbox')} goLearn={() => goTab('learn')} />
          </ErrorBoundary>
        )}
        {tab === 'learn' && (
          <ErrorBoundary label="Learn"><Learn openLesson={openLesson} /></ErrorBoundary>
        )}
        {tab === 'practice' && (
          <ErrorBoundary label="Practice">
            <Practice startSession={startSession} prefill={practicePrefill} />
          </ErrorBoundary>
        )}
        {tab === 'sandbox' && (
          <ErrorBoundary label="Sandbox">
          <Sandbox
            openRedeem={openRedeem}
            onExit={() => setTab(prevTab === 'sandbox' ? 'home' : prevTab)}
          />
          </ErrorBoundary>
        )}
        {tab === 'progress' && (
          <ErrorBoundary label="Progress">
            <Progress goPractice={goPractice} practiceFocus={practiceFocus} />
          </ErrorBoundary>
        )}
        {tab === 'account' && (
          <ErrorBoundary label="Account">
            <Account openRedeem={openRedeem} openDevTools={() => setDevOpen(true)} />
          </ErrorBoundary>
        )}
      </View>

      {/* Tab bar — hidden in the sandbox, which runs full screen */}
      {tab !== 'sandbox' ? (
      <View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map((t) => (
          <TabItem key={t.id} tab={t} active={tab === t.id} onPress={() => goTab(t.id)} />
        ))}
      </View>
      ) : null}

      {/* Overlays */}
      {overlay && overlay.type === 'lesson' ? (
        <ErrorBoundary label="Lesson"><LessonOverlay unitId={overlay.unitId} onClose={closeOverlay} /></ErrorBoundary>
      ) : null}
      {overlay && overlay.type === 'session' ? (
        <ErrorBoundary label="Practice session"><PracticeOverlay config={overlay.config} onClose={closeOverlay} /></ErrorBoundary>
      ) : null}
      {overlay && overlay.type === 'focus' ? (
        <FocusOverlay
          focus={overlay.focus}
          count={overlay.count}
          title={overlay.title}
          onClose={closeOverlay}
        />
      ) : null}
      <RedeemModal visible={redeemOpen} onClose={() => setRedeemOpen(false)} />

      {/* Dev tools, full screen over everything. Never reachable in a
          release build — Account does not render the door. */}
      {devOpen ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, zIndex: 80 }]}>
          <ErrorBoundary label="Dev tools">
            <DevTools onClose={() => setDevOpen(false)} openLesson={openLesson} />
          </ErrorBoundary>
        </View>
      ) : null}

      {/* First-run tour. Held back until the student is actually looking at
          the Home screen with nothing on top of it, because every step points
          at something there — running it over a lesson would spotlight a
          rectangle of empty space. */}
      <SpotlightTour
        steps={TOUR_STEPS}
        visible={!state.tourDone && tab === 'home' && !overlay && !redeemOpen}
        onFinish={() => dispatch({ type: 'completeTour' })}
        onSkip={() => dispatch({ type: 'completeTour' })}
      />
    </View>
  );
}

// A tab that the tour can point at. The ref has to be attached to a real
// view, and Pressable does not forward one, so the wrapper carries it —
// collapsable={false} keeps Android from optimising the wrapper away and
// leaving nothing to measure.
function TabItem({ tab, active, onPress }) {
  const ref = useTourTarget(`tab.${tab.id}`);
  return (
    <View ref={ref} collapsable={false} style={tb.item}>
      <Pressable onPress={onPress} style={tb.itemInner} hitSlop={6}>
        <Ionicons
          name={active ? tab.icon : tab.iconOutline}
          size={22}
          color={active ? C.teal : C.faint}
        />
        <Text style={[tb.label, active && { color: C.teal, fontWeight: '700' }]}>
          {tab.label}
        </Text>
      </Pressable>
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  // The flex now lives on the wrapper the tour measures. Leaving it on the
  // Pressable as well would make it stretch to the wrapper's full height,
  // which is a column here rather than the row it used to sit in.
  item: { flex: 1 },
  itemInner: { alignItems: 'center', gap: 3 },
  label: { fontSize: 9.5, color: C.faint, fontWeight: '600' },
});
