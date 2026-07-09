interface QuizItem {
    word: string;
    definition: string;
}

const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZK94Np5GThhh8Ffk_XivRHo92R_71f37rDWGxCGqN0wDwk-tGd8Gsg1zA4-4UcjCD3846w--XNnGZ/pub?output=csv";

let quizData: QuizItem[] = [];
let currentQuestionIndex = -1;
const recentIndices: number[] = [];

let wordWeights: Record<string, number> = {};
const DEFAULT_WEIGHT = 10;
const WEIGHT_STORAGE_KEY = "quiz_word_weights";

function loadWeights(): void {
    const saved = localStorage.getItem(WEIGHT_STORAGE_KEY);
    if (saved) {
        try {
            wordWeights = JSON.parse(saved);
        } catch (e) {
            wordWeights = {};
        }
    }
}

function saveWeights(): void {
    localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(wordWeights));
}

function getWeight(word: string): number {
    return wordWeights[word] !== undefined ? wordWeights[word] : DEFAULT_WEIGHT;
}

function updateWeight(word: string, isCorrect: boolean): void {
    const currentWeight = getWeight(word);
    if (isCorrect) {
        // 正解したら重みを減らす（最小値1）
        wordWeights[word] = Math.max(1, Math.floor(currentWeight / 2));
    } else {
        // 不正解・スキップしたら重みを増やす（最大値20）
        wordWeights[word] = Math.min(20, currentWeight + 5);
    }
    saveWeights();
}

function initNavigation(): void {
    const btnQuiz = document.getElementById("btn-quiz");
    const btnWordbook = document.getElementById("btn-wordbook");
    const btnList = document.getElementById("btn-list");
    const quizContainer = document.getElementById("quiz-container");
    const wordbookContainer = document.getElementById("wordbook-container");
    const listContainer = document.getElementById("list-container");

    if (
        btnQuiz &&
        btnWordbook &&
        btnList &&
        quizContainer &&
        wordbookContainer &&
        listContainer
    ) {
        btnQuiz.addEventListener("click", () => {
            quizContainer.classList.remove("hidden");
            wordbookContainer.classList.add("hidden");
            listContainer.classList.add("hidden");
            btnQuiz.classList.add("active");
            btnWordbook.classList.remove("active");
            btnList.classList.remove("active");
        });

        btnWordbook.addEventListener("click", () => {
            quizContainer.classList.add("hidden");
            wordbookContainer.classList.remove("hidden");
            listContainer.classList.add("hidden");
            btnQuiz.classList.remove("active");
            btnWordbook.classList.add("active");
            btnList.classList.remove("active");
            // 切り替え時に単語帳を再描画する
            renderWordbook();
        });

        btnList.addEventListener("click", () => {
            quizContainer.classList.add("hidden");
            wordbookContainer.classList.add("hidden");
            listContainer.classList.remove("hidden");
            btnQuiz.classList.remove("active");
            btnWordbook.classList.remove("active");
            btnList.classList.add("active");
            // 切り替え時にリストを再描画する
            renderVocabList();
        });
    }
}

function initTableScrollListeners(): void {
    const containers = document.querySelectorAll(".scroll-fade-container");
    containers.forEach((container) => {
        const wrapper = container.querySelector(".table-wrapper");
        if (!wrapper) return;

        // 初期状態のチェック (データ数が少なくスクロール不要な場合に対応)
        checkScrollShadows(wrapper, container);

        wrapper.addEventListener("scroll", () => {
            checkScrollShadows(wrapper, container);
        });
    });
}

function checkScrollShadows(wrapper: Element, container: Element): void {
    const scrollTop = wrapper.scrollTop;
    const clientHeight = wrapper.clientHeight;
    const scrollHeight = wrapper.scrollHeight;

    // コンテンツ全体が表示領域に収まっており、スクロール不要な場合
    if (scrollHeight <= clientHeight) {
        container.classList.remove("show-bottom-shadow");
        return;
    }

    // 下側の影：最下部に到達していなければ表示する
    const isBottom = scrollTop + clientHeight >= scrollHeight - 5;
    if (isBottom) {
        container.classList.remove("show-bottom-shadow");
    } else {
        container.classList.add("show-bottom-shadow");
    }
}

function renderVocabList(): void {
    const tbody = document.getElementById("vocab-list-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    quizData.forEach((item) => {
        const tr = document.createElement("tr");

        const tdWord = document.createElement("td");
        tdWord.textContent = item.word;

        const tdDef = document.createElement("td");
        tdDef.textContent = item.definition;

        tr.appendChild(tdWord);
        tr.appendChild(tdDef);
        tbody.appendChild(tr);
    });

    // リスト描画後にスクロール監視を初期化する
    initTableScrollListeners();
}

function renderWordbook(): void {
    const tbody = document.getElementById("wordbook-list-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    quizData.forEach((item) => {
        const tr = document.createElement("tr");

        const tdWord = document.createElement("td");
        tdWord.textContent = item.word;

        const tdDef = document.createElement("td");
        
        // マスクラッパー
        const maskWrapper = document.createElement("span");
        maskWrapper.className = "wordbook-mask";
        
        // 意味テキスト本体
        const textSpan = document.createElement("span");
        textSpan.className = "wordbook-text";
        textSpan.textContent = item.definition;
        
        maskWrapper.appendChild(textSpan);
        
        // タップ時にマスクを解除
        tdDef.addEventListener("click", () => {
            if (!maskWrapper.classList.contains("revealed")) {
                maskWrapper.classList.add("revealed");
            }
        });

        tdDef.appendChild(maskWrapper);
        tr.appendChild(tdWord);
        tr.appendChild(tdDef);
        tbody.appendChild(tr);
    });

    // 単語帳描画後にスクロール監視を初期化する
    initTableScrollListeners();
}

async function fetchQuizData(): Promise<void> {
    const questionEl = document.getElementById("question");
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        quizData = parseCSV(csvText);
        loadWeights();
        initNavigation();
        renderVocabList();
        renderWordbook();
        initSkipButton(); // スキップボタンの初期化
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
    const maxRecentLength = Math.max(0, Math.min(2, quizData.length - 1));

    const availableIndices: number[] = [];
    const cumulativeWeights: number[] = [];
    let totalWeight = 0;

    for (let i = 0; i < quizData.length; i++) {
        if (!recentIndices.includes(i)) {
            availableIndices.push(i);
            const w = getWeight(quizData[i].word);
            totalWeight += w;
            cumulativeWeights.push(totalWeight);
        }
    }

    if (availableIndices.length === 0) {
        return Math.floor(Math.random() * quizData.length);
    }

    // Weighted random selection
    const r = Math.random() * totalWeight;
    let chosenIndex = availableIndices[0];
    for (let j = 0; j < cumulativeWeights.length; j++) {
        if (r < cumulativeWeights[j]) {
            chosenIndex = availableIndices[j];
            break;
        }
    }

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
                // トランジション完了後(1秒後)に要素を完全に非表示にし、レイアウト干渉を防ぐ
                setTimeout(() => {
                    titleEl.classList.add("hidden");
                }, 1000);
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
        feedbackEl.classList.remove("fade-out");
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

    // スキップボタンを活性化
    const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement | null;
    if (btnSkip) {
        btnSkip.disabled = false;
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

function disableAllQuizButtons(): void {
    const optionsContainer = document.getElementById("options");
    if (optionsContainer) {
        const buttons = optionsContainer.querySelectorAll("button");
        buttons.forEach((btn) => {
            btn.disabled = true;
        });
    }
    const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement | null;
    if (btnSkip) {
        btnSkip.disabled = true;
    }
}

function checkAnswer(selected: string, correct: string): void {
    disableAllQuizButtons();

    const currentWord = quizData[currentQuestionIndex].word;
    const isCorrect = (selected === correct);
    updateWeight(currentWord, isCorrect);

    const feedback = document.getElementById("feedback");
    let delay = 2000; // デフォルト値 (2秒)
    if (feedback) {
        if (isCorrect) {
            feedback.textContent = "正解！";
            feedback.style.color = "var(--accent-red)";
            delay = 1200; // 正解時は1.2秒に短縮
        } else {
            feedback.innerHTML = `不正解……正解は「<span style="color: var(--accent-red); font-weight: bold;">${correct}</span>」`;
            feedback.style.color = "var(--text-color)";
            delay = 3000; // 不正解時は3秒に延長
        }
    }

    // 次の問題に進む200ms前にフィードバックをフェードアウトする (正解時・不正解時それぞれの遅延時間に基づく)
    const fadeOutDelay = Math.max(0, delay - 200);
    setTimeout(() => {
        if (feedback) {
            feedback.classList.add("fade-out");
        }
    }, fadeOutDelay);

    setTimeout(() => {
        currentQuestionIndex = selectNextQuestionIndex();
        if (currentQuestionIndex !== -1) {
            showQuestion();
        }
    }, delay);
}

function handleSkip(correct: string): void {
    disableAllQuizButtons();

    const currentWord = quizData[currentQuestionIndex].word;
    updateWeight(currentWord, false);

    const feedback = document.getElementById("feedback");
    const delay = 2000; // スキップ時は2秒表示して次へ
    if (feedback) {
        feedback.innerHTML = `スキップしました。<br>正解は「<span style="color: var(--accent-red); font-weight: bold;">${correct}</span>」`;
        feedback.style.color = "var(--text-color)";
    }

    const fadeOutDelay = Math.max(0, delay - 200);
    setTimeout(() => {
        if (feedback) {
            feedback.classList.add("fade-out");
        }
    }, fadeOutDelay);

    setTimeout(() => {
        currentQuestionIndex = selectNextQuestionIndex();
        if (currentQuestionIndex !== -1) {
            showQuestion();
        }
    }, delay);
}

function initSkipButton(): void {
    const btnSkip = document.getElementById("btn-skip");
    if (btnSkip) {
        btnSkip.addEventListener("click", () => {
            const current = quizData[currentQuestionIndex];
            if (current) {
                handleSkip(current.definition);
            }
        });
    }
}

fetchQuizData();
