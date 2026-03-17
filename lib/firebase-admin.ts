import * as admin from "firebase-admin";

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) throw new Error("FIREBASE_ADMIN_PRIVATE_KEY não definida.");

  // Remove aspas externas se coladas com elas (ex: "-----BEGIN...")
  let key = raw.trim().replace(/^["']|["']$/g, "");

  // Converte \n literal em quebra de linha real
  key = key.replace(/\\n/g, "\n");

  return key;
}

function initAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const privateKey = parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    } as admin.ServiceAccount),
  });
}

export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(initAdminApp());
}
