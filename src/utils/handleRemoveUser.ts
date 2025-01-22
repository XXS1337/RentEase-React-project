import { collection, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Type definition for setUsers function
type SetUsersFunction<T> = React.Dispatch<React.SetStateAction<T[]>> | null;

// Function to handle the complete removal of a user and their related data
const handleRemoveUser = async <T extends { id: string }>(userId: string, setUsers?: SetUsersFunction<T>): Promise<void> => {
  try {
    // 1. Delete the user document from the 'users' collection
    await deleteDoc(doc(db, 'users', userId));

    // 2. Delete all messages sent by this user
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(messagesRef, where('senderId', '==', userId));
    const messagesSnap = await getDocs(messagesQuery);
    const messageDeletePromises = messagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id)));
    await Promise.all(messageDeletePromises);

    // 3. Fetch all flats created by the user
    const flatsRef = collection(db, 'flats');
    const flatsQuery = query(flatsRef, where('ownerID', '==', userId));
    const flatsSnap = await getDocs(flatsQuery);

    // 4. For each flat, delete all associated messages
    const flatIds = flatsSnap.docs.map((flatDoc) => flatDoc.id);
    for (const flatId of flatIds) {
      const flatMessagesQuery = query(messagesRef, where('flatID', '==', flatId));
      const flatMessagesSnap = await getDocs(flatMessagesQuery);
      const flatMessageDeletePromises = flatMessagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id)));
      await Promise.all(flatMessageDeletePromises);
    }

    // 5. Delete all flats created by the user
    const flatDeletePromises = flatsSnap.docs.map((flatDoc) => deleteDoc(doc(db, 'flats', flatDoc.id)));
    await Promise.all(flatDeletePromises);

    // 6. Update state if `setUsers` is provided
    if (setUsers) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    }
  } catch (error) {
    console.error('Error removing user:', error);
    alert('Failed to remove user.');
  }
};

export default handleRemoveUser;
