// Static molecule viewer: renders a molecule fitted and centered
// inside a fixed-height box. Used by lesson teach/quiz steps and
// structure-to-name questions.

import React from 'react';
import { View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { moleculeBBox } from '../../chem/model';
import { MoleculeShapes } from './MoleculeSvg';

export function MolView({ mol, height = 120, maxScale = 1.1, style, highlightAtoms, highlightBonds }) {
  const [size, setSize] = React.useState(null);
  const bb = moleculeBBox(mol);
  const pad = 26;
  const bw = bb.maxX - bb.minX + pad * 2;
  const bh = bb.maxY - bb.minY + pad * 2;

  return (
    <View
      style={[{ height, alignSelf: 'stretch' }, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size ? (
        <Svg width={size.w} height={size.h}>
          <G
            transform={`translate(${size.w / 2 - ((bb.minX + bb.maxX) / 2) * fit(size, bw, bh, maxScale)}, ${
              size.h / 2 - ((bb.minY + bb.maxY) / 2) * fit(size, bw, bh, maxScale)
            }) scale(${fit(size, bw, bh, maxScale)})`}
          >
            <MoleculeShapes mol={mol} highlightAtoms={highlightAtoms} highlightBonds={highlightBonds} />
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

function fit(size, bw, bh, maxScale) {
  return Math.min(size.w / bw, size.h / bh, maxScale);
}
