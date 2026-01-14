const { Router } = require("express");
const controller = require("../controllers/userController"); //импортируйте контроллер

// создаем объект маршрутизатор
const router = Router();

// добавляем маршруты
router.post("/login", controller.getLogin);

//создание домашнего маршрута, который будет выводить имя пользователя пользователя.
// http://localhost:3001/home
router.get("/", controller.getRedirectHome);

// экспортируем маршрутизатор на server
module.exports = router;
