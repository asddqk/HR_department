// routes/procedureRouter.js
const { Router } = require("express");
const controller = require("../controllers/procedureController");

const router = Router();
console.log('=== ИМПОРТ КОНТРОЛЛЕРА ===');
console.log('validateDismissEmployeeData доступен?', !!controller.validateDismissEmployeeData);
console.log('dismissEmployee доступен?', !!controller.dismissEmployee);
console.log('Все экспорты:', Object.keys(controller));

// Получение информации о доступных процедурах
router.get("/", controller.getProcedures);

// Вызов процедуры добавления сотрудника
router.post("/add-employee", 
  controller.validateEmployeeData, // Валидация данных
  controller.addEmployee // Основная функция
);

// ВЫЗОВ ПРОЦЕДУРЫ УДАЛЕНИЯ ОТДЕЛА С ВАЛИДАЦИЕЙ
router.delete("/delete-department",
  controller.validateDeleteDepartmentData, // Валидация как middleware
  controller.deleteDepartmentWithTransfer  // Контроллер
);

// Вызов процедуры увольнения сотрудника - С ДОПОЛНИТЕЛЬНОЙ ОТЛАДКОЙ
router.delete("/dismiss-employee",
  (req, res, next) => {
    console.log('=== MIDDLEWARE 1: До валидации ===');
    console.log('Тело запроса:', req.body);
    console.log('validateDismissEmployeeData функция:', controller.validateDismissEmployeeData);
    next();
  },
  controller.validateDismissEmployeeData,
  (req, res, next) => {
    console.log('=== MIDDLEWARE 2: После валидации ===');
    const { validationResult } = require("express-validator");
    const errors = validationResult(req);
    console.log('Ошибки валидации:', errors.array());
    
    if (!errors.isEmpty()) {
      console.log('Найдены ошибки, прерываем выполнение');
      return res.status(422).json({
        status: 'validation_error',
        message: 'Ошибки валидации данных',
        errors: errors.array()
      });
    }
    console.log('Валидация прошла успешно');
    next();
  },
  controller.dismissEmployee
);

// Функция анализа зарплат
router.get("/salary-analysis", controller.getSalaryAnalysis);

module.exports = router;