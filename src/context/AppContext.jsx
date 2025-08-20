import React, { useState, useEffect, createContext, useContext } from 'react';
import {
    initializeApp
} from 'firebase/app';
import {
    getAuth,
    signInWithCustomToken,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    onSnapshot,
    updateDoc,
    deleteDoc,
    addDoc
} from 'firebase/firestore';

// Define context for Firebase and User data
const AppContext = createContext(null);

// Custom hook to use the context
export const useAppContext = () => useContext(AppContext);

// App Provider Component
export const AppProvider = ({ children }) => {
    console.log("Rendering started.");

    // Define the fixed UID for the hardcoded super admin login
    const SUPER_ADMIN_FIXED_UID = 'church-super-admin-master-uid';

    const [firebaseServices, setFirebaseServices] = useState(() => ({ app: null, auth: null, db: null }));
    console.log("Current firebaseServices state (immediately after useState):", firebaseServices);

    const [currentUser, setCurrentUser] = useState(null); // Firebase Auth User object
    const [userId, setUserId] = useState(null); // UID of the current user (Firebase UID, SUPER_ADMIN_FIXED_UID, or random string for pure guest)
    const [userRole, setUserRole] = useState('loading'); // 'loading', 'guest', 'user', 'admin_level1', 'admin_level2', 'admin_super'
    const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if Firebase Auth is initialized and initial check done
    const [showAuthScreen, setShowAuthScreen] = useState(false); // Controls visibility of WelcomeScreen/AuthScreen
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Explicitly track Firebase Auth status
    const [meetingsInfo, setMeetingsList] = useState({});
    const [tripsList, setTripsList] = useState([]);
    const [membershipRenewalInfo, setMembershipRenewalInfo] = useState({});
    const [liveStreamingList, setLiveStreamingList] = useState([]);
    const [extraPermissions, setExtraPermissions] = useState([]);

    // Application data states
    const [announcements, setAnnouncements] = useState(() => []);
    const [massVespersSchedules, setMassVespersSchedules] = useState(() => []);
    const [dailyReadings, setDailyReadings] = useState(() => []);
    const [churchMeetings, setChurchMeetings] = useState(() => []);
    const [contactInfo, setContactInfo] = useState(() => ({}));
    const [donationsInfo, setDonationsInfo] = useState(() => ({}));
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [roomBookings, setRoomBookings] = useState([]);
    const [trinityProgramsInfo, setTrinityProgramsInfo] = useState({});

    // UI states (for modals and selected items for editing)
    const [modalContent, setModalContent] = useState('');
    const [modalOnConfirm, setModalOnConfirm] = useState(null);
    const [modalType, setModalType] = useState('info'); // 'info', 'error', 'confirm'
    const [showModal, internalSetShowModal] = useState(false);

    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedReading, setSelectedReading] = useState(null);
    const [selectedMeeting, setSelectedMeeting] = useState(null);

    // User profile details (separate from Firebase Auth user object, from Firestore)
    const [userFirstName, setUserFirstName] = useState('');
    const [userLastName, setUserLastName] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userEmailProfile, setUserEmailProfile] = useState('');
    const [userMembershipId, setUserMembershipId] = useState('');
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);


    // Helper function for showing modal messages and confirmations
    const showModalMessage = (message, type = 'info', onConfirm = null) => {
        setModalContent(message);
        setModalType(type);
        setModalOnConfirm(() => onConfirm); // Use a functional update to prevent stale closures
        internalSetShowModal(true);
    };

    const closeModal = () => {
        internalSetShowModal(false);
        setModalContent('');
        setModalOnConfirm(null);
        setModalType('info');
    };

    // Helper to get app ID (from global variable or default)
    const getAppId = () => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'maraashly-church';
        console.log("getAppId called, returning:", appId);
        return appId;
    };
    
    // Initialize Firebase (runs once on component mount)
    useEffect(() => {
        let initializedApp = null;
        let authInstance = null;
        let firestoreInstance = null;
        let unsubscribeAuth = () => {};

        try {
            console.log("useEffect for Firebase initialization started.");
            const firebaseConfig = {
              apiKey: "AIzaSyAc6xrsFM_d-CzzIWmlsrcCf5zo0OVZw0g",
              authDomain: "dental-clinic-platform.firebaseapp.com",
              projectId: "dental-clinic-platform",
              storageBucket: "dental-clinic-platform.firebasestorage.app",
              messagingSenderId: "343441834039",
              appId: "1:343441834039:web:8b366c8e0ee60fd236bfb2",
              measurementId: "G-1R6S243P9B"
            };

            // Canvas specific __firebase_config injection
            if (typeof __firebase_config !== 'undefined' && __firebase_config) {
                try {
                    const canvasConfig = JSON.parse(__firebase_config);
                    Object.assign(firebaseConfig, canvasConfig); // Merge Canvas config
                    console.log("Firebase Config loaded from __firebase_config.");
                } catch (e) {
                    console.warn("Could not parse __firebase_config JSON:", e);
                }
            }

            if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY") {
                console.error("FATAL - Firebase config is empty or apiKey is missing/placeholder. Please update firebaseConfig.");
                showModalMessage("Application configuration missing or incomplete. Please contact support and ensure Firebase config is set.", 'error');
                setIsAuthReady(true);
                return;
            }
            console.log("Firebase Project ID being used:", firebaseConfig.projectId);

            initializedApp = initializeApp(firebaseConfig);
            authInstance = getAuth(initializedApp);
            firestoreInstance = getFirestore(initializedApp);

            setFirebaseServices({ app: initializedApp, auth: authInstance, db: firestoreInstance });
            console.log("Firebase services states updated. (Auth, DB initialized)");

            if (authInstance && firestoreInstance) {
                console.log("Setting up onAuthStateChanged listener.");
                unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
                    console.log("onAuthStateChanged triggered. User:", user ? user.uid : "null", "isAnonymous:", user?.isAnonymous);
                    if (user) {
                        setCurrentUser(user);
                        setUserId(user.uid);

                        if (!user.isAnonymous) {
                            setIsAuthenticated(true); // Truly authenticated user
                            console.log("onAuthStateChanged: User is NOT anonymous. Fetching profile.");
                            const currentAppId = getAppId();
                            const userRef = doc(firestoreInstance, `artifacts/${currentAppId}/public/data/users`, user.uid);

                            try {
                                const userSnap = await getDoc(userRef);
                                if (userSnap.exists()) {
                                    const userData = userSnap.exists() ? userSnap.data() : {};
                                    setUserRole(userData.role || 'user');
                                    setUserFirstName(userData.firstName || '');
                                    setUserLastName(userData.lastName || '');
                                    setUserPhone(userData.phone || '');
                                    setUserEmailProfile(userData.email || user.email || '');
                                    setUserMembershipId(userData.membershipId || '');
                                    setExtraPermissions(Array.isArray(userData.extraPermissions)  ? userData.extraPermissions   : []);

                                    if (user.uid !== SUPER_ADMIN_FIXED_UID && (!userData.firstName || !userData.lastName || !userData.phone || !userData.email)) {
                                        setShowProfileCompletion(true);
                                    } else {
                                        setShowProfileCompletion(false);
                                    }
                                    console.log("onAuthStateChanged: Authenticated user data loaded from Firestore. Role:", userData.role);
                                    setShowAuthScreen(false);
                                } else {
                                    console.warn("onAuthStateChanged: Authenticated user in Auth but not in Firestore 'users' collection. Creating basic record.");
                                    const initialRole = 'user';
                                    await setDoc(userRef, {
                                        uid: user.uid,
                                        email: user.email || 'unknown@churchapp.com',
                                        role: initialRole,
                                        extraPermissions: [],
                                        createdAt: new Date().toISOString(),
                                        firstName: '', lastName: '', phone: '', membershipId: ''
                                    });
                                    setUserRole(initialRole);
                                    setExtraPermissions([]);
                                    setShowProfileCompletion(true);
                                    setShowAuthScreen(false);
                                }
                            } catch (firestoreError) {
                                console.error("onAuthStateChanged: Error fetching or creating user document in Firestore:", firestoreError);
                                showModalMessage(`Error accessing user data: ${firestoreError.message}`, 'error');
                                handleSignOut();
                            }
                        } else {
                            // This is an anonymous user (from priming or direct "View Public Content" action)
                            console.log("onAuthStateChanged: User is anonymous. Setting role to guest.");
                            setUserRole('guest');
                            setIsAuthenticated(false); // Not credential-authenticated
                            setShowAuthScreen(false); // Directly show public content
                            setShowProfileCompletion(false); // No profile needed for anonymous/guest
                        }
                    } else {
                        // No Firebase user active (logged out or never logged in explicitly)
                        console.log("onAuthStateChanged: No Firebase user active. Resetting states to prompt login/register.");
                        setCurrentUser(null);
                        setUserId(null);
                        setUserRole('guest');
                        setIsAuthenticated(false);
                        setUserFirstName('');
                        setUserLastName('');
                        setUserPhone('');
                        setUserEmailProfile('');
                        setUserMembershipId('');
                        setShowProfileCompletion(false);
                        setShowAuthScreen(false); // Show auth screen
                    }
                    setIsAuthReady(true);
                    console.log("onAuthStateChanged: isAuthReady set to true. Current showAuthScreen:", showAuthScreen);
                });

                // Handle initial authentication from Canvas token (if available)
                const initialAuthToken = typeof __initial_auth_token !== 'undefined'
                    ? __initial_auth_token
                    : null;

                if (initialAuthToken) {
                    console.log("Attempting sign-in with custom token (Canvas mode)...");
                    signInWithCustomToken(authInstance, initialAuthToken).then(() => {
                        console.log("Signed in with custom token.");
                    }).catch(error => {
                        console.error("Error signing in with custom token:", error);
                        showModalMessage("Automatic login failed. Please login manually.", 'error');
                        setIsAuthReady(true);
                        setShowAuthScreen(false); // Show login screen if token fails
                    });
                } else {
                    // If no Canvas token, attempt anonymous sign-in to prime Auth
                    console.log("No initial Canvas token. Attempting anonymous sign-in to prime Auth service.");
                    console.log("Skipping anonymous sign-in — viewing as guest only.");
                        setIsAuthReady(true);
                        setShowAuthScreen(false);

                }
            } else {
                console.error("Firebase Auth or Firestore instances are null after initialization attempt.");
                showModalMessage("Firebase services failed to initialize. Please check your configuration and network.", 'error');
                setIsAuthReady(true);
                setShowAuthScreen(true); // Always show auth screen if critical Firebase services fail
            }
        } catch (error) {
            console.error("FATAL - Top-level error during Firebase initialization useEffect:", error);
            showModalMessage(`Failed to initialize application: ${error.message}. Please check your Firebase configuration.`, 'error');
            setIsAuthReady(true);
            setShowAuthScreen(true); // Always show auth screen if critical Firebase services fail
        }

        return () => {
            console.log("Cleaning up Firebase initialization useEffect.");
            unsubscribeAuth();
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Firestore data listeners (dependent on Firebase initialization and auth readiness)
    useEffect(() => {
        console.log("Data listeners useEffect triggered. DB available:", !!firebaseServices.db, "isAuthReady:", isAuthReady);
        if (!firebaseServices.db || !isAuthReady) {
            console.log("Data listeners: Pre-requisites not met. Skipping data listeners setup.");
            return;
        }

        const dbInstance = firebaseServices.db;
        const appId = getAppId();
        console.log(`AppProvider: Data listeners: Setting up listeners for appId: ${appId}`);

        const unsubscribeFunctions = [];

        unsubscribeFunctions.push(
          onSnapshot(
            doc(dbInstance,
                `artifacts/${appId}/public/data/trinityProgramsInfo`,
                'mainTrinityPrograms'),
            docSnap => {
              if (docSnap.exists()) {
                setTrinityProgramsInfo(docSnap.data());
              } else {
                setTrinityProgramsInfo({});
              }
            },
            err => console.error("TrinityProgramsInfo listen error:", err)
          )
        );

        unsubscribeFunctions.push(
          onSnapshot(
            collection(dbInstance, `artifacts/${appId}/public/data/liveStreamingInfo`),
            snap => {
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              // sort by createdAt ascending
              list.sort((a, b) =>
                (a.createdAt || '') < (b.createdAt || '') ? -1 : 1
              );
              setLiveStreamingList(list);
            },
            error => console.error("LiveStreamingInfo listen error:", error)
          )
        );

        // Listen for Announcements
        unsubscribeFunctions.push(onSnapshot(collection(dbInstance, `artifacts/${appId}/public/data/announcements`), (snapshot) => {
            const fetchedAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedAnnouncements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAnnouncements(fetchedAnnouncements);
            console.log("Data listeners: Announcements fetched:", fetchedAnnouncements.length);
        }, (error) => {
            console.error("Data listeners: Error fetching announcements:", error);
            // showModalMessage("Failed to load announcements. Please check permissions.", 'error'); // Remove persistent modal for common data
        }));

        unsubscribeFunctions.push(
          onSnapshot(
            collection(dbInstance, `artifacts/${appId}/public/data/tripsInfo`),
            snap => {
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              // sort by createdAt ascending
              list.sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
              setTripsList(list);
            },
            error => console.error("TripsInfo listen error:", error)
          )
        );

        
        // Listen for Mass & Vespers Schedules
        unsubscribeFunctions.push(onSnapshot(collection(dbInstance, `artifacts/${appId}/public/data/massVespersSchedules`), (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMassVespersSchedules(fetchedSchedules);
            console.log("Data listeners: Mass & Vespers Schedules fetched:", fetchedSchedules.length);
        }, (error) => {
            console.error("Data listeners: Error fetching mass/vespers schedules:", error);
            // showModalMessage("Failed to load mass/vespers schedules. Please check permissions.", 'error');
        }));

        // Listen for Daily Readings
        unsubscribeFunctions.push(
        onSnapshot(
          collection(dbInstance, `artifacts/${appId}/public/data/dailyReadings`),
          (snapshot) => {
            const fetchedReadings = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setDailyReadings(fetchedReadings);
            console.log("Data listeners: Daily Readings fetched:", fetchedReadings.length);
          },
          (error) => {
            console.error("Data listeners: Error fetching daily readings:", error);
          }
        ));

        // Listen for Church Meetings (Public)
        unsubscribeFunctions.push(
          onSnapshot(
            collection(firebaseServices.db, `artifacts/${getAppId()}/public/data/meetingsInfo`),
            snap => {
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              // sort by creation time or any criteria you like:
              list.sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
              setMeetingsList(list);
            },
            err => console.error("Meeting list listen error:", err)
          )
        );

        // Listen for Contact Info (single document)
        unsubscribeFunctions.push(
          onSnapshot(
            doc(dbInstance, `artifacts/${appId}/public/data/contactInfo`, 'mainContact'),
            (docSnap) => {
              if (docSnap.exists()) {
                setContactInfo(docSnap.data());   // ← contactInfo now holds { infoText: "...", ... }
              } else {
                setContactInfo({});
              }
            }
          )
        );
        
        unsubscribeFunctions.push(
          onSnapshot(
            doc(
              firebaseServices.db,
              `artifacts/${getAppId()}/public/data/membershipRenewalInfo`,
              'mainMembershipRenewal'
            ),
            docSnap => {
              if (docSnap.exists()) {
                setMembershipRenewalInfo(docSnap.data());
              } else {
                setMembershipRenewalInfo({});
              }
            },
            err => console.error("MembershipRenewalInfo listen error:", err)
          )
        );

        // Listen for Donations Info (single document)
        // Inside AppProvider's useEffect for Firestore listeners:
        unsubscribeFunctions.push(
        onSnapshot(
            doc(
              firebaseServices.db,
              `artifacts/${getAppId()}/public/data/donationsInfo`,
              'mainDonations'
            ),
            (docSnap) => {
              if (docSnap.exists()) {
                setDonationsInfo(docSnap.data());
              } else {
                setDonationsInfo({});
              }
            },
            (error) => {
              console.error("Error fetching donationsInfo:", error);
            }
          )
        );


        // Cleanup subscriptions
        return () => {
            console.log("Data listeners: Cleaning up Firestore listeners.");
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }, [firebaseServices.db, isAuthReady]); // Re-run if DB or auth readiness changes

    useEffect(() => {
      if (!firebaseServices.db || !isAuthReady) return;
      const appId = getAppId();
      const unsub = onSnapshot(
        collection(firebaseServices.db, `artifacts/${appId}/public/data/rooms`),
        snap => setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => console.error("Rooms listen error", err)
      );
      return unsub;
    }, [firebaseServices.db, isAuthReady]);

    // useEffect(() => {
    //   if (!firebaseServices.db || !isAuthReady) return;
    //   const db = firebaseServices.db;
    //   const appId = getAppId();
    //   // Listen to all roomBookings under public/data/roomBookings
    //   const unsub = onSnapshot(
    //     collection(db, `artifacts/${appId}/public/data/roomBookings`),
    //     snap => {
    //       const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    //       // sort or filter here if needed
    //       setRoomBookings(fetched);
    //     },
    //     err => console.error("RoomBookings listen error", err)
    //   );
    //   return unsub;
    // }, [firebaseServices.db, isAuthReady]);


    // Role-based permissions check
    const hasPermission = (requiredRoleLevel) => {
        const roleHierarchy = {
            'guest': -1,
            'user': 0,
            'admin_level1': 1,
            'admin_level2': 2,
            'admin_super': 3
        };
        const currentLevel = roleHierarchy[userRole] || -1;
        const requiredLevel = roleHierarchy[requiredRoleLevel] || -1;
        return currentLevel >= requiredLevel;
    };

    // Grant access if user is admin_level2+, super-admin, or has the extra tab key
    const hasTabAccess = tabKey => {
      if (hasPermission('admin_level2') || hasPermission('admin_super')) return true;
      return extraPermissions.includes(tabKey);
    };
    // Called by UserManagementView to push changes back to Firestore
    const updateUserPermissions = async (targetUid, newPerms) => {
      const userRef = doc(db, `artifacts/${getAppId()}/public/data/users`, targetUid);
      await updateDoc(userRef, { extraPermissions: newPerms });
      // if you just updated _your_ own perms, refresh local state:
      if (targetUid === userId) setExtraPermissions(newPerms);
    };

    const handleSignOut = async () => {
      try {
        console.log("Attempting sign out...");
    
        // If this is the hard-coded Super Admin, just wipe the state:
        if (userId === SUPER_ADMIN_FIXED_UID) {
          console.log("Signing out Super Admin bypass.");
          setCurrentUser(null);
          setUserId(null);
          setUserRole('guest');
          setIsAuthenticated(false);
          setShowAuthScreen(true);
          showModalMessage("Signed out successfully.", 'info');
          return;
        }
    
        // Otherwise, do a normal Firebase sign-out
        if (firebaseServices.auth) {
          await signOut(firebaseServices.auth);
          // onAuthStateChanged listener will reset everything for us
        }
        showModalMessage("Signed out successfully.", 'info');
      } catch (error) {
        console.error("Error signing out:", error);
        showModalMessage(`Failed to sign out: ${error.message}`, 'error');
      }
    };


    // --- User Profile Functions ---
    const updateUserProfile = async (profileData) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }

        try {
            console.log("Attempting to update user profile:", profileData);
            const userRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/users`, userId);
            await setDoc(userRef, {
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                phone: profileData.phone,
                email: profileData.email,
                membershipId: profileData.membershipId || null,
                uid: userId,
                role: userRole,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            setUserFirstName(profileData.firstName);
            setUserLastName(profileData.lastName);
            setUserPhone(profileData.phone);
            setUserEmailProfile(profileData.email);
            setUserMembershipId(profileData.membershipId || '');
            setShowProfileCompletion(false);
            showModalMessage("Profile updated successfully!", 'info');
            console.log("User profile updated.");
        } catch (error) {
            console.error("Error updating user profile:", error);
            let errorMessage = `Failed to update profile: ${error.message}`;
            // Removed FirebaseError instanceof check
            showModalMessage(errorMessage, 'error');
        }
    };


    // --- Announcement Functions ---
    const addAnnouncement = async (announcementData) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        if (!hasPermission('admin_level1') && !hasTabAccess('public_announcements')) { showModalMessage("You do not have permission to create announcements.", 'error'); return; }
        try {
            console.log("Adding announcement:", announcementData);
            await addDoc(collection(firebaseServices.db, `artifacts/${getAppId()}/public/data/announcements`), {
                ...announcementData,
                scope: announcementData.scope || 'public',
                status: announcementData.status || (announcementData.scope==='public'?'draft':'published'),
                authorId: userId,
                authorFirstName: userFirstName,    // ← new
                authorLastName:  userLastName,     // ← new
                createdAt:       new Date().toISOString(),
                updatedAt:       new Date().toISOString()
            });
            showModalMessage("Announcement created successfully", 'info');
            console.log("Announcement added.");
        } catch (error) {
            console.error("Error adding announcement:", error);
            let errorMessage = `Failed to create announcement: ${error.message}`;
            // Removed FirebaseError instanceof check
            showModalMessage(errorMessage, 'error');
        }
    };

    const updateAnnouncement = async (id, updatedData) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        const currentAnn = announcements.find(a => a.id === id);

        if (currentAnn && currentAnn.authorId !== userId && !hasPermission('admin_level2') && !hasTabAccess('public_announcements')) {
            showModalMessage("You do not have permission to update this announcement.", 'error');
            return;
        }
        try {
            console.log("Updating announcement:", id, updatedData);
            const annRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/announcements`, id);
            await updateDoc(annRef, { ...updatedData, updatedAt: new Date().toISOString() });
            showModalMessage("Announcement updated successfully.", 'info');
            console.log("Announcement updated.");
        } catch (error) {
            console.error("Error updating announcement:", error);
            let errorMessage = `Failed to update announcement: ${error.message}`;
            // Removed FirebaseError instanceof check
            showModalMessage(errorMessage, 'error');
        }
    };

    const deleteAnnouncement = async (id) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        if (!hasPermission('admin_super') && !hasPermission('admin_level2') && !hasTabAccess('public_announcements')) { showModalMessage("You do not have permission to delete announcements.", 'error'); return; }

        showModalMessage(
            "Are you sure you want to delete this announcement permanently? This action cannot be undone.",
            'confirm',
            async () => {
                try {
                    console.log("Deleting announcement:", id);
                    const annRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/announcements`, id);
                    await deleteDoc(annRef);
                    showModalMessage("Announcement deleted.", 'info');
                    console.log("Announcement deleted.");
                } catch (error) {
                    console.error("Error deleting announcement:", error);
                    let errorMessage = `Failed to delete announcement: ${error.message}`;
                    // Removed FirebaseError instanceof check
                    showModalMessage(errorMessage, 'error');
                }
                closeModal();
            }
        );
    };

    
    // --- Generic Content Management Functions (Admin Level 2 & Super Admin) ---
    // Used for Mass Schedules, Daily Readings, Public Meetings, Contact Info, Donations Info
    const updateContent = async (collectionName, docId, data) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        const tabKeyMap = {
          contactInfo: 'contact',
          dailyReadings: 'daily_readings',
          donationsInfo: 'donations',
          meetingsInfo: 'public_meetings',
          tripsInfo: 'trips_activities',
          membershipRenewalInfo: 'membership_renewal',
          trinityProgramsInfo: 'trinity_programs'
          // …etc.
        };
        const key = tabKeyMap[collectionName];
        if (!hasTabAccess(key) && !hasTabAccess('public_announcements') ) { showModalMessage("You do not have permission to update this content.", 'error'); return; }
        try {
            console.log(`AppProvider: Updating content in ${collectionName}/${docId}:`, data);
            const docRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/${collectionName}`, docId);
            await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
            showModalMessage("Content updated successfully!", 'info');
            console.log("Content updated.");
        } catch (error) {
            console.error(`AppProvider: Error updating content in ${collectionName}/${docId}:`, error);
            let errorMessage = `Failed to update content: ${error.message}`;
            // Removed FirebaseError instanceof check
            showModalMessage(errorMessage, 'error');
        }
    };

    const addContent = async (collectionName, data) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        const tabKeyMap = {
          contactInfo: 'contact',
          dailyReadings: 'daily_readings',
          donationsInfo: 'donations',
          meetingsInfo: 'public_meetings',
          tripsInfo: 'trips_activities',
          membershipRenewalInfo: 'membership_renewal',
          trinityProgramsInfo: 'trinity_programs'
          // …etc.
        };
        const key = tabKeyMap[collectionName];
        if (!hasTabAccess(key)) { showModalMessage("You do not have permission to add this content.", 'error'); return; }
        try {
            console.log(`AppProvider: Adding content to ${collectionName}:`, data);
            await addDoc(collection(firebaseServices.db, `artifacts/${getAppId()}/public/data/${collectionName}`), {
                ...data,
                createdAt: new Date().toISOString(),
                createdBy: userId,
            });
            showModalMessage("Content added successfully!", 'info');
            console.log("Content added.");
        } catch (error) {
            console.error(`AppProvider: Error adding content to ${collectionName}:`, error);
            let errorMessage = `Failed to add content: ${error.message}`;
            // Removed FirebaseError instanceof check
            showModalMessage(errorMessage, 'error');
        }
    };

    const deleteContent = async (collectionName, docId) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        const tabKeyMap = {
          contactInfo: 'contact',
          dailyReadings: 'daily_readings',
          donationsInfo: 'donations',
          meetingsInfo: 'public_meetings',
          tripsInfo: 'trips_activities',
          membershipRenewalInfo: 'membership_renewal',
          trinityProgramsInfo: 'trinity_programs'
          // …etc.
        };
        const key = tabKeyMap[collectionName];
        if (!hasTabAccess(key)) { showModalMessage("You do not have permission to delete this content.", 'error'); return; }

        showModalMessage(
            `Are you sure you want to delete this item from ${collectionName}? This action cannot be undone.`,
            'confirm',
            async () => {
                try {
                    console.log(`AppProvider: Deleting content from ${collectionName}/${docId}`);
                    const docRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/${collectionName}`, docId);
                    await deleteDoc(docRef);
                    showModalMessage("Item deleted successfully!", 'info');
                    console.log("Item deleted.");
                } catch (error) {
                    console.error(`AppProvider: Error deleting content from ${collectionName}/${docId}:`, error);
                    let errorMessage = `Failed to delete item: ${error.message}`;
                    // Removed FirebaseError instanceof check
                    showModalMessage(errorMessage, 'error');
                }
                closeModal();
            }
        );
    };

    // --- User Management Functions (Super Admin only) ---
    const updateUserRole = async (targetUid, newRole) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        if (!hasPermission('admin_super')) { showModalMessage("You do not have permission to change user roles.", 'error'); return; }
        if (targetUid === SUPER_ADMIN_FIXED_UID && newRole !== 'admin_super') {
            showModalMessage("The primary Super Admin's role cannot be changed from 'admin_super'.", 'error');
            return;
        }
        if (targetUid === userId) {
            showModalMessage("You cannot change your own role.", 'error');
            return;
        }

        showModalMessage(
            async () => {
                try {
                    console.log(`AppProvider: Updating role for user ${targetUid} to ${newRole}`);
                    const userRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/users`, targetUid);
                    await updateDoc(userRef, { role: newRole, updatedAt: new Date().toISOString() });
                    showModalMessage(`User ${targetUid.substring(0,8)}... role updated to ${newRole}.`, 'info');
                    console.log(`AppProvider: User role updated.`);
                } catch (error) {
                    console.error("Error updating user role:", error);
                    let errorMessage = `Failed to update user role: ${error.message}`;
                    // Removed FirebaseError instanceof check
                    showModalMessage(errorMessage, 'error');
                }
                closeModal();
            }
        );
    };

    const deleteUserRecord = async (targetUid) => {
        if (!firebaseServices.db || !userId) { showModalMessage("Database not ready or not signed in.", 'error'); return; }
        if (!hasPermission('admin_super')) { showModalMessage("You do not have permission to delete user records.", 'error'); return; }
        if (targetUid === SUPER_ADMIN_FIXED_UID) {
            showModalMessage("The primary Super Admin's record cannot be deleted.", 'error');
            return;
        }
        if (targetUid === userId) {
            showModalMessage("You cannot delete your own user record.", 'error');
            return;
        }

        showModalMessage(
            `Are you sure you want to delete the user record for ${targetUid.substring(0,8)}...? This will NOT delete their Firebase Auth account, only their profile data.`,
            'confirm',
            async () => {
                try {
                    console.log(`AppProvider: Deleting user record for ${targetUid}`);
                    const userRef = doc(firebaseServices.db, `artifacts/${getAppId()}/public/data/users`, targetUid);
                    await deleteDoc(userRef);
                    showModalMessage(`User record for ${targetUid.substring(0,8)}... deleted.`, 'info');
                    console.log("User record deleted.");
                } catch (error) {
                    console.error("Error deleting user record:", error);
                    let errorMessage = `Failed to delete user record: ${error.message}`;
                    // Removed FirebaseError instanceof check
                    showModalMessage(errorMessage, 'error');
                }
                closeModal();
            }
        );
    };


    // Provide context values
    const contextValue = {
        // Firebase Services & Auth State
        firebaseApp: firebaseServices.app,
        auth: firebaseServices.auth,
        db: firebaseServices.db,
        currentUser,
        userId,
        setUserId,
        userRole,
        setUserRole,
        isAuthReady,
        isAuthenticated,
        setCurrentUser,
        setShowAuthScreen,
        showAuthScreen,
        setShowProfileCompletion,
        showProfileCompletion,

        // User Profile Data
        userFirstName,
        setUserFirstName,
        userLastName,
        setUserLastName,
        userPhone,
        setUserPhone,
        userEmailProfile,
        setUserEmailProfile,
        userMembershipId,
        setUserMembershipId,
        updateUserProfile,
        extraPermissions,

        // Global UI / Helpers
        showModal: showModalMessage,
        closeModal,
        modal: { isOpen: showModal, message: modalContent, onConfirm: modalOnConfirm, type: modalType },
        getAppId,
        handleSignOut,

        // Permissions
        hasPermission,

        // Application Data
        announcements,
        massVespersSchedules,
        dailyReadings,
        churchMeetings,
        contactInfo,
        donationsInfo,
        meetingsInfo,
        tripsList,
        membershipRenewalInfo,
        trinityProgramsInfo,
        liveStreamingList,

        // Actions for Data Manipulation
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        updateContent,
        addContent,
        deleteContent,
        updateUserRole,
        deleteUserRecord,
        updateUserPermissions,
        hasTabAccess,

        // Selected items for forms (for editing)
        selectedAnnouncement,
        setSelectedAnnouncement,
        selectedSchedule,
        setSelectedSchedule,
        selectedReading,
        setSelectedReading,
        selectedMeeting,
        setSelectedMeeting,
        rooms,
        setRooms,
        bookings: roomBookings,    // you can drop old roomBookings if unused
        selectedRoom,
        setSelectedRoom,
        roomBookings,      // ← newly defined
        setRoomBookings,

        // Constants
        SUPER_ADMIN_FIXED_UID,
    };

    console.log("contextValue being provided (snapshot at render):", {
        userId: contextValue.userId,
        userRole: contextValue.userRole,
        isAuthReady: contextValue.isAuthReady,
        isAuthenticated: contextValue.isAuthenticated,
        showAuthScreen: contextValue.showAuthScreen,
        showProfileCompletion: contextValue.showProfileCompletion,
        authExists: !!contextValue.auth,
        dbExists: !!contextValue.db,
        announcementsCount: contextValue.announcements.length
    });

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};