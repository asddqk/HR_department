const { Router } = require("express");
const controller = require("../controllers/queryController");

// создаем объект маршрутизатор
const router = Router();

// добавляем маршруты для запросов
router.get("/", controller.getCooperator); // вызов метода getCooperator (находиться в файле controller.js) для объекта controller
router.get("/:id", controller.getCooperatorById);

// экспортируем маршрутизатор на server
module.exports = router;
