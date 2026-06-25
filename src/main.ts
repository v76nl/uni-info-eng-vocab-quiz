interface QuizItem {
    word: string;
    definition: string;
}

const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZK94Np5GThhh8Ffk_XivRHo92R_71f37rDWGxCGqN0wDwk-tGd8Gsg1zA4-4UcjCD3846w--XNnGZ/pub?output=csv";

let quizData: QuizItem[] = [];
let currentQuestionIndex = -1;
const recentIndices: number[] = [];

async function fetchQuizData(): Promise<void> {
    const questionEl = document.getElementById("question");
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        quizData = parseCSV(csvText);
        startQuiz();
    } catch (error) {
        if (questionEl) {
            questionEl.textContent = "データの読み込みに失敗。";
        }
    }
}

function parseCSV(text: string): QuizItem[] {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
    const dataLines = lines.slice(1);

    return dataLines.map((line) => {
        const [word, definition] = line.split(",");
        return { word: word || "", definition: definition || "" };
    });
}

function selectNextQuestionIndex(): number {
    if (quizData.length === 0) return -1;

    // Determine history limit based on question pool size (max 2)
    // If we only have 2 questions, history limit should be 1. If 1 question, limit is 0.
    const maxRecentLength = Math.max(0, Math.min(2, quizData.length - 1));

    const availableIndices: number[] = [];
    for (let i = 0; i < quizData.length; i++) {
        if (!recentIndices.includes(i)) {
            availableIndices.push(i);
        }
    }

    if (availableIndices.length === 0) {
        return Math.floor(Math.random() * quizData.length);
    }

    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const chosenIndex = availableIndices[randomIndex];

    recentIndices.push(chosenIndex);
    if (recentIndices.length > maxRecentLength) {
        recentIndices.shift();
    }

    return chosenIndex;
}

function startQuiz(): void {
    if (quizData.length === 0) return;
    currentQuestionIndex = selectNextQuestionIndex();
    if (currentQuestionIndex !== -1) {
        showQuestion();
        // クイズ開始後、ヘッダーをフェードアウトする (1.5秒後)
        setTimeout(() => {
            const titleEl = document.getElementById("header-title");
            if (titleEl) {
                titleEl.classList.add("fade-out");
            }
        }, 1500);
    }
}

function showQuestion(): void {
    const current = quizData[currentQuestionIndex];
    if (!current) return;

    const questionEl = document.getElementById("question");
    if (questionEl) {
        questionEl.textContent = `${current.word}`;
    }

    const feedbackEl = document.getElementById("feedback");
    if (feedbackEl) {
        feedbackEl.textContent = "";
    }

    const optionsContainer = document.getElementById("options");
    if (optionsContainer) {
        optionsContainer.innerHTML = "";

        const options = generateOptions(current.definition);
        options.forEach((option) => {
            const button = document.createElement("button");
            button.textContent = option;
            button.addEventListener("click", () =>
                checkAnswer(option, current.definition)
            );
            optionsContainer.appendChild(button);
        });
    }
}

function generateOptions(correctAnswer: string): string[] {
    const choices = [correctAnswer];
    const otherDefinitions = quizData
        .map((item) => item.definition)
        .filter((def) => def !== correctAnswer);

    // Deduplicate other definitions
    const uniqueOthers = Array.from(new Set(otherDefinitions));

    const shuffledOthers = uniqueOthers.sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
        choices.push(shuffledOthers[i]);
    }

    return choices.sort(() => 0.5 - Math.random());
}

function checkAnswer(selected: string, correct: string): void {
    const feedback = document.getElementById("feedback");
    let delay = 2000; // デフォルト値 (2秒)
    if (feedback) {
        if (selected === correct) {
            feedback.textContent = "正解！";
            feedback.style.color = "var(--itl-red)";
            delay = 1000; // 正解時は1秒に短縮
        } else {
            feedback.innerHTML = `不正解……正解は「<span style="color: var(--itl-red);">${correct}</span>」`;
            feedback.style.color = "var(--itl-black)";
            delay = 3000; // 不正解時は3秒に延長
        }
    }

    setTimeout(() => {
        currentQuestionIndex = selectNextQuestionIndex();
        if (currentQuestionIndex !== -1) {
            showQuestion();
        }
    }, delay);
}

fetchQuizData();
