window.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d");

  // キャンバスのサイズを設定
  const canvasSize = Math.min(window.innerWidth * 0.9, 700);
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  // テキスト入力イベントを監視
  textInput.addEventListener("input", (e) => {
    drawShape(e.target.value);
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

  // 図形を描画するメイン関数
  function drawShape(text) {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const len = text.length;

    if (len === 0) {
      drawInitialMessage();
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // テキストからプロパティを生成
    const hash = createHash(text);
    const random = pseudoRandomGenerator(hash);

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
