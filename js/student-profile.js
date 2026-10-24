import { database } from "./firebase-config.js";
import { ref, get, update, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. SEMAK LOG MASUK PELAJAR
const userString = localStorage.getItem('loggedInUser');
if (!userString) {
  alert("Sila log masuk terlebih dahulu!");
  window.location.href = "login.html";
}

const currentUser = JSON.parse(userString);
const userId = currentUser.user_id || currentUser.uid || currentUser.id;

console.log("Logged in User ID:", userId);

// DOM Elements
const profilePreview = document.getElementById('profilePreview');
const avatarDropZone = document.getElementById('avatarDropZone');
const fileInput = document.getElementById('fileInput');

const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const facultyInput = document.getElementById('facultyInput');
const courseInput = document.getElementById('courseInput');
const classInput = document.getElementById('classInput');
const semesterInput = document.getElementById('semesterInput');

const profileForm = document.getElementById('profileForm');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');

let selectedBase64Image = "";

// 2. AMBIL DATA DARI DB (USER & STUDENT)
async function fetchAndPopulateProfile() {
  try {
    const dbRef = ref(database);

    // Read USER node
    const userSnap = await get(child(dbRef, `USER/${userId}`));
    if (userSnap.exists()) {
      const uData = userSnap.val();
      console.log("Data USER dari DB:", uData);
      nameInput.value = uData.name || currentUser.name || "";
      emailInput.value = uData.email || currentUser.email || "";

      if (uData.profile_picture) {
        profilePreview.src = uData.profile_picture;
        selectedBase64Image = uData.profile_picture;
      }
    } else {
      nameInput.value = currentUser.name || "";
      emailInput.value = currentUser.email || "";
    }

    // Read STUDENT node
    const studentSnap = await get(child(dbRef, `STUDENT/${userId}`));
    if (studentSnap.exists()) {
      const sData = studentSnap.val();
      console.log("Data STUDENT dari DB:", sData);

      // ISI VALUE SECARA SOLID (Bukan placeholder)
      facultyInput.value = sData.faculty || "";
      courseInput.value = sData.course || "";
      classInput.value = sData.class || "";
      semesterInput.value = sData.semester || "";
    } else {
      console.warn("Nod STUDENT tidak dijumpai untuk ID ini:", userId);
    }

  } catch (error) {
    console.error("Ralat membaca Realtime Database:", error);
  }
}

// Jalankan pengambilan data sebaik sahaja skrin sedia
fetchAndPopulateProfile();

// 3. LOGIK GAMBAR DRAG & DROP / CLICK
if (avatarDropZone) {
  avatarDropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImageFile(file);
  });

  avatarDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    avatarDropZone.classList.add('dragover');
  });

  avatarDropZone.addEventListener('dragleave', () => {
    avatarDropZone.classList.remove('dragover');
  });

  avatarDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    avatarDropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      alert("Sila seret fail gambar sahaja!");
    }
  });
}

function processImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedBase64Image = e.target.result;
    profilePreview.src = selectedBase64Image;
  };
  reader.readAsDataURL(file);
}

// 4. KEMASKINI PROFILE DALAM FIREBASE
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newName = nameInput.value.trim();
  const newFaculty = facultyInput.value.trim();
  const newCourse = courseInput.value.trim();
  const newClass = classInput.value.trim();
  const newSemester = semesterInput.value.trim();

  try {
    // Update Node USER
    const userUpdateData = { name: newName };
    if (selectedBase64Image) {
      userUpdateData.profile_picture = selectedBase64Image;
    }
    await update(ref(database, `USER/${userId}`), userUpdateData);

    // Update Node STUDENT
    await update(ref(database, `STUDENT/${userId}`), {
      faculty: newFaculty,
      course: newCourse,
      class: newClass,
      semester: newSemester,
      user_id: userId
    });

    // Update LocalStorage
    currentUser.name = newName;
    currentUser.faculty = newFaculty;
    currentUser.course = newCourse;
    currentUser.class = newClass;
    currentUser.semester = newSemester;
    if (selectedBase64Image) currentUser.profile_picture = selectedBase64Image;

    localStorage.setItem('loggedInUser', JSON.stringify(currentUser));

    alert("Profil berjaya dikemaskini!");
    location.reload(); // Refresh halaman untuk paparan data terbaharu yang solid

  } catch (error) {
    console.error("Ralat menyimpan profil:", error);
    alert("Gagal mengemaskini profil: " + error.message);
  }
});

// NAVIGASI
if (backBtn) {
  backBtn.onclick = () => {
    window.location.href = "student-dashboard.html";
  };
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    if (confirm("Adakah anda pasti mahu log keluar?")) {
      localStorage.removeItem('loggedInUser');
      window.location.href = 'login.html';
    }
  };
}