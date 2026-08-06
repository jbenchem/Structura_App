// Tappable name — renders engine `parts` as spans. Tapping one
// tells the parent which part is active; the parent highlights the
// atoms that part describes. When `parts` is null (explain off)
// the plain name is rendered and nothing is tappable.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { C } from './constants';
import { STRUCT_FONT } from './fonts';
import { st } from './styles';
import { tap } from './haptics';

export function TappableName({ parts, name, active, onPick, size=19 }){
  if(!parts || !parts.length)
    return <Text style={[st.cardName, { fontSize:size }]}>{name}</Text>;
  return (
    <View style={st.nameRow}>
      {parts.map((p,i)=>{
        const dead = p.kind==="punctuation" || !p.atoms || !p.atoms.length;
        const on = active===i;
        return (
          <Pressable key={i} disabled={dead}
            onPress={()=>{ tap(); onPick(on ? null : i); }}>
            <Text style={[
              { fontSize:size, fontWeight:"800", color:C.navy,
                lineHeight:size*1.35, fontFamily:STRUCT_FONT },
              !dead && st.namePart,
              on && st.namePartOn,
            ]}>{p.text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ================= lookup screen ================= */
/* A short set that between them exercise a ring, a chain, stereochemistry, a
   trivial name and a deliberate error. Everything else is reachable by typing. */
