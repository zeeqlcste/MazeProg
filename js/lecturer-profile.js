import { database } from "./firebase-config.js";
import { ref, get, update, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const userString = localStorage.getItem('loggedInUser');
const currentUser = userString ? JSON.parse(userString) : null;
const userId = currentUser ? (currentUser.user_id || currentUser.uid || currentUser.id) : null;

if (!currentUser || !userId || currentUser.role !== 'lecturer') {
  window.location.href = currentUser?.role === 'student' ? 'student-dashboard.html' : 'login.html';
}

const profileForm = document.getElementById('lecturerProfileForm');
const nameInput = document.getElementById('lecturerName');
const emailInput = document.getElementById('lecturerEmail');
const facultyInput = document.getElementById('lecturerFaculty');
const departmentInput = document.getElementById('lecturerDepartment');
const imageInput = document.getElementById('profileImageInput');
const imagePreview = document.getElementById('profileImagePreview');
const profileInitials = document.getElementById('profileInitials');
const statusText = document.getElementById('profileStatus');
let selectedProfileImage = '';

async function loadProfile() {
  try {
    const databaseRef = ref(database);
    const [userSnapshot, lecturerSnapshot] = await Promise.all([
      get(child(databaseRef, `USER/${userId}`)),
      get(child(databaseRef, `LECTURER/${userId}`))
    ]);
    const userData = userSnapshot.val() || currentUser;
    const lecturerData = lecturerSnapshot.val() || {};

    nameInput.value = userData.name || currentUser.name || '';
    emailInput.value = userData.email || currentUser.email || '';
    facultyInput.value = lecturerData.faculty || currentUser.faculty || '';
    departmentInput.value = lecturerData.department || currentUser.department || '';
    selectedProfileImage = userData.profile_picture || currentUser.profile_picture || '';
    profileInitials.textContent = (nameInput.value.trim()[0] || 'L').toUpperCase();
    if (selectedProfileImage) showProfileImage(selectedProfileImage);
  } catch (error) {
    console.error('Unable to load lecturer profile:', error);
    statusText.textContent = 'Could not load profile details.';
  }
}

imageInput.addEventListener('change', (event) => {
  const imageFile = event.target.files?.[0];
  if (!imageFile) return;
  if (!imageFile.type.startsWith('image/')) {
    statusText.textContent = 'Please select an image file.';
    imageInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedProfileImage = String(reader.result || '');
    showProfileImage(selectedProfileImage);
  };
  reader.readAsDataURL(imageFile);
});

function showProfileImage(source) {
  imagePreview.src = source;
  imagePreview.hidden = false;
  profileInitials.hidden = true;
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const saveButton = profileForm.querySelector('[type="submit"]');
  const name = nameInput.value.trim();
  if (!name) {
    statusText.textContent = 'Name is required.';
    return;
  }

  saveButton.disabled = true;
  statusText.textContent = 'Saving profile...';
  try {
    const userUpdates = { name };
    if (selectedProfileImage) userUpdates.profile_picture = selectedProfileImage;

    await Promise.all([
      update(ref(database, `USER/${userId}`), userUpdates),
      update(ref(database, `LECTURER/${userId}`), {
        user_id: userId,
        faculty: facultyInput.value.trim(),
        department: departmentInput.value.trim()
      })
    ]);

    currentUser.name = name;
    currentUser.faculty = facultyInput.value.trim();
    currentUser.department = departmentInput.value.trim();
    if (selectedProfileImage) currentUser.profile_picture = selectedProfileImage;
    localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
    statusText.textContent = 'Profile updated successfully.';
  } catch (error) {
    console.error('Unable to save lecturer profile:', error);
    statusText.textContent = `Could not save profile: ${error.message}`;
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById('backToLecturerDashboard').addEventListener('click', () => {
  window.location.href = 'lecturer-dashboard.html';
});

document.getElementById('lecturerLogoutBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  }
});

loadProfile();