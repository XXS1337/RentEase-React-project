import { collection, doc, deleteDoc, getDocs, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
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
    const flatIds = flatsSnap.docs.map((flatDoc) => flatDoc.id);

    // 4. Remove flats from other users' favorites
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    const removeFavoritesPromises: Promise<void>[] = [];
    usersSnap.forEach((userDoc) => {
      const userData = userDoc.data();
      const userFavorites: string[] = userData.favoriteFlats || [];

      // Check if the user has any of the flats in their favorites
      const flatsToRemove = flatIds.filter((flatId) => userFavorites.includes(flatId));
      if (flatsToRemove.length > 0) {
        removeFavoritesPromises.push(
          updateDoc(doc(db, 'users', userDoc.id), {
            favoriteFlats: arrayRemove(...flatsToRemove),
          })
        );
      }
    });
    await Promise.all(removeFavoritesPromises);

    // 5. For each flat, delete all associated messages
    for (const flatId of flatIds) {
      const flatMessagesQuery = query(messagesRef, where('flatID', '==', flatId));
      const flatMessagesSnap = await getDocs(flatMessagesQuery);
      const flatMessageDeletePromises = flatMessagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id)));
      await Promise.all(flatMessageDeletePromises);
    }

    // 6. Delete all flats created by the user after associated messages are deleted
    const flatDeletePromises = flatsSnap.docs.map((flatDoc) => deleteDoc(doc(db, 'flats', flatDoc.id)));
    await Promise.all(flatDeletePromises);

    // 7. Update state if `setUsers` is provided
    // This ensures that the user is removed from the local UI
    if (setUsers) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    }
  } catch (error) {
    console.error('Error removing user:', error);
    alert('Failed to remove user.');
  }
};

export default handleRemoveUser;
