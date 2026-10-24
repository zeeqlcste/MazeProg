import { database } from "./firebase-config.js";

import {
    ref,
    set,
    onValue,
    onChildAdded,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ======================================================
// 1. GET PIN FROM URL
// ======================================================

const urlParams = new URLSearchParams(window.location.search);

const sessionPin = urlParams.get("pin");

if (!sessionPin) {
    alert("PIN Sesi tidak sah!");
    window.location.href = "index.html";
}


// ======================================================
// 2. GET CURRENT USER
// ======================================================

const userString = localStorage.getItem("loggedInUser");

const currentUser = userString
    ? JSON.parse(userString)
    : null;

if (!currentUser) {
    alert("Sila log masuk terlebih dahulu!");
    window.location.href = "login.html";
}


// ======================================================
// 3. DOM ELEMENTS
// ======================================================

const displayPin =
    document.getElementById("displayPin");

const roleBadge =
    document.getElementById("roleBadge");

const sessionTitleDisplay =
    document.getElementById("sessionTitleDisplay");

const canvas =
    document.getElementById("whiteboardCanvas");

const ctx =
    canvas.getContext("2d");

const boardContainer =
    document.getElementById("boardContainer");

const clearBtn =
    document.getElementById("clearBtn");

const exitBtn =
    document.getElementById("exitBtn");

const addNoteBtn =
    document.getElementById("addNoteBtn");

const penBtn =
    document.getElementById("penBtn");

const eraserBtn =
    document.getElementById("eraserBtn");

const colorPicker =
    document.getElementById("colorPicker");

const openCodeBtn = document.getElementById("openCodeBtn");
const codeEditorPanel = document.getElementById("codeEditorPanel");
const closeCodeBtn = document.getElementById("closeCodeBtn");
const publishCodeBtn = document.getElementById("publishCodeBtn");
const codeTitleInput = document.getElementById("codeTitleInput");
const codeLanguageInput = document.getElementById("codeLanguageInput");
const codeInput = document.getElementById("codeInput");
const projectorBtn = document.getElementById("projectorBtn");
const exitProjectorBtn = document.getElementById("exitProjectorBtn");
const sharedCodeCard = document.getElementById("sharedCodeCard");
const sharedCodeTitle = document.getElementById("sharedCodeTitle");
const sharedCodeLanguage = document.getElementById("sharedCodeLanguage");
const sharedCodeText = document.getElementById("sharedCodeText");
const codeSyncStatus = document.getElementById("codeSyncStatus");


// ======================================================
// 4. BASIC VARIABLES
// ======================================================

let isDrawing = false;

let currentMode = "pen";

let currentColor = "#38bdf8";

let isLecturer = false;

let lastX = 0;

let lastY = 0;
let codeSaveTimer = null;
let publishedCode = null;


// ======================================================
// 5. DISPLAY PIN
// ======================================================

displayPin.textContent = `PIN: ${sessionPin}`;


// ======================================================
// 6. FIREBASE SESSION
// ======================================================

const sessionRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}`
);


// ======================================================
// 7. CHECK SESSION + ROLE
// ======================================================

onValue(sessionRef, (snapshot) => {

    if (!snapshot.exists()) {

        alert(
            "Sesi Whiteboard ini telah ditamatkan!"
        );

        window.location.href =
            "index.html";

        return;
    }


    const sessionData = snapshot.val();


    // --------------------------------------------------
    // SESSION TITLE
    // --------------------------------------------------

    sessionTitleDisplay.textContent =
        sessionData.session_title ||
        "Whiteboard Session";


    // --------------------------------------------------
    // CHECK ROLE
    // --------------------------------------------------

    if (
        currentUser &&
        (
            currentUser.user_id === sessionData.owner_id ||
            currentUser.role === "lecturer"
        )
    ) {

        isLecturer = true;

        roleBadge.textContent =
            "Lecturer";

        roleBadge.style.background =
            "#a855f7";

        clearBtn.style.display =
            "flex";

        canvas.style.cursor =
            "crosshair";

    } else {

        isLecturer = false;

        roleBadge.textContent =
            "Student";

        roleBadge.style.background =
            "#10b981";

        clearBtn.style.display =
            "none";

        canvas.style.cursor =
            "not-allowed";
    }

});


// ======================================================
// 8. CANVAS SIZE
// ======================================================

function resizeCanvas() {

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    const newWidth =
        boardContainer.clientWidth;

    const newHeight =
        boardContainer.clientHeight;


    if (
        oldWidth === newWidth &&
        oldHeight === newHeight
    ) {
        return;
    }


    canvas.width = newWidth;
    canvas.height = newHeight;


    // Redraw semua existing drawings
    redrawAllDrawings();
}


window.addEventListener(
    "resize",
    resizeCanvas
);


// Initial canvas size
canvas.width =
    boardContainer.clientWidth;

canvas.height =
    boardContainer.clientHeight;


// ======================================================
// 9. FIREBASE WHITEBOARD DRAWINGS PATH
// ======================================================

const drawingsRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}/whiteboard_drawings`
);


// ======================================================
// 10. FIREBASE CLEAR PATH
// ======================================================

const clearSignalRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}/whiteboard_clear`
);


// ======================================================
// 11. GET MOUSE / TOUCH COORDINATES
// ======================================================

function getCoordinates(e) {

    const rect =
        canvas.getBoundingClientRect();


    let clientX;
    let clientY;


    if (e.touches && e.touches.length > 0) {

        clientX =
            e.touches[0].clientX;

        clientY =
            e.touches[0].clientY;

    } else {

        clientX =
            e.clientX;

        clientY =
            e.clientY;
    }


    return {

        x:
            clientX - rect.left,

        y:
            clientY - rect.top

    };

}


// ======================================================
// 12. START DRAWING
// ======================================================

function startDrawing(e) {

    if (!isLecturer) {
        return;
    }


    isDrawing = true;


    const coords =
        getCoordinates(e);


    lastX =
        coords.x;

    lastY =
        coords.y;


    // Draw a small dot when clicking
    ctx.save();
    ctx.globalCompositeOperation = currentMode === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();

    ctx.arc(
        lastX,
        lastY,
        currentMode === "eraser" ? 10 : 1.5,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        currentMode === "eraser"
            ? "#020617"
            : currentColor;

    ctx.fill();
    ctx.restore();
}


// ======================================================
// 13. STOP DRAWING
// ======================================================

function stopDrawing() {

    isDrawing = false;

    ctx.save();
    ctx.globalCompositeOperation = currentMode === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
}


// ======================================================
// 14. DRAW
// ======================================================

function draw(e) {

    if (!isDrawing) {
        return;
    }


    if (!isLecturer) {
        return;
    }


    const coords =
        getCoordinates(e);


    const currentX =
        coords.x;

    const currentY =
        coords.y;


    // ==================================================
    // LOCAL DRAWING
    // ==================================================

    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );

    ctx.lineTo(
        currentX,
        currentY
    );


    ctx.strokeStyle = currentColor;


    ctx.lineWidth =
        currentMode === "eraser"
            ? 20
            : 3;


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.stroke();
    ctx.restore();


    // ==================================================
    // FIREBASE DATA
    // ==================================================

    const lineSegment = {

        x0:
            lastX / canvas.width,

        y0:
            lastY / canvas.height,

        x1:
            currentX / canvas.width,

        y1:
            currentY / canvas.height,

        color:
            currentColor,

        mode:
            currentMode,

        size:
            currentMode === "eraser"
                ? 20
                : 3
    };


    // ==================================================
    // SAVE TO FIREBASE
    // ==================================================

    push(
        drawingsRef,
        lineSegment
    ).catch((error) => {

        console.error(
            "Firebase drawing error:",
            error
        );

    });


    // Update last position

    lastX =
        currentX;

    lastY =
        currentY;
}


// ======================================================
// 15. DRAW FIREBASE SEGMENT
// ======================================================

function drawLineSegment(line) {

    if (!line) {
        return;
    }


    const x0 =
        line.x0 * canvas.width;

    const y0 =
        line.y0 * canvas.height;

    const x1 =
        line.x1 * canvas.width;

    const y1 =
        line.y1 * canvas.height;


    ctx.save();
    ctx.globalCompositeOperation = line.mode === "eraser" ? "destination-out" : "source-over";
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
        line.color || "#38bdf8";


    ctx.lineWidth =
        line.size || 3;


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    ctx.stroke();
    ctx.restore();
}


// ======================================================
// 16. REDRAW ALL DRAWINGS
// ======================================================

function redrawAllDrawings() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    onValue(
        drawingsRef,
        (snapshot) => {

            if (!snapshot.exists()) {
                return;
            }


            const drawings =
                snapshot.val();


            Object.values(drawings)
                .forEach((line) => {

                    drawLineSegment(line);

                });

        },
        {
            onlyOnce: true
        }
    );
}


// ======================================================
// 17. REAL-TIME DRAWING LISTENER
// ======================================================

onChildAdded(
    drawingsRef,
    (snapshot) => {

        if (!snapshot.exists()) {
            return;
        }


        const line =
            snapshot.val();


        drawLineSegment(line);

    }
);


// ======================================================
// 18. CLEAR BOARD LISTENER
// ======================================================

onValue(
    clearSignalRef,
    (snapshot) => {

        if (!snapshot.exists()) {
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
// 19. MOUSE EVENTS
// ======================================================

canvas.addEventListener(
    "mousedown",
    startDrawing
);


canvas.addEventListener(
    "mousemove",
    draw
);


canvas.addEventListener(
    "mouseup",
    stopDrawing
);


canvas.addEventListener(
    "mouseleave",
    stopDrawing
);


// ======================================================
// 20. TOUCH EVENTS
// ======================================================

canvas.addEventListener(
    "touchstart",
    (e) => {

        e.preventDefault();

        startDrawing(e);

    },
    { passive: false }
);


canvas.addEventListener(
    "touchmove",
    (e) => {

        e.preventDefault();

        draw(e);

    },
    { passive: false }
);


canvas.addEventListener(
    "touchend",
    (e) => {

        e.preventDefault();

        stopDrawing();

    },
    { passive: false }
);


// ======================================================
// 21. PEN BUTTON
// ======================================================

penBtn.addEventListener(
    "click",
    (e) => {

        currentMode =
            "pen";

        setActiveTool(
            e.currentTarget
        );

    }
);


// ======================================================
// 22. ERASER BUTTON
// ======================================================

eraserBtn.addEventListener(
    "click",
    (e) => {

        currentMode =
            "eraser";

        setActiveTool(
            e.currentTarget
        );

    }
);


// ======================================================
// 23. COLOR PICKER
// ======================================================

colorPicker.addEventListener(
    "input",
    (e) => {

        currentColor =
            e.target.value;

        // Automatically switch back to pen
        currentMode =
            "pen";

        setActiveTool(
            penBtn
        );

    }
);


// ======================================================
// 24. ACTIVE TOOL
// ======================================================

function setActiveTool(targetBtn) {

    document
        .querySelectorAll(".tool-btn")
        .forEach((btn) => {

            btn.classList.remove(
                "active"
            );

        });


    targetBtn.classList.add(
        "active"
    );

}


// ======================================================
// 25. STICKY NOTES FIREBASE PATH
// ======================================================

const notesRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}/whiteboard_notes`
);


// ======================================================
// 26. ADD STICKY NOTE
// ======================================================

addNoteBtn.addEventListener(
    "click",
    () => {

        const colors = [
            "#fef08a",
            "#fbcfe8",
            "#bbf7d0",
            "#bae6fd"
        ];


        const randomColor =
            colors[
                Math.floor(
                    Math.random() *
                    colors.length
                )
            ];


        const newNote = {

            text:
                "Tulis nota/jawapan...",

            x:
                100,

            y:
                100,

            color:
                randomColor,

            author:
                currentUser.name ||
                "Lecturer"

        };


        push(
            notesRef,
            newNote
        ).catch((error) => {

            console.error(
                "Add note error:",
                error
            );

        });

    }
);


// ======================================================
// 27. DISPLAY STICKY NOTES
// ======================================================

onValue(
    notesRef,
    (snapshot) => {

        // Remove existing notes
        document
            .querySelectorAll(
                ".sticky-note"
            )
            .forEach((el) => {

                el.remove();

            });


        if (!snapshot.exists()) {
            return;
        }


        const notes =
            snapshot.val();


        Object.keys(notes)
            .forEach((noteId) => {

                const note =
                    notes[noteId];


                const noteDiv =
                    document.createElement(
                        "div"
                    );


                noteDiv.className =
                    "sticky-note";


                noteDiv.style.backgroundColor =
                    note.color;


                noteDiv.style.left =
                    `${note.x}px`;


                noteDiv.style.top =
                    `${note.y}px`;


                noteDiv.innerHTML = `
                    <textarea>${note.text || ""}</textarea>

                    <div class="author">
                        - ${note.author || "Lecturer"}
                    </div>
                `;


                const textarea =
                    noteDiv.querySelector(
                        "textarea"
                    );


                // Update note text
                textarea.addEventListener(
                    "change",
                    (e) => {

                        set(
                            ref(
                                database,
                                `GAME_SESSIONS/${sessionPin}/whiteboard_notes/${noteId}/text`
                            ),
                            e.target.value
                        );

                    }
                );


                // Only lecturer can edit notes
                if (!isLecturer) {

                    textarea.disabled =
                        true;

                }


                boardContainer.appendChild(
                    noteDiv
                );

            });

    }
);


// ======================================================
// 28. CLEAR ALL WHITEBOARD
// ======================================================

clearBtn.addEventListener(
    "click",
    async () => {

        if (!isLecturer) {
            return;
        }


        const confirmed =
            confirm(
                "Adakah anda pasti ingin memadam seluruh papan putih?"
            );


        if (!confirmed) {
            return;
        }


        try {

            // Remove drawings
            await remove(
                drawingsRef
            );


            // Remove notes
            await remove(
                notesRef
            );


            // Send clear signal
            await set(
                clearSignalRef,
                Date.now()
            );


            // Clear lecturer canvas
            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


        } catch (error) {

            console.error(
                "Clear board error:",
                error
            );


            alert(
                "Gagal memadam whiteboard."
            );

        }

    }
);


// ======================================================
// 29. EXIT SESSION
// ======================================================

exitBtn.addEventListener(
    "click",
    () => {

        if (isLecturer) {

            window.location.href =
                "create-game-session.html";

        } else {

            window.location.href =
                "student-dashboard.html";

        }

    }
);


// ======================================================
// 30. FINAL CANVAS RESIZE
// ======================================================

setTimeout(
    () => {

        canvas.width =
            boardContainer.clientWidth;

        canvas.height =
            boardContainer.clientHeight;

        redrawAllDrawings();

    },
    200
);

const whiteboardViewRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}/whiteboard_view`
);

const whiteboardCodeRef = ref(
    database,
    `GAME_SESSIONS/${sessionPin}/whiteboard_code`
);

onValue(whiteboardViewRef, (snapshot) => {
    const view = snapshot.val() || {};
    document.body.classList.toggle("projector-mode", Boolean(view.projector_mode));
    if (projectorBtn) projectorBtn.classList.toggle("active", Boolean(view.projector_mode));
    if (exitProjectorBtn) exitProjectorBtn.hidden = !view.projector_mode;
});

onValue(whiteboardCodeRef, (snapshot) => {
    const code = snapshot.val();
    publishedCode = code || null;
    if (!sharedCodeCard) return;
    sharedCodeCard.hidden = !code?.code;
    if (!code) return;
    sharedCodeTitle.textContent = code.title || "Programming example";
    sharedCodeLanguage.textContent = code.language || "C++";
    sharedCodeText.textContent = code.code || "";
    const editorFocused = [codeTitleInput, codeLanguageInput, codeInput].includes(document.activeElement);
    if (codeEditorPanel && !codeEditorPanel.hidden && !editorFocused) {
        codeTitleInput.value = code.title || "Programming example";
        codeLanguageInput.value = code.language || "C++";
        codeInput.value = code.code || "";
    }
});

openCodeBtn.addEventListener("click", () => {
    if (!isLecturer) return;
    codeEditorPanel.hidden = !codeEditorPanel.hidden;
    if (!codeEditorPanel.hidden && publishedCode) {
        codeTitleInput.value = publishedCode.title || "Programming example";
        codeLanguageInput.value = publishedCode.language || "C++";
        codeInput.value = publishedCode.code || "";
    }
});

closeCodeBtn.addEventListener("click", () => {
    codeEditorPanel.hidden = true;
});

async function publishCode() {
    if (!isLecturer) return;
    const code = codeInput.value.trim();
    if (!code) {
        await remove(whiteboardCodeRef);
        if (codeSyncStatus) codeSyncStatus.textContent = "Code display cleared.";
        return;
    }

    try {
        await set(whiteboardCodeRef, {
            title: codeTitleInput.value.trim() || "Programming example",
            language: codeLanguageInput.value,
            code,
            updated_by: currentUser.name || "Lecturer",
            updated_at: Date.now()
        });
        if (codeSyncStatus) codeSyncStatus.textContent = "Live on student screens.";
    } catch (error) {
        console.error("Code publish error:", error);
        if (codeSyncStatus) codeSyncStatus.textContent = "Could not sync code. Try again.";
    }
}

function scheduleCodePublish() {
    if (!isLecturer) return;
    if (codeSyncStatus) codeSyncStatus.textContent = "Syncing edits…";
    clearTimeout(codeSaveTimer);
    codeSaveTimer = setTimeout(publishCode, 450);
}

[codeTitleInput, codeLanguageInput, codeInput].forEach((control) => {
    control.addEventListener("input", scheduleCodePublish);
    control.addEventListener("change", scheduleCodePublish);
});

publishCodeBtn.addEventListener("click", publishCode);

projectorBtn.addEventListener("click", async () => {
    if (!isLecturer) return;
    try {
        await document.documentElement.requestFullscreen?.();
    } catch (error) {
        console.info("Fullscreen unavailable; using projector layout.", error);
    }
    await set(ref(database, `GAME_SESSIONS/${sessionPin}/whiteboard_view/projector_mode`), true);
});

exitProjectorBtn.addEventListener("click", async () => {
    if (!isLecturer) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    await set(ref(database, `GAME_SESSIONS/${sessionPin}/whiteboard_view/projector_mode`), false);
});

document.addEventListener("fullscreenchange", () => {
    if (isLecturer && !document.fullscreenElement && document.body.classList.contains("projector-mode")) {
        set(ref(database, `GAME_SESSIONS/${sessionPin}/whiteboard_view/projector_mode`), false);
    }
});