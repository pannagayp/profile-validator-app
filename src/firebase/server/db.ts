import {
  addDoc,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';

/**
 * Server-safe function to add a document to a Firestore collection.
 * This function can be safely used in Server Actions and Genkit flows.
 * @param colRef The CollectionReference to add the document to.
 * @param data The data for the new document.
 * @returns A Promise that resolves with the DocumentReference of the newly created document.
 */
export async function addDocument(
  colRef: CollectionReference<DocumentData>,
  data: any
) {
  try {
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (error) {
    console.error('Error adding document on the server:', error);
    // In a real application, you might want to throw the error
    // or handle it in a more sophisticated way (e.g., logging to a service).
    throw new Error('Failed to add document to Firestore.');
  }
}
