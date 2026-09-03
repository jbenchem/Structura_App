// How structures are drawn in questions: the skeletal drawing the course
// teaches, or the condensed semi-structural formula the same molecule
// writes as. One context, read by every StaticMol on screen, so the toggle
// converts the whole question at once rather than one diagram at a time.
//
// Default 'skeletal': screens outside a question (the sandbox, the
// reference sheet) are unaffected because they provide no value.
import React from 'react';

export const DisplayModeContext = React.createContext('skeletal');
