// /lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDrywOH0Bvc4gKN8rPIcx4JpYq8A8abDA",
  authDomain: "gathr-1f6e4.firebaseapp.com",
  projectId: "gathr-1f6e4",
  storageBucket: "gathr-1f6e4.firebasestorage.app",
  messagingSenderId: "163852092979",
  appId: "1:163852092979:web:867f5b00b3fba30bd8c546",
  measurementId: "G-KLCJ69PGTF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
