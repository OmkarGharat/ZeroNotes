
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore';

// Configuration from environment variables
// In Vercel, you set these in the Project Settings > Environment Variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase only if config is present
let db: any = null;
try {
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase Config missing. Sharing will not work.");
    }
} catch (e) {
    console.error("Firebase init error", e);
}

export const isFirebaseConfigured = () => !!db;

export const publishNoteToCloud = async (title: string, content: string): Promise<string> => {
    if (!db) throw new Error("Firebase is not configured. Please set environment variables.");

    // Create a URL-friendly slug from the title
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/(^-|-$)+/g, '') // Remove leading/trailing hyphens
        || 'untitled';

    // Append random characters to ensure uniqueness and prevent overwriting
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;

    try {
        await setDoc(doc(db, "shared_notes", slug), {
            title,
            content,
            createdAt: Date.now()
        });
        return slug;
    } catch (error) {
        console.error("Error publishing note:", error);
        throw error;
    }
};

export const fetchNoteFromCloud = async (slug: string): Promise<{title: string, content: string} | null> => {
    if (!db) return null;

    try {
        const docRef = doc(db, "shared_notes", slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as {title: string, content: string};
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching note:", error);
        return null;
    }
};

export const deleteNoteFromCloud = async (slug: string): Promise<void> => {
    if (!db) return; // Fail silently if no DB, or throw error depending on needs

    try {
        await deleteDoc(doc(db, "shared_notes", slug));
    } catch (error) {
        console.error("Error deleting note from cloud:", error);
        throw error;
    }
};
