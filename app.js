const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const askButton = document.getElementById("askButton");
const questionEl = document.getElementById("question");
const resultsEl = document.getElementById("results");
const answerEl = document.getElementById("answer");
const referencesEl = document.getElementById("references");

const state = {
  notes: [],
};

const BASE_PATH = (() => {
  const path = location.pathname;
  const base = path.endsWith("/") ? path : path.replace(/[^/]+$/, "");
  return `${location.origin}${base}`;
})();

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[\u3000\s]+/g, " ")
    .replace(/[!-/:-@\[-`{-~]/g, "")
    .replace(/[。、！？・「」『』（）()\[\]【】]/g, "")
    .trim();
};

const tokenize = (text) => {
  const tokens = new Set();
  const normalized = normalizeText(text);
  const latin = normalized.match(/[a-z0-9]+/g) || [];
  latin.forEach((token) => tokens.add(token));

  const japanese = normalized.match(/[\u3040-\u30ff\u4e00-\u9faf]+/g) || [];
  japanese.forEach((chunk) => {
    if (chunk.length <= 3) {
      tokens.add(chunk);
      return;
    }
    for (let i = 0; i < chunk.length - 1; i += 1) {
      tokens.add(chunk.slice(i, i + 2));
      if (i + 3 <= chunk.length) {
        tokens.add(chunk.slice(i, i + 3));
      }
    }
  });

  return Array.from(tokens).filter((token) => token.length > 0);
};

const parseFrontMatter = (content) => {
  if (!content.startsWith("---")) {
    return { meta: {}, body: content };
  }
  const end = content.indexOf("---", 3);
  if (end === -1) {
    return { meta: {}, body: content };
  }
  const raw = content.slice(3, end).trim();
  const meta = {};
  raw.split(/\n/).forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return;
    meta[key.trim()] = rest.join(":").trim();
  });
  const body = content.slice(end + 3).trim();
  return { meta, body };
};

const fetchNotes = async () => {
  statusEl.textContent = "メモを読み込み中...";
  const indexUrl = `${BASE_PATH}data/notes/index.json`;
  const response = await fetch(indexUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("メモ一覧の取得に失敗しました。");
  }
  const files = await response.json();
  const notes = await Promise.all(
    files.map(async (file) => {
      const noteUrl = `${BASE_PATH}data/notes/${file}`;
      const noteResponse = await fetch(noteUrl, { cache: "no-store" });
      if (!noteResponse.ok) {
        throw new Error(`${file} の取得に失敗しました。`);
      }
      const content = await noteResponse.text();
      const { meta, body } = parseFrontMatter(content);
      const title = meta.title || file.replace(/\.md$/, "");
      const date = meta.date || file.replace(/\.md$/, "");
      const tags = meta.tags ? meta.tags.split(",").map((tag) => tag.trim()) : [];
      return {
        file,
        title,
        date,
        tags,
        body,
        raw: content,
      };
    })
  );
  state.notes = notes;
  statusEl.textContent = "";
};

const countOccurrences = (text, token) => {
  let count = 0;
  let index = text.indexOf(token);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(token, index + token.length);
  }
  return count;
};

const createExcerpt = (text, tokens) => {
  const normalized = normalizeText(text);
  let hitIndex = -1;
  tokens.some((token) => {
    const idx = normalized.indexOf(token);
    if (idx !== -1) {
      hitIndex = idx;
      return true;
    }
    return false;
  });
  if (hitIndex === -1) {
    return text.slice(0, 200) + (text.length > 200 ? "..." : "");
  }
  const start = Math.max(0, hitIndex - 80);
  const end = Math.min(text.length, hitIndex + 120);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
};

const scoreNotes = (question) => {
  const tokens = tokenize(question);
  return state.notes
    .map((note) => {
      const searchable = normalizeText(note.body);
      const score = tokens.reduce((sum, token) => sum + countOccurrences(searchable, token), 0);
      return { note, score, tokens };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

const renderAnswer = (question, topMatches) => {
  const axes = [
    "時間軸: 6ヶ月後の自分が喜ぶ選択か",
    "資源: 使える時間・お金・集中力は十分か",
    "勢い: 今の好奇心が続くテーマか",
    "リスク: 最悪のケースを受け止められるか",
  ];
  const nextSteps = [
    "24時間以内に小さく試せる行動を1つ決める",
    "関係者に相談するための要点を3行でまとめる",
    "1週間後に振り返るチェックポイントを作る",
  ];

  answerEl.innerHTML = `
    <p class="section-title"><strong>今の状況の解釈</strong></p>
    <p>「${question}」は、価値観と現実のバランスをどう取るかが焦点です。過去メモからは、一歩踏み出す前に小さく試すことで迷いが減る傾向が見えます。</p>
    <p class="section-title"><strong>判断の軸（3〜5個）</strong></p>
    <ul>
      ${axes.map((axis) => `<li>${axis}</li>`).join("")}
    </ul>
    <p class="section-title"><strong>次の一手（すぐできる3つ）</strong></p>
    <ul>
      ${nextSteps.map((step) => `<li>${step}</li>`).join("")}
    </ul>
  `;

  referencesEl.innerHTML = topMatches
    .map(({ note, tokens }) => {
      const excerpt = createExcerpt(note.body, tokens);
      return `
        <article class="reference-card">
          <h3>${note.title}</h3>
          <div class="badges">
            <span class="badge">${note.date}</span>
            ${note.tags.map((tag) => `<span class="badge">#${tag}</span>`).join("")}
          </div>
          <p>${excerpt}</p>
        </article>
      `;
    })
    .join("");
};

const showError = (message) => {
  errorEl.textContent = message;
  statusEl.textContent = "";
};

const clearError = () => {
  errorEl.textContent = "";
};

const handleAsk = () => {
  clearError();
  const question = questionEl.value.trim();
  if (!question) {
    showError("相談内容を入力してください。");
    return;
  }
  const topMatches = scoreNotes(question);
  if (topMatches.length === 0) {
    showError("一致するメモが見つかりませんでした。別の表現を試してください。");
    resultsEl.hidden = true;
    return;
  }
  renderAnswer(question, topMatches);
  resultsEl.hidden = false;
};

askButton.addEventListener("click", handleAsk);

fetchNotes().catch((error) => {
  showError(error.message);
});
