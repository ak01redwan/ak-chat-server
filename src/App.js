import React, { useRef, useState } from 'react';
import './App.css';
// firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  collection, 
  addDoc,
  orderBy, 
  query, 
  limit, 
  getFirestore, 
  serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
// react
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

const firebase = initializeApp({
  apiKey: "AIzaSyADwJ6rQG7Iil19mk3K7f1A_lg-RHo58KI",

  authDomain: "ak-chat-server.firebaseapp.com",

  projectId: "ak-chat-server",

  storageBucket: "ak-chat-server.appspot.com",

  messagingSenderId: "368720793781",

  appId: "1:368720793781:web:b640cf023c74ed16936efc",

  measurementId: "G-RQF1CPLTE3",
  error: true,
})

const auth = getAuth(firebase);
const firestore = getFirestore(firebase);
const analytics = getAnalytics(firebase);


function App() {

  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>⚛️🔥💬</h1>
        <SignOut />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>

    </div>
  );
}

function SignIn() {

  function signInWithGooglePopup() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // Handle successful sign-in (e.g., navigate to a different page)
        console.log("Signed in successfully:", result.user);
      })
      .catch((error) => {
        // Handle sign-in errors
        console.error("Error signing in:", error);
      });
  }
  

  return (
    <>
      <button className="sign-in" onClick={signInWithGooglePopup}>Sign in with Google</button>
      <p>
        <strong>AK-CHAT-SERVER</strong> welcomes all to chat and share updates, but respectful behavior is expected:

        Treat others kindly, avoid abusive language and hate speech.
        Stick to the topic of AK01REDWAN's news and updates.
        Report any violations to moderators.

        Failure to follow these guidelines may result in warnings, suspension, or ban.

        <strong>Enjoy your time in the chat!</strong>  
      </p>
    </>
  )

}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  )
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const messagesQuery = query(messagesRef, orderBy('createdAt'), limit(25));

  const [messages] = useCollectionData(messagesQuery, { idField: 'id' });

  const [formValue, setFormValue] = useState('');


  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (<>
    <main>

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

      <span ref={dummy}></span>

    </main>

    <form onSubmit={sendMessage}>

      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />

      <button type="submit" disabled={!formValue}>SEND</button>

    </form>
  </>)
}


function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      <img alt="message" src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} />
      <p>{text}</p>
    </div>
  </>)
}

export default App;
