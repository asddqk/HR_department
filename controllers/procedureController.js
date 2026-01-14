const { validationResult, body } = require("express-validator");

const pool = require("../db");
const queries = require("../queries");

const getProcedures = async (req, res) => {
  try {
    res.json({
      procedures: [
        {
          name: "add-employee",
          method: "POST",
          endpoint: "/api/procedures/add-employee",
          description: "Добавление нового сотрудника в систему",
          parameters: [
            "personal_number", "middle_name", "first_name", "last_name",
            "birth_date", "passport", "inn", "snils", "address",
            "phone_number", "department_id", "position_id",
            "education", "diplom_num", "finish_year",
            "hire_date", "salary", "probation_period"
          ]
        },
        {
          name: "delete-department-with-transfer",
          method: "DELETE",
          endpoint: "/api/procedures/delete-department",
          description: "Удаление отдела с переводом всех сотрудников в другой отдел",
          parameters: [
            "department_id_to_delete",
            "target_department_id",
            "reason"
          ]
        },
        {
          name: "dismiss-specific-employee",
          method: "DELETE",
          endpoint: "/api/procedures/dismiss-employee",
          description: "Увольнение конкретного сотрудника по ФИО, отделу и должности",
          parameters: [
            "middle_name (опционально)",
            "first_name",
            "last_name",
            "department_name",
            "position_name",
            "reason"
          ]
        },
        {
          name: "get-salary-analysis",
          method: "GET",
          endpoint: "/api/procedures/salary-analysis",
          description: "Анализ зарплат по отделам с детализацией",
          parameters: []
        }
      ]
    });
  } catch (error) {
    console.error('Ошибка при получении списка процедур:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера: ' + error.message
    });
  }
};

const validateEmployeeData = [
  body("personal_number")
    .notEmpty().withMessage("Табельный номер обязателен")
    .isLength({ min: 3, max: 20 }).withMessage("Табельный номер должен быть от 3 до 20 символов"),
  
  body("middle_name")
    .optional()
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Отчество должно содержать только русские буквы, пробелы и дефисы"),
  
  body("first_name")
    .notEmpty().withMessage("Имя обязательно")
    .isLength({ min: 2, max: 50 }).withMessage("Имя должно быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Имя должно содержать только русские буквы, пробелы и дефисы"),
  
  body("last_name")
    .notEmpty().withMessage("Фамилия обязательна")
    .isLength({ min: 2, max: 50 }).withMessage("Фамилия должна быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Фамилия должна содержать только русские буквы, пробелы и дефисы"),
  
  body("birth_date")
    .notEmpty().withMessage("Дата рождения обязательна")
    .custom((value) => {
      if (!/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(value)) {
        throw new Error("Недопустимый формат даты. Используйте dd.mm.yyyy, dd-mm-yyyy или dd/mm/yyyy");
      }
      
      const parts = value.split(/[./-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      
      const birthDate = new Date(year, month, day);
      const currentDate = new Date();
      
      if (
        birthDate.getDate() !== day ||
        birthDate.getMonth() !== month ||
        birthDate.getFullYear() !== year
      ) {
        throw new Error("Некорректная дата рождения");
      }
      
      if (birthDate > currentDate) {
        throw new Error("Дата рождения не может быть в будущем");
      }
      
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = currentDate.getMonth() - birthDate.getMonth();
      
      let adjustedAge = age;
      if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
        adjustedAge--;
      }
      
      if (adjustedAge < 18) {
        throw new Error("Сотрудник должен быть старше 18 лет");
      }
      
      if (adjustedAge >= 65) {
        throw new Error("Сотрудник должен быть младше 65 лет");
      }
      
      return true;
    }),
  
  body("passport")
    .notEmpty().withMessage("Паспорт обязателен")
    .isLength({ min: 10, max: 10 }).withMessage("Паспорт должен содержать 10 цифр")
    .isNumeric().withMessage("Паспорт должен содержать только цифры"),
  
  body("inn")
    .notEmpty().withMessage("ИНН обязателен")
    .isLength({ min: 12, max: 12 }).withMessage("ИНН должен содержать 12 цифр")
    .isNumeric().withMessage("ИНН должен содержать только цифры"),
  
  body("snils")
    .notEmpty().withMessage("СНИЛС обязателен")
    .isLength({ min: 11, max: 14 }).withMessage("СНИЛС должен содержать от 11 до 14 символов")
    .custom((value) => {
      if (!/^(\d{3}-\d{3}-\d{3} \d{2}|\d{11})$/.test(value)) {
        throw new Error("СНИЛС должен быть в формате 123-456-789 00 или 12345678900");
      }
      return true;
    }),
  
  body("address")
    .optional()
    .isLength({ max: 100 }).withMessage("Адрес не должен превышать 100 символов"),
  
  body("phone_number")
    .notEmpty().withMessage("Телефон обязателен")
    .custom((value) => {
      if (!/^7\d{10}$/.test(value)) {
        throw new Error("Телефон должен быть в формате 7XXXXXXXXXX (11 цифр, начинается с 7)");
      }
      return true;
    }),
  
  body("department_id")
    .notEmpty().withMessage("ID отдела обязателен")
    .isInt({ min: 1 }).withMessage("ID отдела должен быть положительным числом"),
  
  body("position_id")
    .notEmpty().withMessage("ID должности обязателен")
    .isInt({ min: 1 }).withMessage("ID должности должен быть положительным числом"),
  
  body("education")
    .notEmpty().withMessage("Образование обязательно")
    .isLength({ max: 100 }).withMessage("Образование не должно превышать 100 символов"),
  
  body("diplom_num")
    .optional()
    .isLength({ max: 50 }).withMessage("Номер диплома не должен превышать 50 символов"),
  
  body("finish_year")
    .notEmpty().withMessage("Год окончания обязателен")
    .custom((value) => {
      if (!/^\d{4}[./-]\d{2}[./-]\d{2}$/.test(value)) {
        throw new Error("Год окончания должен быть в формате yyyy-mm-dd, yyyy.mm.dd или yyyy/mm/dd");
      }
      
      const finishDate = new Date(value);
      const currentDate = new Date();
      
      if (isNaN(finishDate.getTime())) {
        throw new Error("Некорректная дата окончания");
      }
      
      if (finishDate > currentDate) {
        throw new Error("Дата окончания не может быть в будущем");
      }
      
      return true;
    }),
  
  body("hire_date")
    .notEmpty().withMessage("Дата приема обязательна")
    .custom((value) => {
      if (!/^\d{4}[./-]\d{2}[./-]\d{2}$/.test(value)) {
        throw new Error("Дата приема должна быть в формате yyyy-mm-dd, yyyy.mm.dd или yyyy/mm/dd");
      }
      
      const hireDate = new Date(value);
      const currentDate = new Date();
      
      if (isNaN(hireDate.getTime())) {
        throw new Error("Некорректная дата приема");
      }
      
      if (hireDate > currentDate) {
        throw new Error("Дата приема не может быть в будущем");
      }
      
      return true;
    }),
  
  body("salary")
    .notEmpty().withMessage("Зарплата обязателен")
    .isFloat({ min: 0 }).withMessage("Зарплата должна быть положительным числом"),
  
  body("probation_period")
    .notEmpty().withMessage("Испытательный срок обязателен")
    .isInt({ min: 0, max: 365 }).withMessage("Испытательный срок должен быть от 0 до 365 дней")
];

const addEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: 'validation_error',
        message: 'Ошибки валидации данных',
        errors: errors.array()
      });
    }

    const {
      personal_number, middle_name, first_name, last_name,
      birth_date, passport, inn, snils, address,
      phone_number, department_id, position_id,
      education, diplom_num, finish_year,
      hire_date, salary, probation_period
    } = req.body;

    const existingEmployee = await pool.query(
      `SELECT employee_id FROM employees 
       WHERE first_name = $1 AND last_name = $2 
       AND (middle_name = $3 OR (middle_name IS NULL AND $3 IS NULL))`,
      [first_name, last_name, middle_name || null]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Сотрудник с таким ФИО уже существует в системе',
        existing_employee_id: existingEmployee.rows[0].employee_id
      });
    }

    const departmentExists = await pool.query(
      'SELECT 1 FROM departments WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Отдел с ID ${department_id} не существует`
      });
    }

    const positionExists = await pool.query(
      'SELECT 1 FROM position WHERE position_id = $1 AND department_id = $2',
      [position_id, department_id]
    );
    
    if (positionExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Должность с ID ${position_id} не существует в отделе ${department_id}`
      });
    }

    const result = await pool.query(queries.callAddEmployee, [
      personal_number, middle_name || null, first_name, last_name,
      birth_date, passport, inn, snils, address || null,
      phone_number, department_id, position_id,
      education, diplom_num || null, finish_year,
      hire_date, salary, probation_period
    ]);

    const lastRow = result.rows[result.rows.length - 1];
    
    if (lastRow.p_status === 'SUCCESS') {
      res.status(201).json({
        status: 'success',
        message: lastRow.p_message,
        employee_id: lastRow.p_employee_id,
        details: {
          personal_number,
          full_name: `${last_name} ${first_name} ${middle_name || ''}`.trim(),
          department_id,
          position_id,
          hire_date,
          salary
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: lastRow.p_message
      });
    }
  } catch (error) {
    console.error('Ошибка при добавлении сотрудника:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера при добавлении сотрудника';
    
    if (error.code === '23505') {
      if (error.constraint === 'employees_personal_number_key') {
        errorMessage = 'Сотрудник с таким табельным номером уже существует';
      } else if (error.constraint === 'employees_passport_key') {
        errorMessage = 'Сотрудник с таким паспортом уже существует';
      } else if (error.constraint === 'employees_inn_key') {
        errorMessage = 'Сотрудник с таким ИНН уже существует';
      } else if (error.constraint === 'employees_snils_key') {
        errorMessage = 'Сотрудник с таким СНИЛС уже существует';
      } else if (error.constraint === 'employees_phone_number_key') {
        errorMessage = 'Сотрудник с таким телефоном уже существует';
      }
    } else if (error.code === '23503') {
      errorMessage = 'Ошибка ссылочной целостности. Проверьте ID отдела, должности или других связанных данных';
    } else if (error.message.includes('должен быть младше 65 лет')) {
      errorMessage = 'Кандидат должен быть младше 65 лет';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const validateDeleteDepartmentData = [
  body("department_id_to_delete")
    .notEmpty().withMessage("ID удаляемого отдела обязателен")
    .isInt({ min: 1 }).withMessage("ID удаляемого отдела должен быть положительным числом"),
  
  body("target_department_id")
    .notEmpty().withMessage("ID целевого отдела обязателен")
    .isInt({ min: 1 }).withMessage("ID целевого отдела должен быть положительным числом"),
  
  body("reason")
    .notEmpty().withMessage("Причина удаления обязательна")
    .trim()
    .isLength({ min: 5, max: 100 }).withMessage("Причина должна быть от 5 до 100 символов")
    .custom((value) => {
      const invalidChars = /[<>{}]/;
      if (invalidChars.test(value)) {
        throw new Error("Причина содержит недопустимые символы (<, >, {, })");
      }
      return true;
    })
    .customSanitizer((value) => {
      return value.replace(/\s+/g, ' ').trim();
    })
];

const deleteDepartmentWithTransfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: 'validation_error',
        message: 'Ошибки валидации данных',
        errors: errors.array()
      });
    }

    const { department_id_to_delete, target_department_id, reason } = req.body;

    const deleteDeptResult = await pool.query(
      'SELECT name FROM departments WHERE department_id = $1',
      [department_id_to_delete]
    );
    
    if (deleteDeptResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Отдел с ID ${department_id_to_delete} не существует`
      });
    }
    const departmentToDeleteName = deleteDeptResult.rows[0].name;

    const targetDeptResult = await pool.query(
      'SELECT name FROM departments WHERE department_id = $1',
      [target_department_id]
    );
    
    if (targetDeptResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Целевой отдел с ID ${target_department_id} не существует`
      });
    }
    const targetDepartmentName = targetDeptResult.rows[0].name;

    if (department_id_to_delete === target_department_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Удаляемый и целевой отделы не могут быть одинаковыми'
      });
    }

    console.log('Параметры удаления отдела:', {
      department_id_to_delete,
      department_name: departmentToDeleteName,
      target_department_id,
      target_department_name: targetDepartmentName,
      reason,
      timestamp: new Date().toISOString()
    });

    const employeesCheck = await pool.query(
      `SELECT COUNT(*) as employee_count FROM employees 
       WHERE department_id = $1 AND status = 'активен'`,
      [department_id_to_delete]
    );

    const activeEmployees = parseInt(employeesCheck.rows[0].employee_count);
    
    if (activeEmployees > 0) {
      console.log(`В отделе ${departmentToDeleteName} найдено ${activeEmployees} активных сотрудников`);
    }

    console.log('Вызов процедуры delete_department_with_transfer...');
    const result = await pool.query(queries.callDeleteDepartment, [
      department_id_to_delete,
      target_department_id,
      reason
    ]);

    console.log('Результат процедуры:', {
      rowCount: result.rowCount,
      rows: result.rows,
      affectedRows: result.rows ? result.rows.length : 0
    });

    const finalCheck = await pool.query(
      `SELECT 
        d.department_id,
        d.name as department_name,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.department_id AND e.status = 'активен') as remaining_employees
       FROM departments d 
       WHERE d.department_id = $1`,
      [department_id_to_delete]
    );

    if (finalCheck.rows.length === 0) {
      res.status(200).json({
        status: 'success',
        message: `Отдел "${departmentToDeleteName}" (ID: ${department_id_to_delete}) успешно удален`,
        details: {
          deleted_department_id: department_id_to_delete,
          deleted_department_name: departmentToDeleteName,
          target_department_id,
          target_department_name: targetDepartmentName,
          reason,
          transferred_employees: activeEmployees,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      const remainingEmployees = finalCheck.rows[0].remaining_employees;
      
      if (remainingEmployees > 0) {
        res.status(200).json({
          status: 'partial_success',
          message: `Отдел "${departmentToDeleteName}" не может быть удален: осталось ${remainingEmployees} активных сотрудников`,
          details: {
            department_id: department_id_to_delete,
            department_name: departmentToDeleteName,
            remaining_employees: remainingEmployees,
            action_taken: 'Процедура выполнена, но отдел сохранен',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(200).json({
          status: 'warning',
          message: `Отдел "${departmentToDeleteName}" сохранен по неизвестной причине`,
          details: {
            department_id: department_id_to_delete,
            department_name: departmentToDeleteName,
            target_department_id,
            target_department_name: targetDepartmentName,
            note: 'Проверьте логи PostgreSQL для деталей',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Полная ошибка при удалении отдела:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = 'Внутренняя ошибка сервера при удалении отдела';
    let statusCode = 500;
    
    if (error.code === '23503') {
      errorMessage = 'Невозможно удалить отдел: существуют связанные записи в других таблицах';
      statusCode = 409;
    } else if (error.code === '23505') {
      errorMessage = 'Нарушение уникальности данных при переводе сотрудников';
      statusCode = 409;
    } else if (error.message.includes('не существует')) {
      errorMessage = error.message;
      statusCode = 404;
    } else if (error.message.includes('одинаковыми')) {
      errorMessage = 'Удаляемый и целевой отделы не могут быть одинаковыми';
      statusCode = 400;
    } else if (error.message.includes('value too long')) {
      errorMessage = 'Причина слишком длинная (максимум 100 символов)';
      statusCode = 400;
    } else if (error.message.includes('check constraint')) {
      errorMessage = 'Нарушение ограничений целостности данных';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        original_error: error.message,
        error_code: error.code
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

const validateDismissEmployeeData = [
  body("first_name")
    .notEmpty().withMessage("Имя обязательно")
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Имя должно быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Имя должно содержать только русские буквы, пробелы и дефисы"),
  
  body("last_name")
    .notEmpty().withMessage("Фамилия обязательна")
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Фамилия должна быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Фамилия должна содержать только русские буквы, пробелы и дефисы"),
  
  body("middle_name")
    .optional()
    .trim()
    .custom((value) => {
      if (value && value.trim() !== '') {
        if (value.length > 50) {
          throw new Error("Отчество не должно превышать 50 символов");
        }
        if (!/^[а-яА-ЯёЁ\s-]+$/.test(value)) {
          throw new Error("Отчество должно содержать только русские буквы, пробелы и дефисы");
        }
      }
      return true;
    }),
  
  body("department_name")
    .notEmpty().withMessage("Название отдела обязательно")
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Название отдела должно быть от 2 до 100 символов"),
  
  body("position_name")
    .notEmpty().withMessage("Название должности обязательно")
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Название должности должно быть от 2 до 100 символов"),
  
  body("reason")
    .notEmpty().withMessage("Причина увольнения обязательна")
    .trim()
    .isLength({ min: 5, max: 500 }).withMessage("Причина увольнения должна быть от 5 до 500 символов")
    .custom((value) => {
      const invalidChars = /[<>{}]/;
      if (invalidChars.test(value)) {
        throw new Error("Причина содержит недопустимые символы (<, >, {, })");
      }
      
      const words = value.trim().split(/\s+/).length;
      if (words < 2) {
        throw new Error("Причина должна содержать как минимум 2 слова");
      }
      
      return true;
    })
    .customSanitizer((value) => {
      return value.replace(/\s+/g, ' ').trim();
    })
];

const dismissEmployee = async (req, res) => {
  try {
    console.log('=== НАЧАЛО dismissEmployee ===');
    console.log('Тело запроса:', req.body);
    console.log('Длина причины:', req.body.reason ? req.body.reason.length : 'нет');
    
    const errors = validationResult(req);
    console.log('Ошибки валидации:', errors.array());
    console.log('Есть ошибки?', !errors.isEmpty());
    
    if (!errors.isEmpty()) {
      console.log('Возвращаю ошибку валидации 422');
      return res.status(422).json({
        status: 'validation_error',
        message: 'Ошибки валидации данных',
        errors: errors.array()
      });
    }
    
    console.log('Валидация пройдена, продолжаем...');

    const {
      middle_name,
      first_name,
      last_name,
      department_name,
      position_name,
      reason
    } = req.body;

    console.log('Параметры увольнения сотрудника (после валидации):', {
      first_name,
      last_name,
      middle_name: middle_name || 'не указано',
      department_name,
      position_name,
      reason_length: reason.length
    });

    const result = await pool.query(queries.callDismissEmployeeCall, [
      middle_name ? middle_name.trim() : null, 
      first_name.trim(),
      last_name.trim(),
      department_name.trim(),
      position_name.trim(),
      reason.trim()
    ]);

    console.log('Результат процедуры увольнения:', result.rows);

    if (result.rows.length === 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Процедура не вернула результат'
      });
    }

    const procedureResult = result.rows[0];

    if (procedureResult.p_status === 'SUCCESS') {
      res.status(200).json({
        status: 'success',
        message: procedureResult.p_message,
        details: {
          employee_name: `${last_name} ${first_name} ${middle_name || ''}`.trim(),
          department: department_name,
          position: position_name,
          dismissal_reason: reason,
          dismissal_date: new Date().toISOString().split('T')[0]
        }
      });
    } else {
      let errorCode = 400;
      let errorMessage = procedureResult.p_message;
      
      if (procedureResult.p_message.includes('не найден')) {
        errorCode = 404;
        errorMessage = 'Сотрудник не найден. Проверьте ФИО, отдел и должность.';
      } else if (procedureResult.p_message.includes('уже уволен')) {
        errorCode = 409;
      }
      
      res.status(errorCode).json({
        status: 'error',
        message: errorMessage,
        original_message: procedureResult.p_message
      });
    }
  } catch (error) {
    console.error('Ошибка при увольнении сотрудника:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = 'Внутренняя ошибка сервера при увольнении сотрудника';
    let statusCode = 500;
    
    if (error.code === '23503') {
      errorMessage = 'Ошибка ссылочной целостности данных';
      statusCode = 400;
    } else if (error.message.includes('не найден')) {
      errorMessage = 'Сотрудник не найден. Проверьте данные.';
      statusCode = 404;
    } else if (error.message.includes('уже уволен')) {
      errorMessage = error.message;
      statusCode = 409;
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        original_error: error.message,
        error_code: error.code
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

const getSalaryAnalysis = async (req, res) => {
  try {
    console.log('Запрос анализа зарплат');

    const result = await pool.query(queries.callGetSalaryAnalysis);
    
    console.log('Получено записей:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Нет данных для анализа',
        summary: { department_count: 0, total_employees: 0, total_salary_budget: 0 },
        departments: []
      });
    }

    const summaryRow = result.rows[0];
    const summary = {
      department_count: result.rows.length - 1,
      total_employees: summaryRow.employee_count,
      total_salary_budget: summaryRow.department_salary_budget
    };

    const departments = result.rows.slice(1).map(row => ({
      department_name: row.department_name,
      employee_count: row.employee_count,
      min_salary: parseFloat(row.min_salary) || 0,
      max_salary: parseFloat(row.max_salary) || 0,
      avg_salary: parseFloat(row.avg_salary) || 0,
      department_salary_budget: parseFloat(row.department_salary_budget) || 0,
      employees_list: row.employees_list || ''
    }));

    res.status(200).json({
      status: 'success',
      summary,
      departments,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ошибка при анализе зарплат:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера при анализе зарплат'
    });
  }
};

module.exports = {
  getProcedures,
  addEmployee,
  validateEmployeeData,
  deleteDepartmentWithTransfer,
  validateDeleteDepartmentData,
  dismissEmployee,
  validateDismissEmployeeData,
  getSalaryAnalysis
};