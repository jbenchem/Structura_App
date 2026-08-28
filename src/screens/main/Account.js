// Account tab — the new fifth tab (bottom right).
// Profile placeholder, subscription status, access-code redemption
// entry point, settings placeholders and developer tools.

import React from 'react';
import { View, Text, ScrollView, Alert, Pressable, StyleSheet, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHOW_DEV_TOOLS, SHOW_FEEDBACK, FEEDBACK_EMAIL, BUILD_LABEL } from '../../config';
import { C, T, R } from '../../theme';
import { Screen, Header, Card, Pill } from '../../components/ui';
import { useApp, getSettings, PRICE, TRIAL_DAYS } from '../../state/store';
import { loadVoiceList, speakSample, resetVoiceChoice } from '../../components/ReadAloud';
import { UNITS } from '../../content/content';

function fmtDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Account({ openRedeem, openDevTools }) {
  const { state, dispatch, isPremium, daysRemaining } = useApp();
  const settings = getSettings(state);
  const set = (key, value) => dispatch({ type: 'setSetting', key, value });
  const daysLeft = daysRemaining();
  const { user, entitlement, attempts } = state;
  const initial = (user.name || 'S').trim().charAt(0).toUpperCase();

  const planLabel = !isPremium
    ? 'Free plan'
    : entitlement.plan === 'code'
    ? `Plus via access code (${entitlement.source})`
    : entitlement.plan === 'trial'
    ? entitlement.source === 'welcome-trial'
      ? `Plus - welcome trial (${TRIAL_DAYS} days)`
      : 'Plus - free trial'
    : entitlement.plan === 'dev'
    ? 'Plus - developer override'
    : `Plus - ${entitlement.plan}`;

  const expiry =
    isPremium && entitlement.premiumUntil
      ? `Active until ${fmtDate(entitlement.premiumUntil)}${
          daysLeft !== null ? ` - ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''
        }`
      : null;

  const confirmReset = () =>
    Alert.alert('Reset all data?', 'Clears progress, attempts and entitlement on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => dispatch({ type: 'resetAll' }) },
    ]);

  const comingSoon = (what) => Alert.alert('Coming soon', `${what} arrives with a later build.`);

  return (
    <Screen>
      <Header title="Account" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Profile */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <View style={ac.avatar}>
            <Text style={ac.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>{user.name || 'Guest'}</Text>
            <Text style={T.sub}>Local profile - sign-in coming soon</Text>
          </View>
          <Pressable onPress={() => comingSoon('Profile editing and sign-in')} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={C.faint} />
          </Pressable>
        </Card>

        {/* Subscription */}
        <Text style={ac.sectionTitle}>Subscription</Text>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="diamond" size={18} color={isPremium ? C.teal : C.faint} />
            <View style={{ flex: 1 }}>
              <Text style={[T.body, { fontWeight: '700' }]}>{planLabel}</Text>
              {expiry ? <Text style={T.tiny}>{expiry}</Text> : null}
            </View>
            {isPremium ? <Pill label="Active" kind="complete" /> : null}
          </View>
          {!isPremium || entitlement.plan === 'trial' ? (
            <View style={ac.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { fontWeight: '700' }]}>
                  {PRICE.monthly}
                  <Text style={T.tiny}> {PRICE.period}</Text>
                </Text>
                <Text style={T.tiny}>
                  {entitlement.plan === 'trial'
                    ? 'Continues after your free trial ends'
                    : `All learning stays free - Plus adds the sandbox, adaptive practice and analytics`}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Purchases coming soon',
                    `Catalyst Plus will be ${PRICE.monthly} ${PRICE.period}. Billing arrives with the RevenueCat build; until then, use an access code.`
                  )
                }
                style={ac.subscribeBtn}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Subscribe</Text>
              </Pressable>
            </View>
          ) : null}
          <RowButton icon="key-outline" label="Redeem an access code" onPress={openRedeem} />
          <RowButton
            icon="refresh-outline"
            label="Restore purchases"
            onPress={() => comingSoon('Purchase restoring (RevenueCat)')}
          />
        </Card>

        {/* Reading and celebrations */}
        <Text style={ac.sectionTitle}>Reading and sound</Text>
        <Card style={{ gap: 14 }}>
          <ToggleRow
            icon="volume-high-outline"
            label="Read pages aloud automatically"
            note="Teaching pages start reading on their own. The speaker icon works either way."
            value={settings.autoRead}
            onChange={(v) => set('autoRead', v)}
          />
          <VoicePicker
            value={settings.voiceId}
            onChange={(id) => {
              resetVoiceChoice();
              set('voiceId', id);
            }}
          />
        </Card>

        <Text style={ac.sectionTitle}>Celebrations</Text>
        <Card style={{ gap: 14 }}>
          <ToggleRow
            icon="sparkles-outline"
            label="Fireworks when a lesson ends"
            note="Coloured for a finished lesson, gold for a perfect one."
            value={settings.celebrations}
            onChange={(v) => set('celebrations', v)}
          />
          <ToggleRow
            icon="phone-portrait-outline"
            label="Vibrate with the fireworks"
            value={settings.celebrationHaptics}
            disabled={!settings.celebrations}
            onChange={(v) => set('celebrationHaptics', v)}
          />
        </Card>

        {/* Preferences (placeholders) */}
        <Text style={ac.sectionTitle}>Preferences</Text>
        <Card style={{ gap: 12 }}>
          <RowButton
            icon="help-circle-outline"
            label="Show the tour again"
            onPress={() => {
              dispatch({ type: 'restartTour' });
              Alert.alert('Tour ready', 'Go to Home and the tour will start from the beginning.');
            }}
          />
          <RowButton icon="notifications-outline" label="Reminders" onPress={() => comingSoon('Practice reminders')} />
          <RowButton icon="color-palette-outline" label="Themes (Plus)" onPress={() => comingSoon('Themes')} />
        </Card>

        {/* Data */}
        <Text style={ac.sectionTitle}>Your data</Text>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="analytics-outline" size={18} color={C.sub} />
            <Text style={T.body}>
              Question attempts logged: <Text style={{ fontWeight: '700' }}>{attempts.length}</Text>
            </Text>
          </View>
          <RowButton icon="trash-outline" label="Reset all data" danger onPress={confirmReset} />
        </Card>

        {/* Developer — one door rather than a wall of buttons. Everything
            that was loose in this section now lives on the dev tools screen,
            alongside the things that were missing: a celebration preview, a
            narration readout, and a jump to any unit. Hidden outside a dev
            build — a tester who can complete every unit with a button is no
            longer testing what was built. */}
        {SHOW_DEV_TOOLS ? (
          <>
            <Text style={ac.sectionTitle}>Developer</Text>
            <Card style={{ gap: 12 }}>
              <RowButton icon="construct-outline" label="Dev tools" onPress={openDevTools} />
            </Card>
          </>
        ) : null}

        {SHOW_FEEDBACK ? (
          <>
            <Text style={ac.sectionTitle}>Beta</Text>
            <Card style={{ gap: 12 }}>
              <Text style={T.sub}>
                Found something wrong, confusing, or just badly worded? Tell us while it is
                fresh — what you tapped matters as much as what happened.
              </Text>
              <RowButton
                icon="mail-outline"
                label="Send feedback"
                onPress={() => {
                  const body = [
                    '',
                    '',
                    '--- please leave the lines below ---',
                    `build: ${BUILD_LABEL}`,
                    `unit: ${state.progress.current.unitId} lesson ${state.progress.current.lesson}`,
                    `units complete: ${state.progress.completedUnits.length}`,
                    `questions answered: ${(state.attempts || []).length}`,
                  ].join('\n');
                  Linking.openURL(
                    `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Catalyst beta feedback')}&body=${encodeURIComponent(body)}`
                  ).catch(() => Alert.alert('No mail app', `Please email ${FEEDBACK_EMAIL}`));
                }}
              />
            </Card>
          </>
        ) : null}

        <Text style={[T.tiny, { textAlign: 'center', marginTop: 18 }]}>{BUILD_LABEL}</Text>
      </ScrollView>
    </Screen>
  );
}

// ── Voice picker ─────────────────────────────────────────────
// A dropdown, collapsed to one row. It was a list of every English voice on
// the device, which on a phone with Google's engine installed is a dozen
// rows of radio buttons pushing everything below them off the screen — for a
// setting most students touch once.
//
// It has to exist at all because no platform reports whether a voice is
// female: expo-speech returns { identifier, name, quality, language } on iOS,
// Android and web alike. On iOS the name gives it away; on Android, Google's
// voices are called "en-au-x-aua-local" and give away nothing. So the voices
// are listed and each can be heard, and the student picks by ear.
function VoicePicker({ value, onChange }) {
  const [voices, setVoices] = React.useState([]);
  const [state, setState] = React.useState('loading');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = await loadVoiceList();
        if (!live) return;
        setVoices(list);
        setState(list.length ? 'ready' : 'empty');
      } catch (e) {
        if (live) setState('empty');
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const rows = [{ identifier: null, label: 'Chosen automatically', auto: true }, ...voices];
  const current = rows.find((v) => (v.identifier || null) === (value || null)) || rows[0];

  const summary =
    state === 'loading'
      ? 'Looking for voices…'
      : state === 'empty'
      ? 'None reported — using the device default'
      : current.label;

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={() => {
          if (state === 'ready') setOpen(!open);
        }}
        style={ac.voiceHead}
      >
        <Ionicons name="mic-outline" size={18} color={C.teal} />
        <View style={{ flex: 1 }}>
          <Text style={[T.body, { fontWeight: '600' }]}>Reading voice</Text>
          <Text style={T.tiny} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        {state === 'ready' ? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.sub} />
        ) : null}
      </Pressable>

      {/* Only mounted while open, so a collapsed picker costs one row. The
          list is capped and scrolls: a dozen voices must not push the rest of
          Account off the bottom of the screen. */}
      {open && state === 'ready' ? (
        <View style={ac.voiceList}>
          <ScrollView style={{ maxHeight: 232 }} nestedScrollEnabled>
            {rows.map((v) => {
              const selected = (v.identifier || null) === (value || null);
              return (
                <View key={v.identifier || 'auto'} style={ac.voiceRow}>
                  <Pressable
                    onPress={() => {
                      onChange(v.identifier || null);
                      setOpen(false);
                    }}
                    style={[ac.voicePick, selected && { borderColor: C.teal, backgroundColor: C.tealSoft }]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={selected ? C.teal : C.faint}
                    />
                    <Text
                      style={[T.body, { flex: 1 }, selected && { fontWeight: '700', color: C.teal }]}
                      numberOfLines={1}
                    >
                      {v.label}
                    </Text>
                    {v.likelyFemale ? <Pill label="female" kind="progress" /> : null}
                  </Pressable>
                  {/* Plays without selecting, so the list can be worked
                      through by ear before committing to one. */}
                  <Pressable onPress={() => speakSample(v.auto ? null : v)} hitSlop={8} style={ac.voicePlay}>
                    <Ionicons name="play" size={14} color={C.teal} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

// A setting that is on or off, with room for the one line of explanation
// that stops a student having to turn it on to find out what it does.
function ToggleRow({ icon, label, note, value, onChange, disabled }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, disabled && { opacity: 0.45 }]}>
      <Ionicons name={icon} size={18} color={C.teal} />
      <View style={{ flex: 1 }}>
        <Text style={[T.body, { fontWeight: '600' }]}>{label}</Text>
        {note ? <Text style={T.tiny}>{note}</Text> : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={onChange}
        disabled={!!disabled}
        trackColor={{ true: C.teal, false: C.track }}
        thumbColor="#FFF"
      />
    </View>
  );
}

function RowButton({ icon, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={ac.row}>
      <Ionicons name={icon} size={18} color={danger ? C.danger : C.teal} />
      <Text style={[T.body, { flex: 1, fontWeight: '600' }, danger && { color: C.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    </Pressable>
  );
}

const ac = StyleSheet.create({
  sectionTitle: { ...T.h3, marginTop: 20, marginBottom: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.tealSoft,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.teal, fontWeight: '800', fontSize: 20 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    padding: 12,
  },
  subscribeBtn: {
    backgroundColor: C.teal,
    borderRadius: R.sm,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    borderRadius: R.sm,
  },
  voiceHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  voiceList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: 6,
    gap: 6,
    backgroundColor: C.bg,
  },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  voicePick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  voicePlay: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
