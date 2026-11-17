const modules = [
  {
    id: 'syntax',
    title: 'Syntax',
    group: 'Getting started',
    intro: 'Syntax is the set of rules that gives C++ instructions a structure the compiler can understand. Think of it as the grammar of a programming language.',
    sections: [
      {
        title: 'A first C++ program',
        body: '<p>A C++ program starts running at <code>main()</code>. The braces mark the beginning and end of its body. Statements inside the body run when the program starts.</p><div class="lesson-code-wrap"><div class="lesson-code-title">A minimal program</div><pre class="lesson-code"><span class="keyword">#include</span> &lt;iostream&gt;\n\n<span class="keyword">int</span> main() {\n    std::cout &lt;&lt; <span class="string">"Hello, C++!"</span>;\n    <span class="keyword">return</span> <span class="number">0</span>;\n}</pre></div>'
      },
      {
        title: 'Read the program from top to bottom',
        body: '<ol class="lesson-step-list"><li><code>#include &lt;iostream&gt;</code> makes standard input and output tools available.</li><li><code>int main()</code> declares the main function, where program execution begins.</li><li><code>{</code> and <code>}</code> enclose the function body.</li><li><code>std::cout</code> sends text to the output, and <code>return 0;</code> ends the program successfully.</li></ol>'
      },
      {
        title: 'Key idea',
        body: '<p>A C++ source file contains declarations and instructions. The compiler checks their structure before producing a program. When the structure is invalid, the compiler reports an error instead of guessing what you meant.</p>'
      }
    ],
    quiz: {
      question: 'Where does a standard C++ program begin execution?',
      options: ['At the first comment', 'Inside main()', 'At the final closing brace'],
      answer: 1,
      explanation: 'Execution begins in the main function.'
    },
    resource: 'https://www.w3schools.com/cpp/cpp_syntax.asp'
  },
  {
    id: 'basic-syntax-rules',
    title: 'Basic Syntax Rules',
    group: 'Getting started',
    intro: 'Small syntax details matter in C++. Learn how statements, blocks, names, and comments work so your code is easier to write and debug.',
    sections: [
      {
        title: 'Statements and semicolons',
        body: '<p>Most C++ instructions are statements, and most statements end with a semicolon. A missing semicolon is a common compiler error.</p><div class="lesson-code-wrap"><div class="lesson-code-title">Statement examples</div><pre class="lesson-code"><span class="keyword">int</span> score = <span class="number">10</span>;\nscore = score + <span class="number">5</span>;\nstd::cout &lt;&lt; score;</pre></div>'
      },
      {
        title: 'Blocks, names, and comments',
        body: '<ul><li>Curly braces <code>{ }</code> group instructions into a block.</li><li>C++ is case-sensitive: <code>total</code> and <code>Total</code> are different names.</li><li>Choose meaningful names such as <code>studentCount</code>.</li><li>Use <code>//</code> for a one-line comment or <code>/* ... */</code> for a block comment.</li></ul><div class="lesson-code-wrap"><div class="lesson-code-title">Comments do not run as instructions</div><pre class="lesson-code"><span class="comment">// Store the number of completed questions</span>\n<span class="keyword">int</span> completedQuestions = <span class="number">4</span>;</pre></div>'
      },
      {
        title: 'Common mistakes to check',
        body: '<p>When code does not compile, check semicolons, matching braces, quotation marks, and spelling—including uppercase and lowercase letters. Read the first compiler error carefully; later errors may be caused by that first one.</p>'
      }
    ],
    quiz: {
      question: 'Which line is a valid C++ statement?',
      options: ['int age = 18', 'int age = 18;', 'Int age = 18;'],
      answer: 1,
      explanation: 'The statement ends with a semicolon and uses the lowercase type name int.'
    },
    resource: 'https://www.w3schools.com/cpp/cpp_syntax.asp'
  },
  {
    id: 'data-types-operators',
    title: 'Data Types and Operators',
    group: 'Getting started',
    intro: 'Data types describe what a value represents. Operators let a program calculate, compare, and combine those values.',
    sections: [
      {
        title: 'Choose a type for the value',
        body: '<ul><li><code>int</code> stores whole numbers, such as a score or item count.</li><li><code>double</code> stores decimal numbers, such as a measurement.</li><li><code>char</code> stores one character in single quotes.</li><li><code>bool</code> stores <code>true</code> or <code>false</code>.</li><li><code>std::string</code> stores text and is available through <code>&lt;string&gt;</code>.</li></ul>'
      },
      {
        title: 'Operators perform work',
        body: '<p>Arithmetic operators include <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, and <code>%</code>. Comparison operators such as <code>==</code>, <code>&lt;</code>, and <code>&gt;=</code> produce a Boolean result.</p><div class="lesson-code-wrap"><div class="lesson-code-title">Values, calculations, and comparisons</div><pre class="lesson-code"><span class="keyword">int</span> correct = <span class="number">7</span>;\n<span class="keyword">int</span> total = <span class="number">10</span>;\n<span class="keyword">double</span> accuracy = <span class="number">100.0</span> * correct / total;\n<span class="keyword">bool</span> passed = correct &gt;= <span class="number">5</span>;</pre></div>'
      },
      {
        title: 'Watch the order of operations',
        body: '<p>Multiplication and division are evaluated before addition and subtraction. Use parentheses to make the intended order clear. Integer division drops the fractional part, so use a decimal value when you need a decimal result.</p>'
      }
    ],
    quiz: {
      question: 'Which type is most suitable for storing whether a condition is true or false?',
      options: ['int', 'bool', 'char'],
      answer: 1,
      explanation: 'The bool type represents true or false values.'
    },
    resource: [
      { label: 'Review C++ data types', url: 'https://www.w3schools.com/cpp/cpp_data_types.asp' },
      { label: 'Explore C++ operators', url: 'https://www.w3schools.com/cpp/cpp_operators.asp' }
    ]
  },
  {
    id: 'sequential-control',
    title: 'Sequential Control',
    group: 'Control structure',
    intro: 'Sequential control is the default flow of a program: instructions run one after another in the order they appear.',
    sections: [
      {
        title: 'Trace each instruction in order',
        body: '<p>Each statement can use values created by earlier statements. Follow the updates from top to bottom to work out the final result.</p><div class="lesson-code-wrap"><div class="lesson-code-title">Trace the values</div><pre class="lesson-code"><span class="keyword">int</span> price = <span class="number">4</span>;\n<span class="keyword">int</span> quantity = <span class="number">3</span>;\n<span class="keyword">int</span> total = price * quantity;\ntotal = total - <span class="number">2</span>;\nstd::cout &lt;&lt; total;</pre></div>'
      },
      {
        title: 'Follow the data',
        body: '<ol class="lesson-step-list"><li><code>price</code> starts at 4.</li><li><code>quantity</code> is set to 3.</li><li><code>total</code> becomes 4 × 3, which is 12.</li><li>The next statement subtracts 2, so the output is 10.</li></ol>'
      },
      {
        title: 'Why planning the sequence helps',
        body: '<p>Before writing code, outline the steps in plain language. Then translate each step into a statement. This makes it easier to spot missing steps and to explain how your solution reaches its result.</p>'
      }
    ],
    quiz: {
      question: 'What does the example program output?',
      options: ['10', '12', '14'],
      answer: 0,
      explanation: 'The total is 4 × 3 = 12, then 2 is subtracted, leaving 10.'
    },
    resource: 'https://www.w3schools.com/cpp/cpp_variables.asp'
  },
  {
    id: 'selection-control',
    title: 'Selection Control',
    group: 'Control structure',
    intro: 'Selection control lets a program choose which instructions to run. Conditions are evaluated as true or false to select a path.',
    sections: [
      {
        title: 'Use if and else',
        body: '<p>Use <code>if</code> when an action should run only if a condition is true. Add <code>else</code> for the alternative path. Use <code>else if</code> when there are more than two cases.</p><div class="lesson-code-wrap"><div class="lesson-code-title">Choose a message from a score</div><pre class="lesson-code"><span class="keyword">int</span> score = <span class="number">72</span>;\n\n<span class="keyword">if</span> (score &gt;= <span class="number">80</span>) {\n    std::cout &lt;&lt; <span class="string">"Excellent"</span>;\n} <span class="keyword">else if</span> (score &gt;= <span class="number">50</span>) {\n    std::cout &lt;&lt; <span class="string">"Keep going"</span>;\n} <span class="keyword">else</span> {\n    std::cout &lt;&lt; <span class="string">"Review the topic"</span>;\n}</pre></div>'
      },
      {
        title: 'Build clear conditions',
        body: '<ul><li>Use comparison operators such as <code>==</code>, <code>!=</code>, <code>&lt;</code>, and <code>&gt;=</code>.</li><li>Combine checks with <code>&amp;&amp;</code> (and) or <code>||</code> (or).</li><li>Use braces around each branch to make its scope clear.</li><li>Put more specific cases before broader cases.</li></ul>'
      },
      {
        title: 'Trace the selected path',
        body: '<p>For the example, 72 is not at least 80, so the first branch is skipped. It is at least 50, so the second branch runs. The final <code>else</code> branch is skipped.</p>'
      }
    ],
    quiz: {
      question: 'For score = 72 in the example, which message is printed?',
      options: ['Excellent', 'Keep going', 'Review the topic'],
      answer: 1,
      explanation: '72 is below 80 but at least 50, so the else-if branch runs.'
    },
    resource: 'https://www.w3schools.com/cpp/cpp_conditions.asp'
  },
  {
    id: 'iteration-control',
    title: 'Iteration Control',
    group: 'Control structure',
    intro: 'Iteration control repeats instructions. A loop needs a clear starting point, a condition, and a way to make progress toward stopping.',
    sections: [
      {
        title: 'Use a for loop when the count is known',
        body: '<p>A <code>for</code> loop keeps its setup, repeat condition, and update together. The example runs once for each value from 1 to 5.</p><div class="lesson-code-wrap"><div class="lesson-code-title">Count from 1 to 5</div><pre class="lesson-code"><span class="keyword">for</span> (<span class="keyword">int</span> number = <span class="number">1</span>; number &lt;= <span class="number">5</span>; number++) {\n    std::cout &lt;&lt; number &lt;&lt; <span class="string">" "</span>;\n}</pre></div>'
      },
      {
        title: 'Understand the three loop parts',
        body: '<ol class="lesson-step-list"><li>Initialisation: <code>int number = 1</code> runs once before the loop.</li><li>Condition: <code>number &lt;= 5</code> is checked before each repetition.</li><li>Body: the output statement runs when the condition is true.</li><li>Update: <code>number++</code> adds one, then the condition is checked again.</li></ol>'
      },
      {
        title: 'Prevent an endless loop',
        body: '<p>Make sure something inside the loop changes the value used by its condition. If the condition never becomes false, the loop may continue indefinitely. A <code>while</code> loop is useful when the number of repetitions depends on a condition rather than a fixed count.</p>'
      }
    ],
    quiz: {
      question: 'What prevents the example for loop from running forever?',
      options: ['The condition eventually becomes false as number increases', 'The output statement ends the program', 'The loop has no update step'],
      answer: 0,
      explanation: 'number increases each time, so number <= 5 eventually becomes false.'
    },
    resource: 'https://www.w3schools.com/cpp/cpp_for_loop.asp'
  }
];

let currentUserId = 'guest';
try {
  const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  currentUserId = currentUser
    ? (currentUser.user_id || currentUser.uid || currentUser.id || 'guest')
    : 'guest';
} catch (error) {
  console.warn('Student identity could not be read; course progress will be saved for this browser.', error);
}
const courseProgressStorageKey = `mazeprog-cpp-course-progress-v1:${currentUserId}`;
const moduleList = document.getElementById('moduleList');
const controlModuleList = document.getElementById('controlModuleList');
const lessonKicker = document.getElementById('lessonKicker');
const lessonTitle = document.getElementById('lessonTitle');
const lessonIntro = document.getElementById('lessonIntro');
const lessonContent = document.getElementById('lessonContent');
const lessonComplete = document.getElementById('lessonComplete');
const moduleCounter = document.getElementById('moduleCounter');
const previousButton = document.getElementById('previousModule');
const nextButton = document.getElementById('nextModule');
const progressBar = document.getElementById('courseProgressBar');
const progressTrack = document.querySelector('.course-progress');
const progressText = document.getElementById('courseProgressText');
const progressPercent = document.getElementById('courseProgressPercent');

let currentIndex = 0;
let completedModules = loadProgress();

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(courseProgressStorageKey) || '{}');
    return new Set(Array.isArray(saved.completed) ? saved.completed.filter((id) =>
      modules.some((module) => module.id === id)
    ) : []);
  } catch (error) {
    console.warn('Course progress could not be restored.', error);
    return new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(courseProgressStorageKey, JSON.stringify({ completed: [...completedModules] }));
  } catch (error) {
    console.warn('Course progress could not be saved.', error);
  }
}

function renderModuleNavigation() {
  moduleList.replaceChildren();
  controlModuleList.replaceChildren();

  modules.forEach((module, index) => {
    const button = document.createElement('button');
    button.className = 'module-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Module ${index + 1}: ${module.title}`);

    const number = document.createElement('span');
    number.className = 'module-number';
    number.textContent = completedModules.has(module.id) ? '✓' : String(index + 1);

    const title = document.createElement('span');
    title.textContent = module.title;
    button.append(number, title);

    if (index === currentIndex) button.setAttribute('aria-current', 'step');
    if (completedModules.has(module.id)) button.classList.add('is-complete');

    button.addEventListener('click', () => {
      currentIndex = index;
      renderModule();
    });

    (module.group === 'Getting started' ? moduleList : controlModuleList).append(button);
  });
}

function updateProgress() {
  const completedCount = completedModules.size;
  const percentage = Math.round((completedCount / modules.length) * 100);
  progressBar.style.width = `${percentage}%`;
  progressTrack.setAttribute('aria-valuenow', String(percentage));
  progressText.textContent = `${completedCount} of ${modules.length} modules completed`;
  progressPercent.textContent = `${percentage}%`;
}

function renderModule() {
  const module = modules[currentIndex];
  lessonKicker.textContent = `${module.group} · Module ${currentIndex + 1}`;
  lessonTitle.textContent = module.title;
  lessonIntro.textContent = module.intro;
  moduleCounter.textContent = `Module ${currentIndex + 1} of ${modules.length}`;
  previousButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === modules.length - 1;
  nextButton.textContent = currentIndex === modules.length - 1 ? 'End of course' : 'Next module';
  renderModuleNavigation();
  updateProgress();
  renderLessonContent(module);
  renderCompletion(module);
}

function renderLessonContent(module) {
  const sections = module.sections.map((section) => `
    <section class="lesson-section">
      <h3>${section.title}</h3>
      ${section.body}
    </section>
  `).join('');

  const options = module.quiz.options.map((option, index) => `
    <label class="quiz-option">
      <input type="radio" name="moduleQuiz" value="${index}">
      <span>${option}</span>
    </label>
  `).join('');

  lessonContent.innerHTML = `${sections}
    <section class="lesson-section">
      <fieldset class="try-it" style="border:0; padding:0;">
        <legend>Quick check: ${module.quiz.question}</legend>
        <div class="quiz-options">${options}</div>
        <button id="checkAnswer" class="btn btn-outline" type="button" style="justify-self:start;">Check answer</button>
        <p id="quizFeedback" class="quiz-feedback" role="status" aria-live="polite"></p>
      </fieldset>
    </section>
    <section class="lesson-section">
      <h3>Go further</h3>
      <p>Want another explanation or more examples? Open the related W3Schools lesson in a new tab.</p>
      ${(Array.isArray(module.resource) ? module.resource : [{ label: 'Open the W3Schools lesson', url: module.resource }]).map((resource) =>
        `<a href="${resource.url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; margin:8px 12px 0 0; color:#7dd3fc; font-size:12px; font-weight:700; text-decoration:none;">${resource.label} ↗</a>`
      ).join('')}
    </section>`;

  document.getElementById('checkAnswer').addEventListener('click', () => checkAnswer(module));
}

function renderCompletion(module) {
  const isComplete = completedModules.has(module.id);
  lessonComplete.style.display = isComplete ? 'block' : 'none';
  lessonComplete.textContent = isComplete
    ? 'Module completed. You can revisit this lesson at any time.'
    : '';
}

function checkAnswer(module) {
  const selected = lessonContent.querySelector('input[name="moduleQuiz"]:checked');
  const feedback = document.getElementById('quizFeedback');
  if (!selected) {
    feedback.textContent = 'Choose an answer before checking.';
    feedback.className = 'quiz-feedback is-incorrect';
    return;
  }

  if (Number(selected.value) === module.quiz.answer) {
    completedModules.add(module.id);
    saveProgress();
    renderModuleNavigation();
    updateProgress();
    lessonComplete.style.display = 'block';
    lessonComplete.textContent = `Correct. ${module.quiz.explanation} Module completed.`;
    feedback.textContent = 'Correct! You can continue to the next module or review this one.';
    feedback.className = 'quiz-feedback is-correct';
  } else {
    feedback.textContent = `Not quite. ${module.quiz.explanation} Review the example and try again.`;
    feedback.className = 'quiz-feedback is-incorrect';
  }
}

previousButton.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderModule();
  }
});

nextButton.addEventListener('click', () => {
  if (currentIndex < modules.length - 1) {
    currentIndex++;
    renderModule();
  }
});

const suggestedTopic = new URLSearchParams(window.location.search).get('topic')?.toLowerCase();
if (suggestedTopic) {
  const normalizeTopic = (value) => value.toLowerCase()
    .replace(/\btypes\b/g, 'type')
    .replace(/\boperators\b/g, 'operator')
    .trim();
  const normalizedSuggestion = normalizeTopic(suggestedTopic);
  const topicModule = modules.findIndex((module) =>
    normalizeTopic(`${module.id} ${module.title} ${module.group}`).includes(normalizedSuggestion)
  );
  if (topicModule >= 0) currentIndex = topicModule;
}

renderModule();
