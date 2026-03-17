import * as admin from "firebase-admin";

function initAdminApp(): admin.app.App {
  console.log("FIREBASE ENV CHECK", {
    projectId:   !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  });

  if (admin.apps.length > 0) return admin.app();

  const serviceAccount = {
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(initAdminApp());
}
