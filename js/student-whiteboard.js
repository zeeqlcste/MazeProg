import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    onChildAdded,
    remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ======================================================
// 1. DOM ELEMENTS
// ======================================================

const displayPin =
    document.getElementById("displayPin");

const displayTitle =
    document.getElementById("displayTitle");

const displayName =
    document.getElementById("displayName");

const leaveBtn =
    document.getElementById("leaveBtn");

const canvas =
    document.getElementById("whiteboardCanvas");

const container =
    document.getElementById("boardContainer");

const ctx =
    canvas
        ? canvas.getContext("2d")
        : null;

const sharedCodeCard = document.getElementById("sharedCodeCard");
const sharedCodeTitle = document.getElementById("sharedCodeTitle");
const sharedCodeLanguage = document.getElementById("sharedCodeLanguage");
const sharedCodeText = document.getElementById("sharedCodeText");
const studentNotesLayer = document.getElementById("studentNotesLayer");


// ======================================================
// 2. GET PIN FROM URL
// ======================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const currentPin =
    urlParams.get("pin");


if (!currentPin) {

    alert(
        "PIN Sesi tidak ditemui!"
    );

    window.location.href =
        "student-dashboard.html";

}


// ======================================================
// 3. DISPLAY PIN
// ======================================================

if (displayPin) {

    displayPin.textContent =
        currentPin;

}


// ======================================================
// 4. GET CURRENT USER
// ======================================================

const userString =
    localStorage.getItem(
        "loggedInUser"
    );


let currentUser = null;


if (userString) {

    try {

        currentUser =
            JSON.parse(
                userString
            );


        if (displayName) {

            displayName.textContent =
                currentUser.name ||
                "Student";

        }

    }

    catch (error) {

        console.error(
            "User JSON error:",
            error
        );

        alert(
            "Maklumat pengguna tidak sah!"
        );

        window.location.href =
            "login.html";

    }

}

else {

    alert(
        "Sila log masuk terlebih dahulu!"
    );

    window.location.href =
        "login.html";

}


// ======================================================
// 5. CANVAS SIZE
// ======================================================

function resizeCanvas() {

    if (!canvas || !container) {
        return;
    }


    canvas.width =
        container.clientWidth ||
        window.innerWidth;


    canvas.height =
        container.clientHeight ||
        (window.innerHeight - 60);

}


window.addEventListener(
    "resize",
    resizeCanvas
);


resizeCanvas();


// ======================================================
// 6. FIREBASE SESSION
// ======================================================

const sessionRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}`
);


// ======================================================
// 7. IMPORTANT WHITEBOARD PATH
// ======================================================
//
// SAMA DENGAN LECTURER:
//
// GAME_SESSIONS/PIN/whiteboard_drawings
//
// ======================================================

const drawingsRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}/whiteboard_drawings`
);


// ======================================================
// 8. IMPORTANT CLEAR PATH
// ======================================================
//
// SAMA DENGAN LECTURER:
//
// GAME_SESSIONS/PIN/whiteboard_clear
//
// ======================================================

const clearRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}/whiteboard_clear`
);


// ======================================================
// 9. CHECK SESSION STATUS
// ======================================================

onValue(
    sessionRef,
    (snapshot) => {

        if (!snapshot.exists()) {

            alert(
                "Sesi Whiteboard telah ditamatkan oleh Pensyarah!"
            );

            window.location.href =
                "student-dashboard.html";

            return;
        }


        const session =
            snapshot.val();


        // Session title

        if (displayTitle) {

            displayTitle.textContent =
                session.session_title ||
                "Interactive Whiteboard";

        }


        // Check session ended

        if (
            session.status === "ENDED"
        ) {

            alert(
                "Pensyarah telah menamatkan sesi ini."
            );

            window.location.href =
                "student-dashboard.html";

        }

    }
);


// ======================================================
// 10. DRAW LINE ON STUDENT CANVAS
// ======================================================

function drawLineOnStudentCanvas(
    data
) {

    if (!ctx || !canvas) {
        return;
    }


    if (!data) {
        return;
    }


    // ==============================================
    // Convert Firebase percentage
    // back to student's pixels
    // ==============================================

    const x0 =
        data.x0 * canvas.width;


    const y0 =
        data.y0 * canvas.height;


    const x1 =
        data.x1 * canvas.width;


    const y1 =
        data.y1 * canvas.height;


    // ==============================================
    // Draw
    // ==============================================

    ctx.save();
    ctx.globalCompositeOperation = data.mode === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();


    ctx.moveTo(
        x0,
        y0
    );


    ctx.lineTo(
        x1,
        y1
    );


    ctx.strokeStyle =
        data.color ||
        "#38bdf8";


    ctx.lineWidth =
        data.size ||
        3;


    ctx.lineCap =
        "round";


    ctx.lineJoin =
        "round";


    ctx.stroke();
    ctx.restore();

}


// ======================================================
// 11. REAL-TIME DRAWING LISTENER
// ======================================================
//
// Bila lecturer draw:
//
// Lecturer
//      ↓
// Firebase
//      ↓
// whiteboard_drawings
//      ↓
// Student onChildAdded()
//      ↓
// Canvas Student
//
// ======================================================

onChildAdded(
    drawingsRef,
    (snapshot) => {

        if (!snapshot.exists()) {
            return;
        }


        const lineData =
            snapshot.val();


        drawLineOnStudentCanvas(
            lineData
        );

    }
);


// ======================================================
// 12. CLEAR BOARD LISTENER
// ======================================================

onValue(
    clearRef,
    (snapshot) => {

        if (
            !snapshot.exists()
        ) {

            return;

        }


        if (
            !ctx ||
            !canvas
        ) {

            return;

        }


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    }
);


// ======================================================
// 13. EXIT SESSION
// ======================================================

if (leaveBtn) {

    leaveBtn.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Adakah anda pasti mahu keluar dari sesi Whiteboard ini?"
                );


            if (!confirmed) {
                return;
            }


            try {

                // Remove student from session

                if (
                    currentUser &&
                    currentPin
                ) {

                    const playerRef =
                        ref(
                            database,
                            `GAME_SESSIONS/${currentPin}/players/${currentUser.user_id}`
                        );


                    await remove(
                        playerRef
                    );

                }


                // Return dashboard

                window.location.href =
                    "student-dashboard.html";

            }

            catch (error) {

                console.error(
                    "Error leaving room:",
                    error
                );


                window.location.href =
                    "student-dashboard.html";

            }

        }
    );

}


// ======================================================
// 14. FINAL CANVAS RESIZE
// ======================================================

setTimeout(
    resizeCanvas,
    200
);

const viewRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}/whiteboard_view`
);

const codeRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}/whiteboard_code`
);

const notesRef = ref(
    database,
    `GAME_SESSIONS/${currentPin}/whiteboard_notes`
);

onValue(viewRef, (snapshot) => {
    const view = snapshot.val() || {};
    document.body.classList.toggle("projector-mode", Boolean(view.projector_mode));
});

onValue(codeRef, (snapshot) => {
    if (!sharedCodeCard) return;
    const code = snapshot.val();
    sharedCodeCard.hidden = !code?.code;
    if (!code) return;
    sharedCodeTitle.textContent = code.title || "Programming example";
    sharedCodeLanguage.textContent = code.language || "C++";
    sharedCodeText.textContent = code.code || "";
});

onValue(notesRef, (snapshot) => {
    if (!studentNotesLayer) return;
    studentNotesLayer.replaceChildren();
    const notes = snapshot.val() || {};
    Object.values(notes).forEach((note) => {
        const noteCard = document.createElement("article");
        noteCard.className = "student-note";
        noteCard.style.left = `${Number(note.x) || 32}px`;
        noteCard.style.top = `${Number(note.y) || 32}px`;
        noteCard.style.backgroundColor = note.color || "#d8b977";

        const content = document.createElement("div");
        content.textContent = note.text || "";
        const author = document.createElement("small");
        author.textContent = note.author ? `- ${note.author}` : "";
        noteCard.append(content, author);
        studentNotesLayer.appendChild(noteCard);
    });
});