import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAUK76oX2QtPTCto-u2qX4kDkjOzwwO09M',
  authDomain: 'house-marketplace-app-4de4b.firebaseapp.com',
  projectId: 'house-marketplace-app-4de4b',
  storageBucket: 'house-marketplace-app-4de4b.appspot.com',
  messagingSenderId: '696561007774',
  appId: '1:696561007774:web:0291cc312b6941d30a8f8f',
}

// Initialize Firebase
initializeApp(firebaseConfig)

export const db = getFirestore()
