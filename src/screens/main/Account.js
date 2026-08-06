// Account tab — the new fifth tab (bottom right).
// Profile placeholder, subscription status, access-code redemption
// entry point, settings placeholders and developer tools.

import React from 'react';
import { View, Text, ScrollView, Alert, Pressable, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R } from '../../theme';
import { Screen, Header, Card, Pill } from '../../components/ui';
import { useApp, PRICE, TRIAL_DAYS } from '../../state/store';
import { UNITS } from '../../content/content';

function fmtDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Account({ openRedeem }) {
  const { state, dispatch, isPremium, daysRemaining } = useApp();
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
                    `Structura Plus will be ${PRICE.monthly} ${PRICE.period}. Billing arrives with the RevenueCat build; until then, use an access code.`
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

        {/* Preferences (placeholders) */}
        <Text style={ac.sectionTitle}>Preferences</Text>
        <Card style={{ gap: 12 }}>
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

        {/* Developer (remove before release) */}
        <Text style={ac.sectionTitle}>Developer</Text>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="lock-open-outline" size={18} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Text style={[T.body, { fontWeight: '600' }]}>Unlock all lessons</Text>
              <Text style={T.tiny}>Every unit reachable, progression locks ignored</Text>
            </View>
            <Switch
              value={!!(state.dev && state.dev.unlockAll)}
              onValueChange={(v) => dispatch({ type: 'setDevFlag', flag: 'unlockAll', value: v })}
              trackColor={{ true: C.teal, false: C.track }}
              thumbColor="#FFF"
            />
          </View>
          <RowButton
            icon="construct-outline"
            label={isPremium ? 'Switch to Free (dev)' : 'Switch to Plus (dev)'}
            onPress={() =>
              isPremium
                ? dispatch({ type: 'clearPremium' })
                : dispatch({ type: 'grantPremium', plan: 'dev', premiumUntil: null, source: 'dev-toggle' })
            }
          />
          <RowButton
            icon="play-skip-forward-outline"
            label="Complete current unit"
            onPress={() => dispatch({ type: 'completeUnit', unitId: state.progress.current.unitId })}
          />
          <RowButton
            icon="flag-outline"
            label="Complete every authored unit"
            onPress={() =>
              UNITS.filter((u) => u.lessonList).forEach((u) =>
                dispatch({ type: 'completeUnit', unitId: u.id })
              )
            }
          />
          <RowButton
            icon="refresh-outline"
            label="Restart from unit 1"
            onPress={() => dispatch({ type: 'resetProgress' })}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color={C.sub} />
            <Text style={T.tiny}>
              At {UNITS.find((u) => u.id === state.progress.current.unitId)?.title || '—'} · lesson{' '}
              {state.progress.current.lesson} · {state.progress.completedUnits.length} unit
              {state.progress.completedUnits.length === 1 ? '' : 's'} complete
            </Text>
          </View>
        </Card>

        <Text style={[T.tiny, { textAlign: 'center', marginTop: 18 }]}>Structura - rebuild v0.1</Text>
      </ScrollView>
    </Screen>
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
});
