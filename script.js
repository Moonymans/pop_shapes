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

  // 文字列から色を生成する関数
  function getColorFromText(text) {
    if (text.length === 0) return "#cccccc";

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      // シンプルなハッシュ関数
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    // HSL色空間を利用して見やすい色を生成
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 75%, 55%)`;
  }

  // 多角形を描画する関数
  function drawPolygon(x, y, radius, sides) {
    ctx.beginPath();
    // 開始点を計算 (頂点が上に来るように -PI/2 でオフセット)
    const startAngle = -Math.PI / 2;
    ctx.moveTo(
      x + radius * Math.cos(startAngle),
      y + radius * Math.sin(startAngle)
    );

    for (let i = 1; i <= sides; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / sides;
      ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
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

    // パラメータを計算
    const sides = len < 3 ? 100 : len; // 3未満は円（辺の多い多角形で近似）、それ以上は文字数の多角形
    const maxRadius = canvas.width / 2 - 20;
    const radius = Math.min(maxRadius, 20 + len * 8);
    const color = getColorFromText(text);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = color;

    // 形を描画
    if (len < 3) {
      // 円を描画
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // 多角形を描画
      drawPolygon(centerX, centerY, radius, sides);
    }
  }

  // ページ読み込み時に初期メッセージを表示
  drawInitialMessage();
});
