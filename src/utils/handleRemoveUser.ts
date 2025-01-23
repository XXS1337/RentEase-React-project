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
    const messagesQuery = query(messagesRef, where('senderId', '==', userId)); // Query messages by user ID
    const messagesSnap = await getDocs(messagesQuery); // Fetch matching messages
    const messageDeletePromises = messagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id))); // Create delete operations for each message
    await Promise.all(messageDeletePromises); // Wait for all delete operations to complete

    // 3. Fetch all flats created by the user
    const flatsRef = collection(db, 'flats');
    const flatsQuery = query(flatsRef, where('ownerID', '==', userId)); // Query flats by owner ID
    const flatsSnap = await getDocs(flatsQuery); // Fetch matching flats
    const flatIds = flatsSnap.docs.map((flatDoc) => flatDoc.id); // Extract the IDs of all flats created by the user

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
      const flatMessagesQuery = query(messagesRef, where('flatID', '==', flatId)); // Query messages by flat ID
      const flatMessagesSnap = await getDocs(flatMessagesQuery); // Fetch matching messages
      const flatMessageDeletePromises = flatMessagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id))); // Create delete operations for each message
      await Promise.all(flatMessageDeletePromises); // Wait for all delete operations to complete
    }

    // 6. Delete all flats created by the user after associated messages are deleted
    const flatDeletePromises = flatsSnap.docs.map((flatDoc) => deleteDoc(doc(db, 'flats', flatDoc.id))); // Create delete operations for each flat
    await Promise.all(flatDeletePromises); // Wait for all delete operations to complete

    // 7. Update state if `setUsers` is provided
    if (setUsers) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId)); // Remove the user from state
    }
  } catch (error) {
    console.error('Error removing user:', error);
    alert('Failed to remove user.');
  }
};

export default handleRemoveUser;
