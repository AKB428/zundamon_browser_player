let scenarioData = null;
let currentSceneIndex = 0;
let currentLineIndex = 0;
let audio = null; // セリフ再生用
let bgmAudio = null; // BGM 再生用
let speakingInterval = null; // 口パク切り替え用タイマー
let currentBackground = null;

window.addEventListener("load", () => {
  fetch("scenario.json")
    .then(res => res.json())
    .then(data => {
      scenarioData = data;
      // BGM 指定があれば再生
      if (scenarioData.bgm && scenarioData.bgm.file) {
        playBgm();
      }
      setupScene(0); // 最初のシーンをセット
    });

  const dialogueBox = document.getElementById("dialogueBox");
  dialogueBox.addEventListener("click", () => {
    playNextLine();
  });
});

function playBgm() {
  bgmAudio = new Audio(scenarioData.bgm.file);
  bgmAudio.loop = true;
  // JSON で指定された音量（0～1）を適用。なければデフォルト 0.5
  bgmAudio.volume = scenarioData.bgm.volume !== undefined ? scenarioData.bgm.volume : 0.5;
  bgmAudio.play().catch(err => {
    console.log("BGM再生エラー:", err);
  });
}

function setupScene(sceneIndex) {
  currentSceneIndex = sceneIndex;
  currentLineIndex = 0;
  const scene = scenarioData.scenes[sceneIndex];

  // 背景設定: setBackground があれば更新、同じ場合は変更なし
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
  // ※ セリフ再生はユーザークリックで行うのでここでは開始しない
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

  // セリフ表示
  const dialogueTextElem = document.getElementById("dialogueText");
  dialogueTextElem.textContent = lineData.serif || "";
  if (lineData.color) {
    dialogueTextElem.style.color = lineData.color;
  } else {
    // デフォルト（キャラクターに応じた）
    if (lineData.character === "ずんだもん") {
      dialogueTextElem.style.color = "#00ff00";
    } else if (lineData.character === "四国めたん") {
      dialogueTextElem.style.color = "#ff00ff";
    } else {
      dialogueTextElem.style.color = "#ffffff";
    }
  }

  // キャラクター要素取得（例: 四国めたんは左、ずんだもんは右）
  let charElement = null;
  if (lineData.character === "四国めたん") {
    charElement = document.getElementById("charLeft");
  } else {
    charElement = document.getElementById("charRight");
  }

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
