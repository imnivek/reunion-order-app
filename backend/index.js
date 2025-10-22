// 引入必要的套件
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 建立 Express 應用程式
const app = express();
const port = process.env.PORT || 8080; // Zeabur 會自動設定 PORT

// Zeabur 會自動提供 DATABASE_URL 環境變數
// 我們用它來連接 PostgreSQL 資料庫
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // 對於某些 Zeabur 配置可能是必要的
  }
});

// 中介軟體
app.use(cors()); // 允許跨來源請求 (讓您的 HTML 檔案可以存取)
app.use(express.json()); // 解析傳入的 JSON 資料

// 初始化資料庫 (自動建立訂單表格)
async function initDb() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      timestamp VARCHAR(255),
      user_name VARCHAR(255),
      main_course VARCHAR(255),
      main_course_price INT,
      combo VARCHAR(255),
      combo_price INT,
      drink VARCHAR(255),
      drink_price INT,
      dessert VARCHAR(255),
      dessert_price INT,
      total INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log("Table 'orders' is ready.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
}

// 根目錄路由 (用於健康檢查)
app.get('/', (req, res) => {
  res.send('同學會訂餐後端已啟動！');
});

// --- 新增的路由：讀取所有訂單 ---
app.get('/orders', async (req, res) => {
  try {
    // 查詢資料庫，只選取需要的欄位，並依照建立時間倒序 (最新的在最上面)
    const result = await pool.query(
      'SELECT user_name, main_course, total, timestamp FROM orders ORDER BY created_at DESC'
    );
    
    // 將查詢結果以 JSON 格式回傳
    res.status(200).json(result.rows);

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ result: "error", error: error.message });
  }
});

// 提交訂單的 API 路由
app.post('/submit', async (req, res) => {
  try {
    const data = req.body;

    const insertQuery = `
      INSERT INTO orders (
        timestamp, user_name, main_course, main_course_price, 
        combo, combo_price, drink, drink_price, 
        dessert, dessert_price, total
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
    `;
    
    const values = [
      data.timestamp,
      data.user, // 'user' in JSON, 'user_name' in DB
      data.mainCourse,
      data.mainCoursePrice,
      data.combo,
      data.comboPrice,
      data.drink,
      data.drinkPrice,
      data.dessert,
      data.dessertPrice,
      data.total
    ];

    await pool.query(insertQuery, values);
    
    res.status(200).json({ result: "success" });

  } catch (error) {
    console.error("Error inserting order:", error);
    res.status(500).json({ result: "error", error: error.message });
  }
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  initDb(); // 伺服器啟動時檢查並建立資料表
});

