import React, { useEffect, useState, ChangeEvent } from 'react';
import { useLoaderData, useActionData, Form, useSubmit, useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { validateField } from '../../../../utils/validateField';
import Message from '../../../../types/Message';
import styles from './Messages.module.css';

interface CurrentUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface LoaderData {
  messages: Message[];
  loggedInUserId: string;
  isOwner: boolean;
}

interface ActionData {
  success?: boolean;
  error?: string;
  message?: Partial<Message>;
}

interface ContextData {
  flatID: string;
  ownerID: string;
}

interface LoaderParams {
  params: {
    flatID: string;
  };
}

// Loader function to fetch messages and determine user permissions
export const messagesLoader = async ({ params }: LoaderParams): Promise<LoaderData> => {
  const { flatID } = params; // Extract the flat ID from the route params
  const loggedInUserId = localStorage.getItem('loggedInUser') || ''; // Get the logged-in user ID

  try {
    const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch the flat document
    if (!flatDoc.exists()) {
      throw new Error('Flat not found');
    }
    const flatData = flatDoc.data();
    const isOwner = loggedInUserId === flatData.ownerID; // Determine if the user is the flat owner

    // Query messages based on user role (owner sees all, others see only their messages)
    const messagesQuery = isOwner ? query(collection(db, 'messages'), where('flatID', '==', flatID)) : query(collection(db, 'messages'), where('flatID', '==', flatID), where('senderId', '==', loggedInUserId));

    const snapshot = await getDocs(messagesQuery); // Fetch the messages

    let messages = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let creationTime = 'Unknown Time';
        if (data.creationTime) {
          creationTime = data.creationTime.toDate().toLocaleString(); // Convert Firestore Timestamp to Date
        }

        // Fetch sender details
        let senderName = 'Unknown User';
        let senderEmail = 'Unknown Email';
        if (data.senderId) {
          const userDocRef = doc(db, 'users', data.senderId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const firstName = userData.firstName || 'Unknown';
            const lastName = userData.lastName || 'User';
            senderName = `${firstName} ${lastName}`;
            senderEmail = userData.email || 'Unknown Email';
          }
        }

        return {
          id: docSnap.id,
          flatID,
          senderId: data.senderId || '',
          content: data.content || '',
          creationTime,
          senderName,
          senderEmail,
        };
      })
    );

    // Sort messages chronologically by creationTime
    messages = messages.sort((a, b) => new Date(a.creationTime).getTime() - new Date(b.creationTime).getTime());

    // Format creationTime to a readable string for display
    messages = messages.map((msg) => ({
      ...msg,
      creationTime: msg.creationTime.toLocaleString(),
    }));

    return { messages, loggedInUserId, isOwner }; // Return fetched data
  } catch (error) {
    console.error('Error loading messages:', error);
    return { messages: [], loggedInUserId, isOwner: false }; // Return empty data on failure
  }
};

// Action to handle sending a new message
export const messagesAction = async ({ request, params }: { request: Request; params: { flatID: string } }): Promise<ActionData> => {
  const formData = await request.formData(); // Parse the submitted form data
  const flatID = params.flatID; // Extract the flat ID from route params
  const loggedInUserId = localStorage.getItem('loggedInUser'); // Get the logged-in user ID
  const content = formData.get('messageContent') as string; // Get the message content

  // Validate message content
  if (!content || !content.trim()) {
    return { error: 'Message content cannot be empty.' };
  }

  try {
    // Create a new message object
    const messageData = {
      flatID,
      senderId: loggedInUserId,
      content: content.trim(),
      creationTime: Timestamp.now(), // Firestore timestamp
    };

    // Save the new message to Firestore and get the document reference
    const docRef = await addDoc(collection(db, 'messages'), messageData);

    // Return success response with the new message data and Firestore-generated ID
    return {
      success: true,
      message: {
        id: docRef.id,
        flatID,
        senderId: loggedInUserId || '',
        content: content.trim(),
        creationTime: Timestamp.now().toDate().toISOString(), // Ensure compatibility
      },
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to send the message. Please try again.' };
  }
};

// Messages component to display and send messages
const Messages: React.FC = () => {
  const { flatID, ownerID } = useOutletContext<ContextData>(); // Get context data (flat and owner IDs)
  const { messages: initialMessages, loggedInUserId } = useLoaderData<LoaderData>(); // Load initial messages and user ID
  const actionData = useActionData<ActionData>();
  const [messages, setMessages] = useState<Message[]>(initialMessages || []); // State for messages
  const [newMessage, setNewMessage] = useState(''); // State for the new message input
  const [error, setError] = useState(''); // State for client-side validation errors
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null); // State for current user details
  const isOwner = loggedInUserId === ownerID; // Determine if the logged-in user is the owner
  const submit = useSubmit(); // Submit hook for form submission

  // Fetch the current user's details
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!loggedInUserId) return; // Early return if no user is logged in
      try {
        const userRef = doc(db, 'users', loggedInUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          // Ensure the data matches CurrentUser
          if ('firstName' in userData && 'lastName' in userData && 'email' in userData) {
            setCurrentUser(userData as CurrentUser); // Safely cast to CurrentUser
          }
        }
      } catch (err) {
        console.error('Error fetching logged-in user details:', err);
      }
    };

    fetchCurrentUser();
  }, [loggedInUserId]);

  // Handle action data updates (e.g., new messages or errors)
  useEffect(() => {
    if (actionData?.success && actionData.message) {
      const newMsg: Message = {
        id: actionData.message.id || '',
        flatID,
        senderId: loggedInUserId,
        content: actionData.message.content || '',
        creationTime: new Date().toLocaleString(),
        senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
        senderEmail: currentUser?.email || '—',
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage('');
      setError('');
    } else if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData, currentUser, loggedInUserId, flatID]);

  // Handle changes to the textarea value

  const handleInputChange = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value); // Update the new message state

    if (value.trim()) {
      const error = await validateField('messageContent', value);
      setError(error); // Display error message
    } else {
      setError(''); // Clear errors if input is valid
    }
  };

  // Validate message content on blur
  const handleBlur = async () => {
    const error = await validateField('messageContent', newMessage);
    setError(error);
  };

  return (
    <div className={styles.messages}>
      <h3>Messages</h3>

      {/* Message list */}
      <div className={styles.messageList}>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={styles.message}>
              <p>
                <strong>From:</strong> {msg.senderName && msg.senderEmail ? `${msg.senderName} (${msg.senderEmail})` : msg.senderId === loggedInUserId ? 'You' : msg.senderId}
              </p>
              <p>
                <strong>Sent:</strong> {msg.creationTime}
              </p>
              <p>
                <strong>Message:</strong> {msg.content}
              </p>
            </div>
          ))
        ) : (
          <p>No messages to display.</p>
        )}
      </div>

      {/* New message form (only for non-owners) */}
      {!isOwner && (
        <Form
          method="post"
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!newMessage.trim()) {
              setError('Message content can’t be an empty string.');
              return;
            }
            const formData = new FormData(e.currentTarget);
            submit(formData, { method: 'post' });
          }}
          className={styles.newMessage}
        >
          <textarea name="messageContent" placeholder="Write your message here..." value={newMessage} onChange={handleInputChange} onBlur={handleBlur} className={error ? styles.errorInput : ''} />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={!newMessage.trim()}>
            Send Message
          </button>
        </Form>
      )}
    </div>
  );
};

export default Messages;
