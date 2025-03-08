let scenarioData = null;
let currentSceneIndex = 0;
let currentLineIndex = 0;
let audio = null; // セリフ再生用
let bgmAudio = null; // BGM再生用
let speakingInterval = null; // 口パク切り替え用タイマー
let currentBackground = null;
let bgmStarted = false; // BGM再生開始済みかどうかのフラグ

window.addEventListener("load", () => {
  fetch("scenario.json")
    .then(res => res.json())
    .then(data => {
      scenarioData = data;
      // ページロード時は背景やキャラクターだけ設定
      setupScene(0);
    });

  // セリフボックスのクリックで、最初のクリックでBGMを開始、以降はセリフ進行
  const dialogueBox = document.getElementById("dialogueBox");
  dialogueBox.addEventListener("click", () => {
    if (!bgmStarted && scenarioData.bgm && scenarioData.bgm.file) {
      startBgm();
      bgmStarted = true;
    }
    playNextLine();
  });
});

function startBgm() {
  bgmAudio = new Audio(scenarioData.bgm.file);
  bgmAudio.loop = true;
  bgmAudio.volume = scenarioData.bgm.volume !== undefined ? scenarioData.bgm.volume : 0.5;
  bgmAudio.play().catch(err => {
    console.log("BGM再生エラー:", err);
  });
}

function setupScene(sceneIndex) {
  currentSceneIndex = sceneIndex;
  currentLineIndex = 0;
  const scene = scenarioData.scenes[sceneIndex];

  // 背景設定（setBackgroundがあれば更新、なければdefaultBackground）
  let bgFile = "";
  if (scene.setBackground) {
    bgFile = scenarioData.backgrounds[scene.setBackground];
  } else {
    bgFile = scenarioData.defaultBackground || scenarioData.backgrounds["1"];
  }
  if (bgFile !== currentBackground) {
    document.getElementById("stage").style.backgroundImage = `url(${bgFile})`;
    currentBackground = bgFile;
  }
  
  // デフォルト画像をセット
  document.getElementById("charLeft").src = scenarioData.defaultLeftCharacter;
  document.getElementById("charRight").src = scenarioData.defaultRightCharacter;
  // 最初のセリフ再生はクリック待ち
}

function playNextLine() {
  const scene = scenarioData.scenes[currentSceneIndex];
  if (!scene || !scene.lines || currentLineIndex >= scene.lines.length) {
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

  // キャラクター要素を取得（例: 四国めたん→左、ずんだもん→右）
  let charElement = (lineData.character === "四国めたん") ?
      document.getElementById("charLeft") :
      document.getElementById("charRight");

  const images = lineData.images || [];
  let imgIndex = 0;
  if (speakingInterval) {
    clearInterval(speakingInterval);
    speakingInterval = null;
  }
  if (images.length > 0) {
    speakingInterval = setInterval(() => {
      charElement.src = images[imgIndex];
      imgIndex = (imgIndex + 1) % images.length;
    }, 100);
  }

  if (audio) {
    audio.pause();
  }
  audio = new Audio(lineData.sound);
  audio.play();
  audio.onended = () => {
    if (speakingInterval) {
      clearInterval(speakingInterval);
      speakingInterval = null;
    }
    resetToDefaultImages();
  };
}

function resetToDefaultImages() {
  document.getElementById("charLeft").src = scenarioData.defaultLeftCharacter;
  document.getElementById("charRight").src = scenarioData.defaultRightCharacter;
}
