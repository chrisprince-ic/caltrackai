import { get, ref } from 'firebase/database';
import { Alert, Share } from 'react-native';

import { getFirebaseDatabase } from '@/lib/firebase';

const MAX_SHARE_CHARS = 900_000;

export async function buildUserDataExportJson(uid: string): Promise<string> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}`));
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Macrovia',
    userId: uid,
    data: snap.exists() ? snap.val() : null,
  };
  return JSON.stringify(payload, null, 2);
}

/** Shares a JSON snapshot of `users/{uid}` for data-portability / review expectations. */
export async function shareUserDataExport(uid: string): Promise<void> {
  const text = await buildUserDataExportJson(uid);
  if (text.length > MAX_SHARE_CHARS) {
    Alert.alert(
      'Export too large',
      'Your synced data is too large to send in one share sheet. Contact support for a full archive.'
    );
    return;
  }
  await Share.share({
    message: text,
    title: 'Macrovia — my data export',
  });
}
