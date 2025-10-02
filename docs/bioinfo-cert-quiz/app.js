// グローバル変数
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let answeredCount = 0;
let currentYear = null;
let selectedFields = [];
let isRandomMode = false;
let hasAnswered = false;

// 利用可能な年度（2007-2023の17年分）
const availableYears = Array.from({length: 17}, (_, i) => 2007 + i);

// localStorage チェック（GitHub Pages用）
const storageAvailable = (() => {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
})();

// メモリストレージ（localStorage使えない時用）
const memoryStorage = {};

// 初期化
window.onload = () => {
    console.log('アプリ起動');
    console.log('利用可能な年度:', availableYears);
    initYearSelection();
    initEventListeners();
    initThemeToggle();
    loadNotices();
    console.log('初期化完了');
};

// イベントリスナーの初期化
function initEventListeners() {
    document.getElementById('start-button').addEventListener('click', startQuiz);
    document.getElementById('next-button').addEventListener('click', nextQuestion);
    document.getElementById('back-button').addEventListener('click', handleBackButton);
}

// ダークモード切り替え
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            themeToggle.textContent = '☀️ ライトモード';
        } else {
            themeToggle.textContent = '🌙 ダークモード';
        }
    });
}

// 年度選択画面を初期化
function initYearSelection() {
    console.log('年度選択画面を初期化中...');
    const yearSelection = document.getElementById('year-selection');
    
    if (!yearSelection) {
        console.error('❌ year-selection要素が見つかりません');
        return;
    }
    
    yearSelection.innerHTML = '';
    
    availableYears.forEach(year => {
        const button = document.createElement('button');
        button.className = 'year-button';
        button.textContent = `${year}年度`;
        button.dataset.year = year;
        button.onclick = (e) => toggleYearSelection(e.target);
        yearSelection.appendChild(button);
        console.log(`✓ ${year}年度ボタンを追加`);
    });
    
    console.log('年度選択画面の初期化完了');
}

// 年度選択のトグル
function toggleYearSelection(button) {
    button.classList.toggle('selected');
}

// お知らせを読み込む
async function loadNotices() {
    const noticeArea = document.getElementById('recent-notices');
    if (!noticeArea) return;

    try {
        const res = await fetch('data/notice.json');
        if (!res.ok) throw new Error('読み込み失敗');

        const data = await res.json();
        const notices = data.notices || [];

        noticeArea.innerHTML = '';

        if (notices.length === 0) {
            noticeArea.innerHTML =
              '<p style="text-align:center; color: var(--text-secondary);">現在お知らせはありません。</p>';
            return;
        }

        // 最新3件を表示
        notices.slice(0, 3).forEach(n => {
            const div = document.createElement('div');
            div.className = `notice-item notice-${n.type}`;
            div.innerHTML = `<strong>${n.date}</strong> - ${n.message}`;
            noticeArea.appendChild(div);
        });
    } catch (e) {
        console.error('お知らせ読み込みエラー:', e);
        noticeArea.innerHTML =
          '<p style="text-align:center; color: red;">お知らせの読み込みに失敗しました。</p>';
    }
}


// クイズを開始
async function startQuiz() {
    // 選択された年度を取得
    const selectedYears = Array.from(document.querySelectorAll('.year-button.selected'))
        .map(btn => parseInt(btn.dataset.year));
    
    if (selectedYears.length === 0) {
        alert('年度を1つ以上選択してください');
        return;
    }

    // 選択された分野を取得
    selectedFields = Array.from(document.querySelectorAll('#field-filter input:checked'))
        .map(input => input.value);
    
    if (selectedFields.length === 0) {
        alert('分野を1つ以上選択してください');
        return;
    }

    // 出題モードを取得
    isRandomMode = document.querySelector('input[name="mode"]:checked').value === 'random';

    // 問題を読み込む
    await loadQuestions(selectedYears);
}

// 問題を読み込む
async function loadQuestions(years) {
    try {
        allQuestions = [];
        
        // 複数年度の問題を読み込む
        for (const year of years) {
            const res = await fetch(`data/${year}.json`);
            if (!res.ok) {
                console.error(`${year}年度の読み込みに失敗`);
                continue;
            }
            const yearQuestions = await res.json();
            allQuestions.push(...yearQuestions);
        }

        if (allQuestions.length === 0) {
            alert('問題データの読み込みに失敗しました');
            return;
        }

        // 分野でフィルタリング
        questions = allQuestions.filter(q => selectedFields.includes(q.field));

        if (questions.length === 0) {
            alert('選択した条件に該当する問題がありません');
            return;
        }

        // ランダムモードの場合はシャッフル
        if (isRandomMode) {
            shuffleArray(questions);
        }

        // 初期化
        currentIndex = 0;
        correctCount = 0;
        answeredCount = 0;
        hasAnswered = false;
        
        // 画面切り替え
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('quiz-container').style.display = 'block';
        
        // ヘッダー情報を更新
        const yearText = years.length === 1 ? `${years[0]}年度` : `${years.length}年度分`;
        document.getElementById('current-year').textContent = yearText;
        document.getElementById('current-mode').textContent = isRandomMode ? 'ランダム出題' : '順番出題';
        document.getElementById('total-number').textContent = questions.length;
        
        showQuestion();
    } catch (error) {
        console.error('問題読み込みエラー:', error);
        alert('問題データの読み込みに失敗しました');
    }
}

// 配列をシャッフル（Fisher-Yates アルゴリズム）
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 問題を表示
function showQuestion() {
    const q = questions[currentIndex];
    hasAnswered = false;
    
    // 問題番号を更新
    document.getElementById('current-number').textContent = currentIndex + 1;
    
    // 分野バッジを表示
    const fieldBadge = document.getElementById('field-badge');
    fieldBadge.textContent = q.field;
    fieldBadge.className = `field-badge ${q.field}`;
    
    // 問題文を表示
    document.getElementById('question-text').textContent = 
        `問${q.question_number}. ${q.question_text}`;
    
    // 画像を表示
    const imageArea = document.getElementById('image-area');
    imageArea.innerHTML = '';
    if (q.images && q.images.length > 0) {
        q.images.forEach(src => {
            const img = document.createElement('img');
            // 画像パスを正規化（相対パスを削除）
            const cleanSrc = src.replace(/^\.\/data\/images\/\d+\//, '').replace(/^images\/\d+\//, '');
            img.src = `images/${q.year}/${cleanSrc}`;
            img.alt = '問題画像';
            img.onerror = () => {
                console.error(`画像の読み込みエラー: ${img.src}`);
                img.style.display = 'none';
            };
            imageArea.appendChild(img);
        });
    }
    
    // 選択肢を表示
    const optionsUl = document.getElementById('options');
    optionsUl.innerHTML = '';
    for (const [key, text] of Object.entries(q.options)) {
        const li = document.createElement('li');
        li.textContent = `${key}. ${text}`;
        li.dataset.value = key;
        li.onclick = () => checkAnswer(key, q.answer, q.explanation);
        optionsUl.appendChild(li);
    }
    
    // 結果表示と解説をリセット
    document.getElementById('result-display').style.display = 'none';
    document.getElementById('explanation-area').style.display = 'none';
    document.getElementById('next-button').style.display = 'none';
}

// 回答をチェック
function checkAnswer(selected, correctAnswer, explanation) {
    if (hasAnswered) return;
    hasAnswered = true;
    answeredCount++;
    
    const isCorrect = (selected === correctAnswer || selected == correctAnswer);
    const optionsLi = document.querySelectorAll('#options li');
    
    // 全ての選択肢を無効化
    optionsLi.forEach(li => {
        li.classList.add('disabled');
        if (li.dataset.value === correctAnswer || li.dataset.value == correctAnswer) {
            li.classList.add('correct');
        }
    });
    
    // 選択した選択肢をハイライト
    if (!isCorrect) {
        optionsLi.forEach(li => {
            if (li.dataset.value === selected) {
                li.classList.add('incorrect');
            }
        });
    }
    
    // 結果を表示
    const resultDisplay = document.getElementById('result-display');
    const resultIcon = resultDisplay.querySelector('.result-icon');
    const resultMessage = resultDisplay.querySelector('.result-message');
    
    if (isCorrect) {
        correctCount++;
        resultDisplay.className = 'correct';
        resultIcon.textContent = '✓';
        resultMessage.textContent = '正解です！';
    } else {
        resultDisplay.className = 'incorrect';
        resultIcon.textContent = '✗';
        resultMessage.textContent = `不正解です。正解は ${correctAnswer} です。`;
    }
    
    resultDisplay.style.display = 'block';
    
    // 解説を表示
    showExplanation(explanation);
    
    updateScore();
    
    // 次へボタンを表示
    document.getElementById('next-button').style.display = 'inline-block';
    
    // 学習履歴を保存（GitHub Pages用）
    saveProgress();
}

// 解説を表示
function showExplanation(explanation) {
    const explanationArea = document.getElementById('explanation-area');
    const explanationText = document.getElementById('explanation-text');
    
    if (explanation && explanation.trim() !== '') {
        explanationText.textContent = explanation;
        explanationArea.style.display = 'block';
    } else {
        explanationText.textContent = 'この問題には解説がありません。';
        explanationArea.style.display = 'block';
    }
}

// 次の問題へ
function nextQuestion() {
    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion();
    } else {
        showFinalResult();
    }
}

// 最終結果を表示
function showFinalResult() {
    const percentage = ((correctCount / answeredCount) * 100).toFixed(1);
    const resultDisplay = document.getElementById('result-display');
    resultDisplay.className = percentage >= 70 ? 'correct' : 'incorrect';
    resultDisplay.querySelector('.result-icon').textContent = '🎉';
    resultDisplay.querySelector('.result-message').innerHTML = 
        `<strong>全問終了！</strong><br>あなたのスコア: ${correctCount} / ${answeredCount} (${percentage}%)`;
    resultDisplay.style.display = 'block';
    
    document.getElementById('question-area').style.display = 'none';
    document.getElementById('explanation-area').style.display = 'none';
    document.getElementById('next-button').style.display = 'none';
}

// スコアを更新
function updateScore() {
    document.getElementById('correct-count').textContent = correctCount;
    const percentage = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : '0.0';
    document.getElementById('percentage').textContent = percentage;
}

// 設定画面に戻る
function handleBackButton() {
    const backButton = document.getElementById('back-button');
    
    if (answeredCount > 0 && !backButton.classList.contains('warning')) {
        // 初回クリック：警告表示
        backButton.classList.add('warning');
        backButton.innerHTML = '⚠️ クリックで結果リセット';
        
        // 5秒後に元に戻す
        setTimeout(() => {
            backButton.classList.remove('warning');
            backButton.innerHTML = '← TOPへ戻る';
        }, 5000);
    } else {
        // 2回目クリックまたは未回答の場合：実行
        backToSettings();
    }
}

function backToSettings() {
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('question-area').style.display = 'block';
    
    // ボタンを元に戻す
    const backButton = document.getElementById('back-button');
    backButton.classList.remove('warning');
    backButton.innerHTML = '← TOPへ戻る';
    
    // リセット
    questions = [];
    allQuestions = [];
    currentIndex = 0;
    correctCount = 0;
    answeredCount = 0;
}

// 学習履歴を保存（localStorage使用可能な場合のみ）
function saveProgress() {
    if (!storageAvailable) return;
    
    try {
        const progress = {
            correctCount,
            answeredCount,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('bioinformatics_progress', JSON.stringify(progress));
    } catch (e) {
        console.error('保存エラー:', e);
    }
}

// 学習履歴を読み込む（localStorage使用可能な場合のみ）
function loadProgress() {
    if (!storageAvailable) return null;
    
    try {
        const data = localStorage.getItem('bioinformatics_progress');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('読み込みエラー:', e);
        return null;
    }
}