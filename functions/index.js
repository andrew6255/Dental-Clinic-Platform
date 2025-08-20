// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * A Cloud Function that runs daily to delete all bookings that have already passed.
 * This cleans up the database and ensures the 'upcoming bookings' queries remain efficient.
 */
exports.deletePastBookings = functions.pubsub
  // Schedule to run every day at 3:00 AM. You can adjust the schedule as needed.
  .schedule("every day 03:00")
  .timeZone("America/New_York") // Set to your timezone
  .onRun(async (context) => {
    const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
    
    // Log the start of the function run
    console.log(`Running job to delete bookings before ${today}`);

    // Query for the 'bookings' collection group to find all bookings
    const pastBookingsQuery = db.collectionGroup("bookings")
                                .where("date", "<", today);

    const snapshot = await pastBookingsQuery.get();

    if (snapshot.empty) {
      console.log("No past bookings to delete.");
      return null;
    }

    // Use a batched write to delete documents efficiently
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Scheduling deletion for booking: ${doc.ref.path}`);
      batch.delete(doc.ref);
    });

    // Commit the batched write
    await batch.commit();

    console.log(`Successfully deleted ${snapshot.size} past bookings.`);
    return null;
  });

  exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Only allow super-admins
  if (!(context.auth && context.auth.token && context.auth.token.role === 'admin_super')) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super-admins may delete other users.'
    );
  }
  const uid = data.uid;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing UID');
  }

  try {
    await admin.auth().deleteUser(uid);
    return { success: true };
  } catch (err) {
    console.error("Error deleting user in Auth:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});