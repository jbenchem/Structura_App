// ─────────────────────────────────────────────────────────────
// Turning a practice sheet into a file the student can print.
//
// The HTML comes from practiceSheet.js (pure, tested); this module is only
// the device side: render to PDF, then hand it to the share sheet. Both
// steps degrade rather than throw — a device without a share sheet still
// gets the PDF path back, and a failure returns a reason to show rather
// than a crash.
// ─────────────────────────────────────────────────────────────

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { practiceSheetHtml } from './practiceSheet';

export async function printPracticeSheet(questions, meta = {}) {
  try {
    const html = practiceSheetHtml(questions, meta);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: meta.title || 'Catalyst practice',
        UTI: 'com.adobe.pdf',
      });
    }
    return { ok: true, uri };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'Could not make the sheet.' };
  }
}
