// Structura — root. Wires the providers, onboarding flow, the
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
import { LessonOverlay, PracticeOverlay, RedeemModal } from './src/screens/main/Overlays';

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
          <Root />
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
  const { state, dispatch } = useApp();
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
      onDone={(name) => {
        dispatch({ type: 'setUser', payload: { name } });
        dispatch({ type: 'completeOnboarding' });
      }}
    />
  );
}

// ── Main app: five tabs + overlays ───────────────────────────
function MainApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [overlay, setOverlay] = useState(null); // {type:'lesson'|'session', ...}
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
  const closeOverlay = () => setOverlay(null);
  const goPractice = (mode) => {
    setPracticePrefill({ mode, ts: Date.now() });
    goTab('practice');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <Home openLesson={openLesson} goPractice={goPractice} goSandbox={() => goTab('sandbox')} />
        )}
        {tab === 'learn' && <Learn openLesson={openLesson} />}
        {tab === 'practice' && <Practice startSession={startSession} prefill={practicePrefill} />}
        {tab === 'sandbox' && (
          <Sandbox
            openRedeem={openRedeem}
            onExit={() => setTab(prevTab === 'sandbox' ? 'home' : prevTab)}
          />
        )}
        {tab === 'progress' && <Progress goPractice={goPractice} />}
        {tab === 'account' && <Account openRedeem={openRedeem} />}
      </View>

      {/* Tab bar — hidden in the sandbox, which runs full screen */}
      {tab !== 'sandbox' ? (
      <View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => goTab(t.id)} style={tb.item} hitSlop={6}>
              <Ionicons
                name={active ? t.icon : t.iconOutline}
                size={22}
                color={active ? C.teal : C.faint}
              />
              <Text style={[tb.label, active && { color: C.teal, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      ) : null}

      {/* Overlays */}
      {overlay && overlay.type === 'lesson' ? (
        <LessonOverlay unitId={overlay.unitId} onClose={closeOverlay} />
      ) : null}
      {overlay && overlay.type === 'session' ? (
        <PracticeOverlay config={overlay.config} onClose={closeOverlay} />
      ) : null}
      <RedeemModal visible={redeemOpen} onClose={() => setRedeemOpen(false)} />
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
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 9.5, color: C.faint, fontWeight: '600' },
});
