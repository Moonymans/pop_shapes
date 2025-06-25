window.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d");
  const canvasContainer = document.querySelector(".canvas-container");
  const body = document.body;
  const h1 = document.querySelector("h1");
  let audioContext = null; // Web Audio APIのコンテキスト

  // ドレミファソラシドの周波数 (Cメジャースケール)
  const scaleFrequencies = [
    261.63, // C4 (ド)
    293.66, // D4 (レ)
    329.63, // E4 (ミ)
    349.23, // F4 (ファ)
    392.0, // G4 (ソ)
    440.0, // A4 (ラ)
    493.88, // B4 (シ)
    523.25, // C5 (高いド)
  ];

  // アニメーション関連のグローバル変数
  let shapes = []; // 表示されているすべての図形を管理する配列
  let animationFrameId = null;

  // キャンバスのサイズを動的に設定・リサイズする関数
  function resizeCanvas() {
    // コンテナのサイズから最適なキャンバスサイズを計算 (少し余白を持たせる)
    const padding = 20;
    const size =
      Math.min(canvasContainer.clientWidth, canvasContainer.clientHeight) -
      padding;

    if (size > 0) {
      canvas.width = size;
      canvas.height = size;
    }
    // リサイズ時に図形を再生成または初期メッセージを再描画
    const text = textInput.value;
    const targetCount = text.length;
    if (targetCount === 0) {
      drawInitialMessage();
      return;
    }
    shapes = []; // 既存の図形をクリア
    while (shapes.length < targetCount) {
      const newShape = createShape(text, shapes.length);
      newShape.age = newShape.lifespan; // アニメーションなしで即時表示
      // Place at final position for resize
      newShape.x = newShape.targetX;
      newShape.y = newShape.targetY;
      newShape.radius = newShape.finalRadius;
      shapes.push(newShape);
    }
    if (!animationFrameId) {
      animate();
    }
  }

  // テキスト入力イベントを監視
  textInput.addEventListener("input", (e) => {
    // 最初の入力でAudioContextを初期化（ブラウザの自動再生ポリシー対策）
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const text = e.target.value;

    if (text.length === 0) {
      shapes = []; // すべての図形をクリア
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawInitialMessage();
      resetUIColors();
      return;
    }

    const targetCount = text.length;

    // 不要になった図形を配列の後ろから削除
    if (shapes.length > targetCount) {
      shapes.splice(targetCount);
    }

    // 新しい図形を追加
    while (shapes.length < targetCount) {
      const newShape = createShape(text, shapes.length);
      shapes.push(newShape);
    }

    // UIの色や音はテキスト全体から生成
    const hash = createHash(text);
    generateAndPlaySound(text, hash);
    updateUIColors(hash);

    // アニメーションを開始
    if (animationFrameId) {
      return; // すでに実行中なら何もしない
    }
    animate();
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

  // 新しい図形オブジェクトを生成する関数
  function createShape(text, index) {
    const hash = createHash(text.substring(0, index + 1)); // 各図形はそこまでのテキストで決まる
    const random = pseudoRandomGenerator(hash);

    // 図形の最終的な半径
    const finalRadius = 15 + random.next().value * (15 + text.length * 1.2);

    // 分裂元（前の図形）の位置を取得。なければ中央から。
    const spawnFrom = shapes[index - 1] || {
      x: canvas.width / 2,
      y: canvas.height / 2,
    };
    // 図形の初期ターゲット位置
    const targetX = (random.next().value * 0.8 + 0.1) * canvas.width;
    const targetY = (random.next().value * 0.8 + 0.1) * canvas.height;

    const sides = 3 + Math.floor(random.next().value * 7);
    const irregularity = random.next().value * 0.7;
    const rotation = random.next().value * 2 * Math.PI;
    const hue = hash % 360;

    const vertexRandomFactors = [];
    for (let i = 0; i <= sides; i++) {
      vertexRandomFactors.push(random.next().value);
    }

    return {
      // 静的プロパティ
      sides,
      irregularity,
      rotation,
      hue,
      vertexRandomFactors,
      finalRadius,
      // 現在の状態
      x: spawnFrom.x,
      y: spawnFrom.y,
      radius: 0,
      // 移動用の速度
      vx: (random.next().value - 0.5) * 2,
      vy: (random.next().value - 0.5) * 2,
      // アニメーション用プロパティ
      spawnX: spawnFrom.x,
      spawnY: spawnFrom.y,
      targetX: targetX,
      targetY: targetY,
      age: 0,
      lifespan: 60, // アニメーションのフレーム数
    };
  }

  // メインのアニメーションループ
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach((shape) => {
      // フェーズ1: スポーンアニメーション
      if (shape.age < shape.lifespan) {
        shape.age++;
        const progress = shape.age / shape.lifespan;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        shape.x = lerp(shape.spawnX, shape.targetX, easedProgress);
        shape.y = lerp(shape.spawnY, shape.targetY, easedProgress);
        shape.radius = shape.finalRadius * easedProgress;
      } else {
        // フェーズ2: 跳ね返り
        shape.x += shape.vx;
        shape.y += shape.vy;

        // 画面端での衝突判定
        if (shape.x - shape.radius < 0) {
          shape.vx *= -1;
          shape.x = shape.radius;
        } else if (shape.x + shape.radius > canvas.width) {
          shape.vx *= -1;
          shape.x = canvas.width - shape.radius;
        }
        if (shape.y - shape.radius < 0) {
          shape.vy *= -1;
          shape.y = shape.radius;
        } else if (shape.y + shape.radius > canvas.height) {
          shape.vy *= -1;
          shape.y = canvas.height - shape.radius;
        }
      }
      drawPolygon(shape);
    });

    if (shapes.length > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
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
    if (h1) {
      h1.style.color = `hsl(${hue}, 60%, 40%)`;
    }
    // 入力欄のボーダー色も合わせる
    textInput.style.borderColor = `hsl(${hue}, 60%, 40%)`;
  }

  // UIの色をデフォルトに戻す関数
  function resetUIColors() {
    body.style.backgroundColor = "";
    body.style.color = "";
    if (h1) {
      h1.style.color = "";
    }
    textInput.style.borderColor = "";
  }

  // 音を生成して再生する高レベル関数
  function generateAndPlaySound(text, hash) {
    const random = pseudoRandomGenerator(hash);
    const lastCharCode = text.charCodeAt(text.length - 1);
    // 文字コードをスケールのインデックスにマッピング
    const noteIndex = lastCharCode % scaleFrequencies.length;
    const frequency = scaleFrequencies[noteIndex];
    const waveforms = ["sine", "square", "sawtooth", "triangle"];
    const type = waveforms[Math.floor(random.next().value * waveforms.length)];

    // 音の長さをランダムに
    const decay = 0.3 + random.next().value * 0.5; // 0.3秒から0.8秒の間

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

  // 個々の多角形を描画する関数
  function drawPolygon(shape) {
    if (shape.radius < 1) return;

    const currentX = shape.x;
    const currentY = shape.y;
    const currentRadius = shape.radius;

    ctx.fillStyle = `hsla(${shape.hue}, 75%, 60%, 0.8)`;
    ctx.strokeStyle = `hsl(${shape.hue}, 75%, 40%)`;
    ctx.lineWidth = 1 + shape.radius / shape.finalRadius;

    ctx.beginPath();
    for (let i = 0; i <= shape.sides; i++) {
      const angle = shape.rotation + (i * 2 * Math.PI) / shape.sides;
      const randomFactor =
        shape.vertexRandomFactors[i % shape.vertexRandomFactors.length];
      const radiusVariation =
        currentRadius * shape.irregularity * (randomFactor - 0.5) * 2;
      const r = currentRadius + radiusVariation;
      const x = currentX + r * Math.cos(angle);
      const y = currentY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ウィンドウリサイズ時にもキャンバスサイズを調整
  window.addEventListener("resize", resizeCanvas);
  // 初回読み込み時にキャンバスサイズを計算して設定
  resizeCanvas();
});
