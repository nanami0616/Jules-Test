// script.js

// DOM要素の取得
const gameBoard = document.getElementById('game-board'); // ゲーム盤のCanvas要素
const context = gameBoard.getContext('2d'); // ゲーム盤の2D描画コンテキスト
const scoreElement = document.getElementById('score'); // スコア表示用P要素
const nextBlockCanvas = document.getElementById('next-block'); // 次のブロック表示用Canvas要素
const nextBlockContext = nextBlockCanvas.getContext('2d'); // 次のブロック表示用2D描画コンテキスト

// --- ゲーム設定 ---
const BLOCK_SIZE = 30; // 1ブロックのサイズ (ピクセル単位)
const BOARD_WIDTH = 10;  // ボードの幅 (ブロック数単位)
const BOARD_HEIGHT = 20; // ボードの高さ (ブロック数単位)

// ゲームボードの描画サイズ設定 (ピクセル単位)
gameBoard.width = BLOCK_SIZE * BOARD_WIDTH;
gameBoard.height = BLOCK_SIZE * BOARD_HEIGHT;

// 次のブロック表示エリアの描画サイズ設定 (ピクセル単位)
// 4x4のグリッドで表示することを想定
nextBlockCanvas.width = BLOCK_SIZE * 4;
nextBlockCanvas.height = BLOCK_SIZE * 4;

// --- テトリミノデータ ---
// 各テトリミノの形状 (2次元配列) と色を定義
const TETROMINOS = {
    'I': { shape: [[1, 1, 1, 1]], color: 'cyan' },    // I字型
    'L': { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' }, // L字型
    'J': { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },   // J字型 (L字の左右反転)
    'S': { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },  // S字型
    'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },    // Z字型 (S字の左右反転)
    'T': { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' }, // T字型
    'O': { shape: [[1, 1], [1, 1]], color: 'yellow' }  // O字型 (正方形)
};

// --- ゲーム状態変数 ---
// ゲームボードの状態を保持する2次元配列
// board[y][x] の形式でアクセス
// 0: 空のセル
// 1以上の値: 固定されたブロック (現在は色分けに直接使用せず、存在のみを示す。描画時にTETROMINOSから色を決定)
let board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));

let currentTetromino = null; // 現在操作中のテトリミノオブジェクト {shape, color}
let currentX = 0; // 現在のテトリミノのX座標 (ボード左上基点、ブロック単位)
let currentY = 0; // 現在のテトリミノのY座標 (ボード左上基点、ブロック単位)

let nextTetromino = null; // 次に出現するテトリミノオブジェクト {shape, color}
let score = 0; // 現在のスコア
let gameLoopTimerId = null; // ゲームループのインターバルID (clearIntervalで使用)

// --- 描画関連関数 ---

/**
 * 指定されたテトリミノを指定されたコンテキストに描画する。
 * @param {Array<Array<number>>} tetrominoShape 描画するテトリミノの形状配列。
 * @param {number} x 描画開始位置のX座標 (ブロック単位)。
 * @param {number} y 描画開始位置のY座標 (ブロック単位)。
 * @param {string} color テトリミノの色。
 * @param {CanvasRenderingContext2D} ctx 描画対象の2Dコンテキスト。
 */
function drawTetromino(tetrominoShape, x, y, color, ctx) {
    ctx.fillStyle = color; // 塗りつぶしの色を設定
    tetrominoShape.forEach((row, rIndex) => { // テトリミノの各行を処理
        row.forEach((cell, cIndex) => { // 行内の各セルを処理
            if (cell) { // セルが1 (ブロックあり) の場合
                // ブロックを描画
                ctx.fillRect(
                    (x + cIndex) * BLOCK_SIZE, // X座標 (ピクセル単位)
                    (y + rIndex) * BLOCK_SIZE, // Y座標 (ピクセル単位)
                    BLOCK_SIZE,                // 幅 (ピクセル単位)
                    BLOCK_SIZE                 // 高さ (ピクセル単位)
                );
                // ブロックの枠線を描画 (視認性向上のため)
                ctx.strokeStyle = '#333'; // 枠線の色
                ctx.strokeRect(
                    (x + cIndex) * BLOCK_SIZE,
                    (y + rIndex) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

/**
 * ゲームボード全体（固定されたブロックと現在のテトリミノ）を描画する。
 */
function drawBoard() {
    // ボード全体をクリア
    context.clearRect(0, 0, gameBoard.width, gameBoard.height);

    // 固定されたブロックを描画
    board.forEach((row, rIndex) => {
        row.forEach((cellValue, cIndex) => {
            if (cellValue) { // セルにブロックが存在する場合 (0以外)
                // 固定されたブロックの色を決定 (TETROMINOSオブジェクトから探す、見つからなければデフォルト色)
                // 注意: 現在の実装ではcellValueにテトリミノの種類を保存していないため、この色決定は不正確になる可能性がある。
                //       より正確にするには、fixTetrominoでテトリミノの種類や色情報をboardに保存する必要がある。
                //       現状は、TETROMINOSのshape定義に存在する値であればその色を、なければ灰色(#ccc)を使用。
                const fixedBlockColor = Object.values(TETROMINOS).find(t => t.shape.flat().includes(cellValue))?.color || '#ccc';
                context.fillStyle = fixedBlockColor;
                context.fillRect(cIndex * BLOCK_SIZE, rIndex * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#333';
                context.strokeRect(cIndex * BLOCK_SIZE, rIndex * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });

    // 現在操作中のテトリミノを描画 (存在する場合)
    if (currentTetromino) {
        drawTetromino(currentTetromino.shape, currentX, currentY, currentTetromino.color, context);
    }
}

/**
 * 「次のブロック」表示エリアに次のテトリミノを描画する。
 */
function drawNextBlock() {
    // 次のブロック表示エリアをクリア
    nextBlockContext.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
    if (nextTetromino) {
        // テトリミノをエリア中央に描画するためのオフセット計算
        // (4x4のエリアを想定し、テトリミノの幅/高さに応じて調整)
        const shapeWidth = nextTetromino.shape[0].length;
        const shapeHeight = nextTetromino.shape.length;
        const offsetX = (4 - shapeWidth) / 2;
        const offsetY = (4 - shapeHeight) / 2;
        drawTetromino(nextTetromino.shape, offsetX, offsetY, nextTetromino.color, nextBlockContext);
    }
}

// --- テトリミノ制御関数 ---

/**
 * 定義されたテトリミノの中からランダムに1つを選んで返す。
 * @return {object} ランダムに選ばれたテトリミノオブジェクト {shape, color}。
 */
function getRandomTetromino() {
    const keys = Object.keys(TETROMINOS); // TETROMINOSオブジェクトのキーの配列を取得
    const randomKey = keys[Math.floor(Math.random() * keys.length)]; // ランダムなキーを選択
    return { ...TETROMINOS[randomKey] }; // 選択されたテトリミノのコピーを返す (元のオブジェクトを変更しないため)
}

/**
 * 新しいテトリミノを生成し、ボードの上部中央に配置する。
 * 次のテトリミノも更新する。
 * @return {boolean} テトリミノの配置に成功した場合はtrue、ゲームオーバー状態などで失敗した場合はfalse。
 */
function spawnNewTetromino() {
    // 次のテトリミノがない場合 (ゲーム開始時など) は新規生成
    if (!nextTetromino) {
        nextTetromino = getRandomTetromino();
    }
    currentTetromino = nextTetromino; // 現在のテトリミノを更新
    nextTetromino = getRandomTetromino(); // 次のテトリミノを新たに生成
    drawNextBlock(); // 「次のブロック」表示を更新

    // テトリミノの初期位置をボード上部中央に設定
    currentX = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentTetromino.shape[0].length / 2);
    currentY = 0;

    // 出現位置で既に衝突している場合はゲームオーバー
    if (checkCollision(currentX, currentY, currentTetromino.shape)) {
        gameOver();
        return false; // 配置失敗
    }
    return true; // 配置成功
}

/**
 * 指定された位置(x, y)に指定された形状(shape)のテトリミノが衝突するかどうかを判定する。
 * 衝突条件: ボードの壁外、または他の固定されたブロックと重なる場合。
 * @param {number} x 判定するX座標 (ブロック単位)。
 * @param {number} y 判定するY座標 (ブロック単位)。
 * @param {Array<Array<number>>} shape 判定するテトリミノの形状配列。
 * @return {boolean} 衝突する場合はtrue、しない場合はfalse。
 */
function checkCollision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) { // テトリミノ形状の各行
        for (let c = 0; c < shape[r].length; c++) { // 行内の各セル
            if (shape[r][c]) { // セルがブロックの一部である場合
                const newX = x + c; // ボード上でのX座標
                const newY = y + r; // ボード上でのY座標

                // 1. 壁との衝突判定
                if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                    return true; // 衝突あり
                }
                // 2. 他の固定されたブロックとの衝突判定
                //    - newY >= 0 は、ボードの上端より上はチェックしない (出現時の判定のため)
                //    - board[newY] が存在し (行が存在し)、board[newY][newX] が0でない (ブロックあり)
                if (newY >= 0 && board[newY] && board[newY][newX] !== 0) {
                    return true; // 衝突あり
                }
            }
        }
    }
    return false; // 衝突なし
}

/**
 * 現在操作中のテトリミノをゲームボードに固定する。
 * 固定する際、board配列にはテトリミノの形状の最初の非ゼロ値を記録する (暫定的な識別子として)。
 */
function fixTetromino() {
    if (!currentTetromino) return; // currentTetromino がなければ何もしない

    currentTetromino.shape.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
            if (cell) {
                // ボード上の対応する位置に値を設定してブロックを「固定」
                // cell の値 (通常は1) をそのまま使うか、テトリミノの種類を示すIDを使うかは設計による。
                // ここでは、shape内の最初の非ゼロ値を簡易的な識別子として使用。
                // (より良いのは、TETROMINOSのキーやインデックス、または色情報と関連付けたID)
                board[currentY + rIndex][currentX + cIndex] = currentTetromino.shape.flat().find(val => val !== 0) || 1;
            }
        });
    });
}

/**
 * 現在のテトリミノを1段下に移動させる。移動できない場合は固定処理を行う。
 * ゲームオーバーになった場合は処理を中断する。
 */
function moveDown() {
    if (!currentTetromino) return; // 操作中のブロックがなければ何もしない

    // 1段下で衝突しないかチェック
    if (!checkCollision(currentX, currentY + 1, currentTetromino.shape)) {
        currentY++; // 衝突しなければY座標を増やして下に移動
    } else {
        // 衝突する場合 (床または他のブロックに到達)
        fixTetromino(); // 現在のテトリミノをボードに固定
        removeCompletedLines(); // 完成したラインがあれば消去しスコア加算
        if (!spawnNewTetromino()) { // 新しいテトリミノを生成、失敗 (ゲームオーバー) なら終了
            return;
        }
    }
    drawBoard(); // ボードを再描画
}

// --- ゲームロジック関数 ---

/**
 * 完成したライン（行）を検出し、消去する。
 * 消去したライン数に応じてスコアを加算する。
 */
function removeCompletedLines() {
    let linesRemoved = 0; // 今回の落下で消去されたライン数
    // ボードの下の行から上の行に向かってチェック
    for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
        // 行内の全てのセルがブロックで埋まっているか (0を含まないか)
        if (board[r].every(cell => cell !== 0)) {
            board.splice(r, 1); // 完成した行を削除
            board.unshift(Array(BOARD_WIDTH).fill(0)); // ボードの先頭に新しい空の行を追加
            linesRemoved++;
            r++; // 行を削除して上に詰めたので、同じ行インデックスを再度チェック
        }
    }

    // 消去したライン数に応じてスコアを加算
    if (linesRemoved > 0) {
        // スコア計算例: 1行100点、2行300点、3行500点、4行(テトリス)800点など
        // ここでは単純に1行100点
        score += linesRemoved * 100;
        updateScore(); // スコア表示を更新
    }
}

/**
 * HTML上のスコア表示を現在のスコアで更新する。
 */
function updateScore() {
    scoreElement.textContent = score;
}

/**
 * ゲームオーバー処理。
 * ゲームループを停止し、アラートでスコアを表示する。
 */
function gameOver() {
    if (gameLoopTimerId) {
        clearInterval(gameLoopTimerId); // ゲームループを停止
        gameLoopTimerId = null; // タイマーIDをリセット
    }
    alert(`ゲームオーバー！ スコア: ${score}`);
    // TODO: より洗練されたゲームオーバー表示やリスタートUIを実装することも可能
}

// --- キーボード入力処理 ---

// キーボードのキーが押されたときのイベントリスナーを登録
document.addEventListener('keydown', handleKeyPress);

/**
 * 押されたキーに応じてテトリミノの操作やゲームの制御を行う。
 * @param {KeyboardEvent} event キーボードイベントオブジェクト。
 */
function handleKeyPress(event) {
    // ゲームオーバー中（タイマー停止中）はEnterキーによるリスタートのみ許可
    if (!gameLoopTimerId && event.key !== 'Enter') {
        if (!currentTetromino) return; // ゲーム開始前などでcurrentTetrominoがない場合も操作不可
    }


    // 操作中のテトリミノがない場合（ゲーム開始前やゲームオーバー直後など）は、
    // Enterキー以外は処理しない。
    if (!currentTetromino && event.key !== 'Enter') return;


    switch (event.key) {
        case 'ArrowLeft': // 左矢印キー: 左移動
            if (currentTetromino && !checkCollision(currentX - 1, currentY, currentTetromino.shape)) {
                currentX--;
            }
            break;
        case 'ArrowRight': // 右矢印キー: 右移動
            if (currentTetromino && !checkCollision(currentX + 1, currentY, currentTetromino.shape)) {
                currentX++;
            }
            break;
        case 'ArrowDown': // 下矢印キー: ソフトドロップ (1段下に移動)
            if (currentTetromino) moveDown();
            break;
        case 'ArrowUp': // 上矢印キー: 回転
            if (currentTetromino) rotateTetromino();
            break;
        case ' ': // スペースキー: ハードドロップ
            event.preventDefault(); // スペースキーのデフォルト動作 (ページスクロールなど) を抑制
            if (currentTetromino) hardDrop();
            break;
        case 'Enter': // Enterキー
            // ゲームループが停止している (gameLoopTimerIdがnull) 場合のみリスタート処理
            if (!gameLoopTimerId) {
                startGame();
            }
            break;
    }

    // キー操作後にテトリミノが存在すればボードを再描画
    // (ゲームオーバー後やEnterリスタート直後などでcurrentTetrominoが一時的にnullになる場合を除く)
    if (currentTetromino) {
        drawBoard();
    }
}

/**
 * 現在のテトリミノを時計回りに90度回転させる。
 * 回転時に壁や他のブロックに衝突する場合、簡易的な「壁蹴り」ロジックで位置を調整する。
 */
function rotateTetromino() {
    if (!currentTetromino) return; // 操作中のテトリミノがなければ何もしない

    const originalShape = currentTetromino.shape; // 回転前の形状を保持
    const rotatedShape = []; // 回転後の形状を格納する配列
    const rows = originalShape.length;    // 元の形状の行数
    const cols = originalShape[0].length; // 元の形状の列数

    // 回転アルゴリズム: 2次元配列を時計回りに90度回転
    for (let c = 0; c < cols; c++) {
        rotatedShape[c] = [];
        for (let r = rows - 1; r >= 0; r--) {
            rotatedShape[c].push(originalShape[r][c]);
        }
    }

    let tempX = currentX; // 回転後の仮のX座標
    const shapeWidth = rotatedShape[0] ? rotatedShape[0].length : 0; // 回転後の幅
    const shapeHeight = rotatedShape.length; // 回転後の高さ

    // --- 回転後の衝突回避処理 (簡易的なウォールキック/フロアキック) ---
    // 1. X軸方向の調整: まず現在のX位置で試す
    if (checkCollision(tempX, currentY, rotatedShape)) {
        // 1a. 右壁にはみ出す場合、左にずらす
        if (tempX + shapeWidth > BOARD_WIDTH) {
            tempX -= (tempX + shapeWidth - BOARD_WIDTH);
        }
        // 1b. 左壁にはみ出す場合 (tempX < 0)、右にずらす (0に設定)
        if (tempX < 0) {
            tempX = 0;
        }
        // 1c. それでも衝突する場合、左右に1マスずつずらして試す (基本的な壁蹴り)
        if (checkCollision(tempX, currentY, rotatedShape)) {
            if (!checkCollision(tempX + 1, currentY, rotatedShape) && (tempX + 1 + shapeWidth <= BOARD_WIDTH)) {
                tempX++; // 右に1マス
            } else if (!checkCollision(tempX - 1, currentY, rotatedShape) && (tempX - 1 >= 0)) {
                tempX--; // 左に1マス
            }
        }
    }

    // 2. Y軸方向の調整: 特にIミノなどが床際で回転してはみ出す場合を考慮
    if (checkCollision(tempX, currentY, rotatedShape)) {
        if (currentY + shapeHeight > BOARD_HEIGHT) {
            // 床からはみ出る場合、上にずらす (フロアキック)
            const diffY = currentY + shapeHeight - BOARD_HEIGHT;
            if (!checkCollision(tempX, currentY - diffY, rotatedShape)) {
                currentY -= diffY;
            } else {
                // それでも衝突するなら回転をキャンセル
                return;
            }
        } else {
            // その他のY軸方向の衝突 (他のブロックとの衝突)
            // ここでは複雑なY軸キックは実装せず、回転をキャンセル
            return;
        }
    }

    // 最終的に衝突しない位置が見つかれば回転を適用
    if (!checkCollision(tempX, currentY, rotatedShape)) {
        currentTetromino.shape = rotatedShape;
        currentX = tempX; // 調整後のX座標を適用
        // currentY も調整されていれば適用済み
    }
    // 注意: これは簡易的な回転処理です。SRS (Super Rotation System) のような
    //       より洗練された回転システムでは、複数のオフセット位置を試行します。
}


/**
 * 現在のテトリミノをボードの一番下まで一気に落下させる (ハードドロップ)。
 * 落下後、ブロックを固定し、ライン消去、新ブロック生成を行う。
 */
function hardDrop() {
    if (!currentTetromino) return; // 操作中のブロックがなければ何もしない

    // 衝突するまで1段ずつ下に移動
    while (!checkCollision(currentX, currentY + 1, currentTetromino.shape)) {
        currentY++;
    }
    fixTetromino();         // ブロックを固定
    removeCompletedLines(); // ライン消去とスコア更新

    // ゲームがアクティブな場合 (タイマーが動作中) のみ新しいブロックを生成
    if (gameLoopTimerId) {
        if (!spawnNewTetromino()) { // 新ブロック生成、失敗 (ゲームオーバー) なら終了
            return;
        }
    }
    drawBoard(); // ボードを再描画 (spawnNewTetromino内で呼ばれるdrawBoardの前にこちらが呼ばれることを期待)
}

// --- ゲーム管理関数 ---

/**
 * ゲームを開始 (またはリスタート) する。
 * ボード、スコア、各種状態を初期化し、ゲームループを開始する。
 */
function startGame() {
    // ボードを初期化 (全て0で埋める)
    board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    score = 0; // スコアをリセット
    updateScore(); // スコア表示を更新
    nextTetromino = null;    // 次のテトリミノをクリア
    currentTetromino = null; // 現在のテトリミノもクリア

    // 既存のゲームループがあれば停止
    if (gameLoopTimerId) {
        clearInterval(gameLoopTimerId);
        gameLoopTimerId = null;
    }

    // 最初のテトリミノを生成・配置
    if (spawnNewTetromino()) { // 配置に成功した場合
        drawBoard();     // ボードを描画
        drawNextBlock(); // 次のブロックを表示

        // ゲームループを開始 (一定時間ごとにmoveDownを実行)
        gameLoopTimerId = setInterval(() => {
            if (currentTetromino) { // 操作中のテトリミノが存在する場合のみ
                moveDown();
            } else if (gameLoopTimerId) {
                // 何らかの理由で currentTetromino がないのにタイマーが動いている場合 (安全策)
                clearInterval(gameLoopTimerId);
                gameLoopTimerId = null;
                console.warn("警告: ゲームループが操作対象のテトリミノなしに継続しようとしたため、タイマーを停止しました。");
            }
        }, 1000); // 1000ミリ秒 (1秒) ごとに落下
    } else {
        // 最初のテトリミノ配置に失敗した場合 (通常はゲームオーバー)
        // gameOver() が spawnNewTetromino 内で呼ばれているはず
        drawBoard(); // ゲームオーバー状態のボードを描画
        drawNextBlock();
    }
}

// --- ゲーム開始 ---
// HTMLが読み込まれた後にゲームを開始する
startGame();
