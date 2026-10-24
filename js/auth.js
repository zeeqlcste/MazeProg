import { auth, database } from "./firebase-config.js";
import { ref, get, set, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. TUKAR TAMPILAN FIELD STUDENT / LECTURER (REGISTER)
const roleSelect = document.getElementById('role');
const studentFields = document.getElementById('studentFields');
const lecturerFields = document.getElementById('lecturerFields');

if (roleSelect) {
  roleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'lecturer') {
      studentFields.style.display = 'none';
      lecturerFields.style.display = 'block';
    } else {
      studentFields.style.display = 'block';
      lecturerFields.style.display = 'none';
    }
  });
}

// 2. LOGIK REGISTER
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('username').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('role').value;

    const customUserId = "user_" + Date.now();

    try {
      await set(ref(database, 'USER/' + customUserId), {
        user_id: customUserId,
        name: name,
        email: email,
        password: password,
        role: role
      });

      if (role === 'student') {
        await set(ref(database, 'STUDENT/' + customUserId), {
          user_id: customUserId,
          faculty: document.getElementById('studentFaculty').value,
          course: document.getElementById('course').value,
          semester: document.getElementById('semester').value,
          class: document.getElementById('class').value
        });
      } else if (role === 'lecturer') {
        await set(ref(database, 'LECTURER/' + customUserId), {
          user_id: customUserId,
          faculty: document.getElementById('lecturerFaculty').value,
          department: document.getElementById('department').value
        });
      }

      alert('Pendaftaran berjaya! Sila log masuk.');
      window.location.href = 'login.html';

    } catch (error) {
      alert('Ralat Pendaftaran: ' + error.message);
    }
  });
}

// 3. LOGIK LOGIN (SIMPAN SESI KE LOCALSTORAGE)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputEmail = document.getElementById('email').value;
    const inputPassword = document.getElementById('password').value;

    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, 'USER'));

      if (snapshot.exists()) {
        const users = snapshot.val();
        let authenticatedUser = null;

        Object.keys(users).forEach(key => {
          if (users[key].email === inputEmail && users[key].password === inputPassword) {
            authenticatedUser = users[key];
          }
        });

        if (authenticatedUser) {
          // SIMPAN SESI KE LOCALSTORAGE SINI
          localStorage.setItem('loggedInUser', JSON.stringify(authenticatedUser));

          alert('Log masuk berjaya!');
          if (authenticatedUser.role === 'lecturer') {
            window.location.href = 'lecturer-dashboard.html'; // Atau create-game-session.html
          } else {
            window.location.href = 'student-dashboard.html';
          }
        } else {
          alert('E-mel atau kata laluan tidak sah.');
        }
      } else {
        alert('Pengguna tidak dijumpai dalam pangkalan data.');
      }
    } catch (error) {
      alert('Ralat Log Masuk: ' + error.message);
    }
  });
}