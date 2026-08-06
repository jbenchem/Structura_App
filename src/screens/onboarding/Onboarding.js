// Onboarding: Welcome → goal (1/3) → level (2/3) → name (3/3).
// The subscription screen (Paywall.js) follows as the finale.

import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T } from '../../theme';
import {
  Screen,
  StepBar,
  OptionCard,
  PrimaryButton,
  LinkButton,
  HexLogo,
  MoleculeDoodle,
  IconBadge,
} from '../../components/ui';

// ── 0. Welcome ───────────────────────────────────────────────
export function Welcome({ onStart }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <HexLogo size={36} />
          <Text style={[T.h1, { fontSize: 28 }]}>Structura</Text>
        </View>
        <Text style={ob.headline}>Learn organic{'\n'}nomenclature{'\n'}by doing</Text>
        <Text style={[T.sub, { textAlign: 'center', marginTop: 12, fontSize: 14 }]}>
          Name structures. Draw molecules.{'\n'}Understand every step.
        </Text>
        <View style={{ marginTop: 36 }}>
          <MoleculeDoodle />
        </View>
      </View>
      <View style={{ paddingBottom: 8, gap: 16 }}>
        <PrimaryButton label="Get started" onPress={onStart} />
        <LinkButton
          label="I already have an account"
          onPress={() =>
            Alert.alert(
              'Accounts are coming soon',
              'Sign-in and device syncing arrive with a later build. Continuing as a guest for now.',
              [{ text: 'OK', onPress: onStart }]
            )
          }
        />
      </View>
    </Screen>
  );
}

// ── 1. Learning goal ─────────────────────────────────────────
export function GoalStep({ value, onSelect, onBack, onContinue }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ paddingTop: 8, flex: 1 }}>
        <StepBar step={1} total={2} onBack={onBack} />
        <Text style={[T.h1, { textAlign: 'center', marginBottom: 24 }]}>
          What do you want to master?
        </Text>
        <OptionCard
          icon={<IconBadge name="shapes-outline" />}
          title="Naming structures"
          subtitle="Learn to name with confidence."
          selected={value === 'name'}
          onPress={() => onSelect('name')}
        />
        <OptionCard
          icon={<IconBadge name="create-outline" />}
          title="Drawing structures"
          subtitle="Build accurate molecules."
          selected={value === 'draw'}
          onPress={() => onSelect('draw')}
        />
        <OptionCard
          icon={<IconBadge name="sparkles-outline" />}
          title="Both"
          subtitle="Master naming and drawing."
          selected={value === 'both'}
          onPress={() => onSelect('both')}
        />
      </View>
      <View style={{ paddingBottom: 8 }}>
        <PrimaryButton label="Continue" onPress={onContinue} disabled={!value} />
      </View>
    </Screen>
  );
}

// ── 2. Name (feeds the Home greeting + future account) ───────
export function NameStep({ onBack, onDone }) {
  const [name, setName] = useState('');
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepBar step={2} total={2} onBack={onBack} />
        <Text style={[T.h1, { textAlign: 'center', marginBottom: 8 }]}>
          What should we call you?
        </Text>
        <Text style={[T.sub, { textAlign: 'center', marginBottom: 24 }]}>
          Used for greetings and, later, your account. You can change it anytime.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your first name"
          placeholderTextColor={C.faint}
          style={ob.input}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </ScrollView>
      <View style={{ paddingBottom: 8, gap: 14 }}>
        <PrimaryButton label="Start learning" onPress={() => onDone(name.trim())} />
        <LinkButton label="Skip for now" onPress={() => onDone('')} />
      </View>
    </Screen>
  );
}

const ob = StyleSheet.create({
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: C.navy,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.navy,
  },
});
