import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9m65E9FFdQ6UJ8Bn4z_343juIIEgJnF8",
  authDomain: "mazeprog-df33a.firebaseapp.com",
  databaseURL: "https://mazeprog-df33a-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "mazeprog-df33a",
  storageBucket: "mazeprog-df33a.firebasestorage.app",
  messagingSenderId: "373534680785",
  appId: "1:373534680785:web:1df07569769378162c07f0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);