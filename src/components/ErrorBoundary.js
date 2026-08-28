// ─────────────────────────────────────────────────────────────
// Error boundary.
//
// A render fault in React Native leaves a white screen and nothing else: no
// message, no way back, and a tester who can only report "it broke". Three
// such faults shipped from this codebase in a single week — a missing import
// each time, each invisible until the screen was opened.
//
// This catches them, says what happened, and offers a way out. In a beta the
// difference between "it broke" and "it broke on the Progress tab, and here is
// the message" is the difference between a report you can act on and one you
// cannot.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { C, R, T } from '../theme';
import { SHOW_FEEDBACK, FEEDBACK_EMAIL, BUILD_LABEL } from '../config';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Left deliberately: in a dev build this is how the fault is found.
    if (console && console.error) console.error('Catalyst crashed:', error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  report = () => {
    const { error, info } = this.state;
    const body = [
      'What I was doing when it broke:',
      '',
      '',
      '--- please leave the lines below ---',
      `build: ${BUILD_LABEL}`,
      `where: ${this.props.label || 'unknown screen'}`,
      `error: ${error && error.message}`,
      (info && info.componentStack ? info.componentStack.split('\n').slice(0, 6).join('\n') : ''),
    ].join('\n');
    Linking.openURL(
      `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Catalyst crash')}&body=${encodeURIComponent(body)}`
    ).catch(() => {});
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={eb.wrap}>
        <ScrollView contentContainerStyle={eb.inner}>
          <Text style={eb.title}>Something broke</Text>
          <Text style={eb.body}>
            This is a fault in the app, not something you did. Going back should get you
            working again — and if you tell us what you were doing, we can fix it.
          </Text>

          <View style={eb.detail}>
            <Text style={eb.detailLabel}>WHAT WENT WRONG</Text>
            <Text style={eb.detailText}>{String(error.message || error)}</Text>
            {this.props.label ? <Text style={eb.detailWhere}>on {this.props.label}</Text> : null}
          </View>

          <Pressable style={eb.primary} onPress={this.reset}>
            <Text style={eb.primaryTxt}>Go back</Text>
          </Pressable>

          {SHOW_FEEDBACK ? (
            <Pressable style={eb.ghost} onPress={this.report}>
              <Text style={eb.ghostTxt}>Report this</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  inner: { padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: C.navy },
  body: { fontSize: 15, color: C.sub, lineHeight: 22 },
  detail: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 14,
    marginTop: 6,
  },
  detailLabel: { fontSize: 10, fontWeight: '800', color: C.faint, letterSpacing: 0.7 },
  detailText: { fontSize: 13.5, color: C.navy, marginTop: 6, fontFamily: 'monospace' },
  detailWhere: { fontSize: 12, color: C.sub, marginTop: 6 },
  primary: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghost: {
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: R.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostTxt: { color: C.teal, fontSize: 15, fontWeight: '700' },
});
