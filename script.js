window.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d");
  let audioContext = null; // Web Audio APIのコンテキスト

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
      return;
    }

    const hash = createHash(text);
    const random = pseudoRandomGenerator(hash);

    // テキストに基づいて音を生成・再生
    generateAndPlaySound(text, random);
    // 図形を描画
    drawShape(text, hash, random);
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

  // 音を生成して再生する高レベル関数
  function generateAndPlaySound(text, random) {
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

  // 図形を描画するメイン関数
  function drawShape(text, hash, random) {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const len = text.length;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 色
    const hue = Math.abs(hash % 360);
    ctx.fillStyle = `hsl(${hue}, 75%, 55%)`;

    // サイズ (これは文字数に依存させる)
    const maxRadius = canvas.width / 2 - 30; // 少しマージンを増やす
    const baseRadius = Math.min(maxRadius, 30 + len * 10);

    // 辺の数 (3から12の間でランダムに)
    const sides = 3 + Math.floor(random.next().value * 10);
    // 凹凸の度合い (0: なし, ~0.8: 大きい)
    const irregularity = random.next().value * 0.8;
    // 全体の回転
    const rotation = random.next().value * 2 * Math.PI;

    ctx.beginPath();
    // 各頂点の座標を計算して線を描画
    for (let i = 0; i <= sides; i++) {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      // 各頂点の半径をランダムに変化させる
      const randomFactor = random.next().value; // 0-1
      const radiusVariation =
        baseRadius * irregularity * (randomFactor - 0.5) * 2; // -1 to 1
      const currentRadius = baseRadius + radiusVariation;
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
