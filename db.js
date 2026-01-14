require("dotenv").config(); // В САМОМ НАЧАЛЕ

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT), // преобразуем строку в число
});

// Тестирование подключения
pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к PostgreSQL:', err.message);
  } else {
    console.log('Успешное подключение к PostgreSQL');
    release();
  }
});

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Неожиданная ошибка в пуле подключений:', err);
  process.exit(-1);
});

module.exports = pool;