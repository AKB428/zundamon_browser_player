let scenarioData = null;
let currentSceneIndex = 0;
let currentLineIndex = 0;
let audio = null; // 音声再生用
let speakingInterval = null; // 口パク切り替え用タイマー

window.addEventListener("load", () => {
  // シナリオJSONを読み込む
  fetch("scenario.json")
    .then(res => res.json())
    .then(data => {
      scenarioData = data;
      setupScene(0); // 最初のシーンをセット
    });

  // 「次へ」ボタンは削除したので不要
  // 代わりにセリフボックスをクリックすると次のセリフへ
  const dialogueBox = document.getElementById("dialogueBox");
  dialogueBox.addEventListener("click", () => {
    playNextLine();
  });
});

let currentBackground = null;

function setupScene(sceneIndex) {
  currentSceneIndex = sceneIndex;
  currentLineIndex = 0;
  const scene = scenarioData.scenes[sceneIndex];

  // 背景設定：シーンの setBackground が現在の背景と異なる場合のみ更新
  const bgId = scene.setBackground;
  const newBgFile = scenarioData.backgrounds[bgId];
  if (newBgFile !== currentBackground) {
    document.getElementById("stage").style.backgroundImage = `url(${newBgFile})`;
    currentBackground = newBgFile;
  }
  
  // デフォルト画像をセット
  document.getElementById("charLeft").src = scenarioData.defaultLeftCharacter;
  document.getElementById("charRight").src = scenarioData.defaultRightCharacter;

  // ※ セリフの再生はユーザーのクリックで開始する（初回は待つ）
}

function playNextLine() {
  const scene = scenarioData.scenes[currentSceneIndex];
  if (!scene || !scene.lines || currentLineIndex >= scene.lines.length) {
    // シーン終了 → 次のシーンがあれば移動
    currentSceneIndex++;
    if (currentSceneIndex < scenarioData.scenes.length) {
      setupScene(currentSceneIndex);
    } else {
      alert("全シーン終了しました！");
    }
    return;
  }

  const lineData = scene.lines[currentLineIndex];
  currentLineIndex++;

  // セリフ表示
  const dialogueTextElem = document.getElementById("dialogueText");
  dialogueTextElem.textContent = lineData.serif || "";
  if (lineData.color) {
    dialogueTextElem.style.color = lineData.color;
  } else {
    if (lineData.character === "ずんだもん") {
      dialogueTextElem.style.color = "#00ff00";
    } else if (lineData.character === "四国めたん") {
      dialogueTextElem.style.color = "#ff00ff";
    } else {
      dialogueTextElem.style.color = "#ffffff";
    }
  }

  // キャラクター要素の取得（例: 四国めたん→左、ずんだもん→右）
  let charElement = null;
  if (lineData.character === "四国めたん") {
    charElement = document.getElementById("charLeft");
  } else {
    charElement = document.getElementById("charRight");
  }

  // 口パク用画像のリスト
  const images = lineData.images || [];
  let imgIndex = 0;

  // 前の口パクがあればクリア
  if (speakingInterval) {
    clearInterval(speakingInterval);
    speakingInterval = null;
  }

  // 口パクを開始（音声が再生中はこのアニメーションを継続）
  if (images.length > 0) {
    speakingInterval = setInterval(() => {
      charElement.src = images[imgIndex];
      imgIndex = (imgIndex + 1) % images.length;
    }, 100); // 0.1秒ごとに切り替え
  }

  // 音声再生
  if (audio) {
    audio.pause();
  }
  audio = new Audio(lineData.sound);
  audio.play();

  // 音声終了時の処理で口パクを止め、デフォルト画像に戻す
  audio.onended = () => {
    if (speakingInterval) {
      clearInterval(speakingInterval);
      speakingInterval = null;
    }
    resetToDefaultImages();
  };
}

function resetToDefaultImages() {
  const left = scenarioData.defaultLeftCharacter;
  const right = scenarioData.defaultRightCharacter;
  document.getElementById("charLeft").src = left;
  document.getElementById("charRight").src = right;
}
