// testController.js
console.log('Проверка существования контроллера...');
try {
  const controller = require('./controllers/procedureController');
  console.log('Контроллер загружен успешно:', Object.keys(controller));
} catch (error) {
  console.error('Ошибка загрузки контроллера:', error.message);
}