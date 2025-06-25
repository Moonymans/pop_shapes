window.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d");
  const body = document.body;
  const h1 = document.querySelector("h1");
  let audioContext = null; // Web Audio APIのコンテキスト

  // アニメーション関連のグローバル変数
  let currentShapeProps = {
    hue: 0,
    baseRadius: 0,
    sides: 0,
    irregularity: 0,
    rotation: 0,
    vertexRandomFactors: [],
  };
  let targetShapeProps = { ...currentShapeProps };
  let animationStartTime = 0;
  const animationDuration = 500; // アニメーションの持続時間 (ms)
  let animationFrameId = null;

  // キャンバスのサイズを設定
  const canvasSize = Math.min(window.innerWidth * 0.9, 700);
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  // テキスト入力イベントを監視
  textInput.addEventListener("input", (e) => {
    // 最初の入力でAudioContextを初期化（ブラウザの自動再生ポリシー対策）
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const text = e.target.value;

    if (text.length === 0) {
      drawInitialMessage();
      resetUIColors();
      // アニメーションを停止し、プロパティをリセット
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      currentShapeProps = {
        hue: 0,
        baseRadius: 0,
        sides: 0,
        irregularity: 0,
        rotation: 0,
        vertexRandomFactors: [],
      };
      targetShapeProps = { ...currentShapeProps };
      return;
    }

    const hash = createHash(text);
    const randomForShapeProps = pseudoRandomGenerator(hash); // 図形の主要プロパティ用

    // テキストに基づいて音を生成・再生
    generateAndPlaySound(text, hash);
    // UIの色を更新
    updateUIColors(hash);
    // 図形を描画

    // 新しいターゲットプロパティを計算
    const len = text.length;
    const maxRadius = canvas.width / 2 - 30;
    const newBaseRadius = Math.min(maxRadius, 30 + len * 10);
    const newSides = 3 + Math.floor(randomForShapeProps.next().value * 10);
    const newIrregularity = randomForShapeProps.next().value * 0.8;
    const newRotation = randomForShapeProps.next().value * 2 * Math.PI;
    const newHue = Math.abs(hash % 360);

    // 各頂点のランダム係数を事前に計算 (同じハッシュから生成されるが、別のシードで)
    const newVertexRandomFactors = [];
    const vertexRandomGen = pseudoRandomGenerator(hash + 1); // 頂点用は別のシード
    for (let i = 0; i <= newSides; i++) {
      newVertexRandomFactors.push(vertexRandomGen.next().value);
    }

    targetShapeProps = {
      hue: newHue,
      baseRadius: newBaseRadius,
      sides: newSides,
      irregularity: newIrregularity,
      rotation: newRotation,
      vertexRandomFactors: newVertexRandomFactors,
    };

    // 初回描画時、または空の状態から入力された場合は、現在値をターゲット値に設定してアニメーションをスキップ
    if (currentShapeProps.sides === 0 && text.length > 0) {
      currentShapeProps = { ...targetShapeProps };
    }

    // アニメーションを開始
    animationStartTime = performance.now();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(animateShape);
  });

  // 初期状態の描画（プロンプトメッセージ）
  function drawInitialMessage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "center";
    ctx.fillText(
      "テキストボックスに何か入力してください",
      canvas.width / 2,
      canvas.height / 2
    );
  }

  // 文字列から決定論的なハッシュ値を生成する
  function createHash(text) {
    let hash = 0;
    if (text.length === 0) return hash;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // 32ビット整数に変換
    }
    return hash;
  }

  // 決定論的な「乱数」ジェネレータ
  // 同じシードからは常に同じ数列を生成する
  function* pseudoRandomGenerator(seed) {
    let state = seed % 2147483647;
    if (state <= 0) {
      state += 2147483646;
    }

    while (true) {
      state = (state * 16807) % 2147483647;
      yield state / 2147483647; // 0と1の間の値を返す
    }
  }

  // 線形補間関数 (Linear Interpolation)
  function lerp(start, end, t) {
    return start * (1 - t) + end * t;
  }

  // 図形のアニメーションループ
  function animateShape(currentTime) {
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(1, elapsed / animationDuration); // 0から1へ進行

    // 各プロパティを補間
    currentShapeProps.hue = lerp(
      currentShapeProps.hue,
      targetShapeProps.hue,
      progress
    );
    currentShapeProps.baseRadius = lerp(
      currentShapeProps.baseRadius,
      targetShapeProps.baseRadius,
      progress
    );
    currentShapeProps.irregularity = lerp(
      currentShapeProps.irregularity,
      targetShapeProps.irregularity,
      progress
    );

    // 回転は最短経路で補間
    let startRotation = currentShapeProps.rotation;
    let endRotation = targetShapeProps.rotation;
    let diff = endRotation - startRotation;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    currentShapeProps.rotation = startRotation + diff * progress;

    currentShapeProps.sides = targetShapeProps.sides; // 辺の数はアニメーションせず即時変更
    currentShapeProps.vertexRandomFactors =
      targetShapeProps.vertexRandomFactors; // 頂点係数も即時変更

    drawShape(currentShapeProps); // 補間されたプロパティで描画

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animateShape);
    } else {
      // アニメーション終了時、プロパティを正確にターゲット値に設定
      currentShapeProps = { ...targetShapeProps };
      animationFrameId = null;
    }
  }

  // UIの色を更新する関数
  function updateUIColors(hash) {
    const hue = Math.abs(hash % 360);
    // 背景色 (明るく、彩度低め)
    body.style.backgroundColor = `hsl(${hue}, 25%, 95%)`;
    // 基本テキスト色 (暗く、彩度低め)
    body.style.color = `hsl(${hue}, 15%, 30%)`;
    // 見出し色 (はっきりと)
    h1.style.color = `hsl(${hue}, 60%, 40%)`;
    // 入力欄のボーダー色も合わせる
    textInput.style.borderColor = `hsl(${hue}, 60%, 40%)`;
  }

  // UIの色をデフォルトに戻す関数
  function resetUIColors() {
    body.style.backgroundColor = "";
    body.style.color = "";
    h1.style.color = "";
    textInput.style.borderColor = "";
  }

  // 音を生成して再生する高レベル関数
  function generateAndPlaySound(text, hash) {
    const random = pseudoRandomGenerator(hash);
    const lastCharCode = text.charCodeAt(text.length - 1);
    const frequency = 200 + (lastCharCode % 600);

    const waveforms = ["sine", "square", "sawtooth", "triangle"];
    const type = waveforms[Math.floor(random.next().value * waveforms.length)];

    // 音の長さをランダムに
    const decay = 0.1 + random.next().value * 0.3; // 0.1秒から0.4秒の間

    playSound({ frequency, type, decay });
  }

  // 指定されたパラメータで音を再生する低レベル関数
  function playSound({ frequency, type = "sine", decay = 0.2 }) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 音のプロパティを設定
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // 音量を小さめに設定し、指定された時間でフェードアウトさせる
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + decay
    );

    // 音の再生を開始・停止
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + decay);
  }

  // 図形を描画する関数 (アニメーションループから呼ばれる)
  function drawShape(props) {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // テキスト入力が空の場合は初期メッセージを表示
    if (textInput.value.length === 0) {
      drawInitialMessage();
      return;
    }

    // プロパティが初期状態（sides=0）の場合は描画しない
    if (props.sides === 0) {
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = `hsl(${props.hue}, 75%, 55%)`;

    ctx.beginPath();
    for (let i = 0; i <= props.sides; i++) {
      const angle = props.rotation + (i * 2 * Math.PI) / props.sides;
      const randomFactor =
        props.vertexRandomFactors[i % props.vertexRandomFactors.length]; // 頂点係数を適用
      const radiusVariation =
        props.baseRadius * props.irregularity * (randomFactor - 0.5) * 2;
      const currentRadius = props.baseRadius + radiusVariation;
      const x = centerX + currentRadius * Math.cos(angle);
      const y = centerY + currentRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ページ読み込み時に初期メッセージを表示
  drawInitialMessage();
});
