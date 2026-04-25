let shapes = [];
let song;
let amplitude;
// 定義基礎的多邊形頂點座標
let points = [[-3, 5], [3, 7], [1, 5],[2,4],[4,3],[5,2],[6,2],[8,4],[8,-1],[6,0],[0,-3],[2,-6],[-2,-3],[-4,-2],[-5,-1],[-6,1],[-6,2]];

// 新增水泡泡相關變數
let bubbles = [];
const numBubbles = 20; // 泡泡的數量
const burstThresholdY = 100; // 泡泡破裂的 Y 座標閾值


function preload() {
  // 預載入音檔
  song = loadSound('midnight-quirk-255361.mp3', 
    () => console.log("音樂載入成功！"),
    (err) => console.error("音樂載入失敗，請檢查路徑或檔案是否存在。", err)
  );
}

function setup() {
  // 建立符合視窗大小的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 初始化音量解析物件
  amplitude = new p5.Amplitude();
  
  // 檢查音樂是否成功載入後再播放，避免程式崩潰
  if (song && song.isLoaded()) {
    song.loop();
  } else {
    console.warn("由於音樂檔案載入失敗，setup 中的 song.loop() 已跳過。");
    console.log("請確保 'midnight-quirk-255361.mp3' 與 index.html 放在同一個資料夾。");
  }

  // 初始化水泡泡
  for (let i = 0; i < numBubbles; i++) {
    let r = random(10, 40);
    let x = random(width);
    // 讓泡泡從畫面下方或更下方開始生成
    let y = random(height, height * 2);
    bubbles.push(new Bubble(this, x, y, r, random(0.5, 3)));
  }

  // 產生 10 個隨機的多邊形物件
  for (let i = 0; i < 10; i++) {
    // 隨機生成 10 到 30 之間的倍率來縮放初始頂點座標
    let rMult = random(10, 30);
    let transformedPoints = points.map(p => [p[0] * rMult, p[1] * rMult]);

    let shapeObj = {
      x: random(0, windowWidth),
      y: random(0, windowHeight),
      dx: random(-3, 3),
      dy: random(-3, 3),
      scale: random(1, 10),
      color: color(random(255), random(255), random(255)),
      points: transformedPoints,
      flipY: random([-1, 1]) // 隨機決定每個元件初始是否上下翻轉 (1 為正常, -1 為翻轉)
    };
    shapes.push(shapeObj);
  }
}

function draw() {
  background('#ffcdb2');

  // 檢查音樂是否載入成功，若失敗或載入中則顯示提示
  if (!song || !song.isLoaded()) {
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text("音樂載入中或檔案遺失 (404)...", width / 2, height / 2);
    return; // 停止執行後續的繪圖邏輯
  }

  strokeWeight(2);

  // 取得當前音量 (0.0 到 1.0)
  let level = amplitude.getLevel();
  // 將音量映射到縮放倍率 (0.5 到 2.0)
  let sizeFactor = map(level, 0, 1, 0.5, 2);

  // 更新與繪製水泡泡
  for (let bubble of bubbles) {
    bubble.move();
    bubble.checkBurst(burstThresholdY);
    bubble.display();
  }
  // 更新與繪製每個形狀
  for (let shape of shapes) {
    // 位置更新
    shape.x += shape.dx;
    shape.y += shape.dy;

    // 邊緣反彈檢查
    if (shape.x < 0 || shape.x > windowWidth) {
      shape.dx *= -1;
    }
    if (shape.y < 0 || shape.y > windowHeight) {
      shape.dy *= -1;
    }

    // 設定外觀顏色
    fill(shape.color);
    stroke(shape.color);

    push();
    translate(shape.x, shape.y);

    // 根據移動方向改變水平方向：往右移動時左右顛倒 (dx > 0)
    // 並結合該元件專屬的上下翻轉狀態 (flipY)
    let hScale = shape.dx > 0 ? -sizeFactor : sizeFactor;
    let vScale = sizeFactor * shape.flipY;
    scale(hScale, vScale);
    
    // 繪製多邊形
    beginShape();
    for (let p of shape.points) {
      vertex(p[0], p[1]);
    }
    endShape(CLOSE);
    pop();
  }

  // 如果音樂沒在播放，提醒使用者點擊
  if (!song.isPlaying()) {
    fill(0, 150);
    noStroke();
    textSize(16);
    text("點擊畫面開始播放音樂", width / 2, height - 30);
  }
}

// 瀏覽器通常要求使用者與頁面互動後才能播放音訊
function mousePressed() {
  // 明確啟動音訊環境
  userStartAudio();
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.play();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 定義 Bubble 類別
class Bubble {
  constructor(p, x, y, r, speed) {
    this.p = p; // 儲存 p5 實例，以便在類別方法中使用 p5 函式
    this.x = x;
    this.y = y;
    this.r = r;
    this.speed = speed;
    this.color = p.color(200, 200, 255, 150); // 淺藍色，帶有透明度
    this.bursting = false; // 是否正在破裂
    this.burstFrame = 0; // 破裂動畫的當前幀數
    this.maxBurstFrame = 30; // 破裂動畫的總幀數
  }

  move() {
    if (!this.bursting) {
      this.y -= this.speed;
      // 如果泡泡移出畫面頂部，則重置其位置
      if (this.y < -this.r) {
        this.reset();
      }
    }
  }

  reset() {
    this.x = this.p.random(this.p.width);
    this.y = this.p.height + this.r; // 從畫面底部重新開始
    this.r = this.p.random(10, 40);
    this.speed = this.p.random(0.5, 3);
    this.bursting = false;
    this.burstFrame = 0;
  }

  display() {
    this.p.noStroke();
    if (this.bursting) {
      let alpha = this.p.map(this.burstFrame, 0, this.maxBurstFrame, 150, 0); // 破裂時逐漸透明
      let currentR = this.p.map(this.burstFrame, 0, this.maxBurstFrame, this.r, this.r * 2); // 破裂時逐漸變大
      this.p.fill(200, 200, 255, alpha);
      this.p.ellipse(this.x, this.y, currentR * 2);
      this.burstFrame++;
      if (this.burstFrame > this.maxBurstFrame) {
        this.reset(); // 動畫結束後重置泡泡
      }
    } else {
      this.p.fill(this.color);
      this.p.ellipse(this.x, this.y, this.r * 2);
    }
  }

  checkBurst(burstY) {
    // 當泡泡到達指定高度時觸發破裂效果
    if (!this.bursting && this.y <= burstY) {
      this.bursting = true;
    }
  }
}
