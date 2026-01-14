const { Router } = require("express");
const controller = require("../controllers/viewController");

const router = Router();

// Сотрудники на испытательном сроке
router.get("/employees-on-probation", controller.getEmployeesOnProbation);

// Распределение зарплат по грейдам
router.get("/salary-grades", controller.getSalaryGrades);

// Дни рождения сотрудников
router.get("/employee-birthdays", controller.getEmployeeBirthdays);

module.exports = router;