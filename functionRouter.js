const { Router } = require("express");
const controller = require("../controllers/functionController");

const router = Router();

console.log('=== FUNCTION ROUTER ===');
console.log('Все экспорты контроллера:', Object.keys(controller));

// Получение информации о сотруднике
router.post("/employee-info",
  controller.validateGetEmployeeInfo,
  controller.getEmployeeInfo
);

// Получение списка всех активных сотрудников
router.get("/active-employees", controller.getActiveEmployees);  

// Обновление зарплат всех сотрудников (старая версия)
router.post("/update-salaries", controller.updateAllEmployeeSalaries); 

router.post(
  "/calculate-salary",
  controller.validateSalaryCalculationData, 
  controller.validateSalaryData,           
  controller.calculateSalaryWithTaxes      
);

// Получение средней зарплаты по конкретному отделу
router.get("/avg-salary/department/:department_id", controller.getAvgSalaryByDepartment);
router.post("/avg-salary/department", controller.getAvgSalaryByDepartment);

// Получение средней зарплаты по всем отделам
router.get("/avg-salary/all-departments", controller.getAvgSalaryAllDepartments);

module.exports = router;