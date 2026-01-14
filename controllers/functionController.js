const pool = require("../db");
const queries = require("../queries");
const { body, param, query, validationResult } = require('express-validator');
const moment = require('moment');

const validateGetEmployeeInfo = [
  // 1. Проверка ФИО
  body("middle_name")
    .notEmpty().withMessage("Отчество обязательно")
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Отчество должно быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Отчество должно содержать только русские буквы, пробелы и дефисы"),
  
  body("first_name")
    .notEmpty().withMessage("Имя обязательно")
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Имя должно быть от 2 до 50 символов")
    .isAlpha("ru-RU", { ignore: " -" }).withMessage("Имя должно содержать только русские буквы, пробелы и дефисы"),
  
  // 2. ИСПРАВЛЕННАЯ проверка даты рождения
  body("birth_date")
    .notEmpty().withMessage("Дата рождения обязательна")
    .trim()
    .custom((value) => {
      console.log('Проверка даты:', value);
      
      // Проверка формата YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error("Неверный формат даты. Используйте YYYY-MM-DD");
      }
      
      // Разбираем дату
      const parts = value.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      // Проверка диапазонов
      if (month < 1 || month > 12) {
        throw new Error(`Месяц должен быть от 1 до 12, а не ${month}`);
      }
      
      if (day < 1 || day > 31) {
        throw new Error(`День должен быть от 1 до 31, а не ${day}`);
      }
      
      // Проверка количества дней в месяце
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        throw new Error(`В ${month}-м месяце ${year} года только ${daysInMonth} дней`);
      }
      
      // Создаем объект Date для дальнейших проверок
      const birthDate = new Date(year, month - 1, day);
      const currentDate = new Date();
      
      // Проверка корректности
      if (
        birthDate.getFullYear() !== year ||
        birthDate.getMonth() !== month - 1 ||
        birthDate.getDate() !== day
      ) {
        throw new Error("Некорректная дата рождения");
      }
      
      // Дата не может быть в будущем
      if (birthDate > currentDate) {
        throw new Error("Дата рождения не может быть в будущем");
      }
      
      // Проверка возраста (минимум 14 лет, максимум 100 лет)
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = currentDate.getMonth() - birthDate.getMonth();
      const dayDiff = currentDate.getDate() - birthDate.getDate();
      
      let adjustedAge = age;
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        adjustedAge--;
      }
      
      if (adjustedAge < 14) {
        throw new Error("Возраст должен быть не менее 14 лет");
      }
      
      if (adjustedAge > 100) {
        throw new Error("Возраст не может превышать 100 лет");
      }
      
      console.log('Дата валидна:', { year, month, day, age: adjustedAge });
      return true;
    })
];

const getEmployeeInfo = async (req, res) => {
  try {
    console.log('=== НАЧАЛО getEmployeeInfo ===');
    console.log('Запрос информации о сотруднике:', req.body);
    
    // 1. ПРОВЕРКА ВАЛИДАЦИИ
    const errors = validationResult(req);
    console.log('Ошибки валидации:', errors.array());
    
    if (!errors.isEmpty()) {
      console.log('Валидация не пройдена!');
      return res.status(422).json({
        status: 'validation_error',
        message: 'Ошибки валидации данных',
        errors: errors.array()
      });
    }
    
    console.log('Валидация пройдена');
    
    // 2. ТОЛЬКО ОДИН РАЗ получаем данные
    const { middle_name, first_name, birth_date } = req.body;

    // 3. УДАЛИТЕ дублирующиеся проверки - они уже в валидаторе!
    // ЭТОТ БЛОК НЕ НУЖЕН, если валидация работает:
    // if (!middle_name || !first_name || !birth_date) { ... }
    // const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    // if (!dateRegex.test(birth_date)) { ... }

    // 4. Вызов функции PostgreSQL
    const result = await pool.query(queries.callGetEmployeeInfo, [
      middle_name,
      first_name,
      birth_date
    ]);

    console.log('Результат функции:', result.rows.length, 'записей');

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Сотрудник не найден. Проверьте введенные данные.',
        search_criteria: {
          middle_name,
          first_name,
          birth_date
        }
      });
    }

    // 5. Форматирование ответа
    const employeeData = result.rows[0];
    
    const formattedResponse = {
      status: 'success',
      data: {
        employee_id: employeeData.employee_id,
        personal_number: employeeData.personal_number,
        full_name: employeeData.full_name,
        birth_date: employeeData.birth_date,
        age: employeeData.age,
        department: employeeData.department_name,
        position: employeeData.position_name,
        salary: parseFloat(employeeData.salary),
        hire_date: employeeData.hire_date,
        experience_years: employeeData.experience_years,
        education: employeeData.education,
        status: employeeData.status,
        phone_number: employeeData.phone_number,
        email: employeeData.email
      },
      contact_info: {
        phone: employeeData.phone_number,
        email: employeeData.email,
        status: employeeData.status
      },
      work_info: {
        department: employeeData.department_name,
        position: employeeData.position_name,
        salary: parseFloat(employeeData.salary).toLocaleString('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          minimumFractionDigits: 2
        }),
        experience: `${employeeData.experience_years} лет`,
        hire_date: employeeData.hire_date
      }
    };

    res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Ошибка при получении информации о сотруднике:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера при получении информации о сотруднике';
    let statusCode = 500;
    
    if (error.message.includes('invalid input syntax for type date')) {
      errorMessage = 'Неправильный формат даты. Используйте YYYY-MM-DD';
      statusCode = 400;
    } else if (error.code === '22008') { // PostgreSQL ошибка даты
      errorMessage = 'Некорректная дата. Проверьте формат (YYYY-MM-DD)';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        original_error: error.message,
        error_code: error.code
      } : undefined
    });
  }
};
// активные сотрдуники 
const getActiveEmployees = async (req, res) => {
  try {
    console.log('Запрос списка активных сотрудников');

    const result = await pool.query(queries.callGetActiveEmployees);
    
    console.log('Найдено активных сотрудников:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Нет активных сотрудников',
        data: [],
        count: 0
      });
    }

    const employees = result.rows.map(row => ({
      personal_number: row.табельный_номер,
      last_name: row.фамилия,
      first_name: row.имя,
      middle_name: row.отчество,
      birth_date: row.дата_рождения,
      department: row.отдел,
      position: row.должность,
      status: row.статус,
      full_name: `${row.фамилия} ${row.имя} ${row.отчество || ''}`.trim(),
      age: calculateAge(row.дата_рождения)
    }));

    // Группировка по отделам для удобства
    const departments = {};
    employees.forEach(emp => {
      if (!departments[emp.department]) {
        departments[emp.department] = {
          department_name: emp.department,
          employees: [],
          count: 0
        };
      }
      departments[emp.department].employees.push(emp);
      departments[emp.department].count++;
    });

    const departmentsArray = Object.values(departments).sort((a, b) => b.count - a.count);

    res.status(200).json({
      status: 'success',
      data: employees,
      summary: {
        total_employees: employees.length,
        total_departments: departmentsArray.length,
        departments: departmentsArray
      },
      statistics: {
        by_department: departmentsArray.map(dept => ({
          department: dept.department_name,
          count: dept.count,
          percentage: Math.round((dept.count / employees.length) * 100)
        })),
        average_age: Math.round(employees.reduce((sum, emp) => sum + emp.age, 0) / employees.length)
      }
    });
    
  } catch (error) {
    console.error('Ошибка при получении активных сотрудников:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера при получении списка сотрудников',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Вспомогательная функция для расчета возраста
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};
//обнволение зп в связи с стажем
const updateAllEmployeeSalaries = async (req, res) => {
  try {
    console.log('Запрос на обновление зарплат всех сотрудников');

    // ВАЖНО: Эта функция ОБНОВЛЯЕТ данные в БД!
    // Можно добавить проверку авторизации или подтверждение

    const { confirm } = req.body;
    
    if (confirm !== true && confirm !== 'yes') {
      return res.status(400).json({
        status: 'warning',
        message: 'Эта операция обновит зарплаты всех сотрудников. Для подтверждения отправьте confirm: true в теле запроса.',
        warning: 'Функция увеличит зарплаты сотрудникам в зависимости от стажа: 1 год = +10%, 2 года = +20%, 3+ лет = +30%',
        required: {
          confirm: true
        }
      });
    }

    // Получаем текущие данные перед обновлением для сравнения
    const beforeUpdate = await pool.query(`
      SELECT 
        COUNT(*) as total_employees,
        COALESCE(SUM(ec.salary), 0) as total_budget_before,
        AVG(ec.salary) as avg_salary_before
      FROM employees e
      JOIN employment_contract ec ON e.contract_id = ec.contract_id
      WHERE e.status = 'активен'
    `);

    const result = await pool.query(queries.callUpdateAllEmployeeSalaries);
    
    console.log('Зарплаты обновлены для сотрудников:', result.rows.length);

    // Получаем данные после обновления
    const afterUpdate = await pool.query(`
      SELECT 
        COALESCE(SUM(ec.salary), 0) as total_budget_after,
        AVG(ec.salary) as avg_salary_after
      FROM employees e
      JOIN employment_contract ec ON e.contract_id = ec.contract_id
      WHERE e.status = 'активен'
    `);

    // Анализируем изменения
    const beforeData = beforeUpdate.rows[0];
    const afterData = afterUpdate.rows[0];
    
    const salaryIncrease = afterData.total_budget_after - beforeData.total_budget_before;
    const percentageIncrease = beforeData.total_budget_before > 0 
      ? ((salaryIncrease / beforeData.total_budget_before) * 100).toFixed(2)
      : 0;

    // Группируем результаты по статусу повышения
    const byStatus = {};
    result.rows.forEach(row => {
      if (!byStatus[row.status]) {
        byStatus[row.status] = {
          count: 0,
          total_increase: 0,
          employees: []
        };
      }
      byStatus[row.status].count++;
      byStatus[row.status].total_increase += (row.new_sal - row.old_sal);
      byStatus[row.status].employees.push({
        employee_id: row.emp_id,
        personal_number: row.tab_number,
        full_name: row.fio,
        old_salary: parseFloat(row.old_sal),
        new_salary: parseFloat(row.new_sal),
        increase: parseFloat(row.new_sal - row.old_sal),
        increase_percent: row.old_sal > 0 
          ? ((row.new_sal - row.old_sal) / row.old_sal * 100).toFixed(2)
          : 0,
        experience_years: row.exp_years
      });
    });

    const summary = {
      employees_processed: result.rows.length,
      total_budget_before: parseFloat(beforeData.total_budget_before),
      total_budget_after: parseFloat(afterData.total_budget_after),
      total_increase: parseFloat(salaryIncrease),
      percentage_increase: parseFloat(percentageIncrease),
      avg_salary_before: parseFloat(beforeData.avg_salary_before),
      avg_salary_after: parseFloat(afterData.avg_salary_after)
    };

    const statistics = Object.keys(byStatus).map(status => ({
      status,
      count: byStatus[status].count,
      percentage: ((byStatus[status].count / result.rows.length) * 100).toFixed(1),
      total_increase: parseFloat(byStatus[status].total_increase),
      avg_increase: parseFloat(byStatus[status].total_increase / byStatus[status].count)
    }));

    const sampleEmployees = result.rows.slice(0, 5).map(row => ({
      personal_number: row.tab_number,
      full_name: row.fio,
      experience_years: row.exp_years,
      old_salary: parseFloat(row.old_sal).toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2
      }),
      new_salary: parseFloat(row.new_sal).toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2
      }),
      increase: parseFloat(row.new_sal - row.old_sal).toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2
      }),
      status: row.status
    }));

    res.status(200).json({
      status: 'success',
      message: 'Зарплаты успешно обновлены',
      summary,
      statistics,
      by_status: byStatus,
      sample_employees: sampleEmployees,
      timestamp: new Date().toISOString(),
      note: 'Зарплаты увеличены в зависимости от стажа работы: 1 год = +10%, 2 года = +20%, 3+ лет = +30%'
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении зарплат:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера при обновлении зарплат';
    
    if (error.message.includes('deadlock')) {
      errorMessage = 'Обнаружен deadlock. Попробуйте позже.';
    } else if (error.message.includes('integrity constraint')) {
      errorMessage = 'Нарушение целостности данных при обновлении зарплат';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Валидация данных для расчета зарплаты с налогами
const validateSalaryCalculationData = [
  body(
    "last_name",
    "Поле Фамилия не должно быть пустым и должно содержать только буквы русского алфавита"
  )
    .notEmpty()
    .withMessage("Фамилия обязательна")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Фамилия должна содержать от 2 до 50 символов")
    .bail()
    .matches(/^[А-Яа-яЁё\s\-]+$/)
    .withMessage("Фамилия может содержать только русские буквы, пробелы и дефисы"),

  body(
    "first_name", 
    "Поле Имя не должно быть пустым и должно содержать только буквы русского алфавита"
  )
    .notEmpty()
    .withMessage("Имя обязательно")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Имя должно содержать от 2 до 50 символов")
    .bail()
    .matches(/^[А-Яа-яЁё\s\-]+$/)
    .withMessage("Имя может содержать только русские буквы, пробелы и дефисы"),

  body(
    "middle_name",
    "Поле Отчество не должно быть пустым и должно содержать только буквы русского алфавита"
  )
    .notEmpty()
    .withMessage("Отчество обязательно")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Отчество должно содержать от 2 до 50 символов")
    .bail()
    .matches(/^[А-Яа-яЁё\s\-]+$/)
    .withMessage("Отчество может содержать только русские буквы, пробелы и дефисы"),

  body(
    "birth_date", 
    "Поле Дата рождения должно быть в формате YYYY-MM-DD"
  )
    .notEmpty()
    .withMessage("Дата рождения обязательна")
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Недопустимый формат даты. Используйте формат: YYYY-MM-DD")
    .bail()
    // Проверка корректности даты
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error("Некорректная дата");
      }
      
      // Проверка, что дата соответствует формату (исключает 31 февраля и т.д.)
      const parts = value.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      const reconstructedDate = new Date(year, month - 1, day);
      if (reconstructedDate.getFullYear() !== year || 
          reconstructedDate.getMonth() + 1 !== month || 
          reconstructedDate.getDate() !== day) {
        throw new Error("Некорректная дата (например, 31 февраля)");
      }
      
      return true;
    })
    .bail()
    // Проверка, что дата не в будущем
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      
      if (birthDate > today) {
        throw new Error("Дата рождения не может быть в будущем");
      }
      
      return true;
    })
    .bail()
    // Проверка возраста (18-100 лет)
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Корректировка, если день рождения еще не наступил в этом году
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        throw new Error("Сотрудник должен быть старше 18 лет");
      }
      
      if (age > 100) {
        throw new Error("Возраст превышает 100 лет. Проверьте дату рождения");
      }
      
      return true;
    })
];

//зп с минус налогами 
const calculateSalaryWithTaxes = async (req, res) => {
  try {
    const { middle_name, first_name, last_name, birth_date } = req.body;

    console.log('Запрос расчета зарплаты с налогами:', { middle_name, first_name, last_name, birth_date });

    // Вызов пользовательской функции (валидация уже выполнена)
    const result = await pool.query(queries.callCalculateSalaryWithTaxes, [
      middle_name,
      first_name,
      last_name,
      birth_date
    ]);

    console.log('Результат расчета зарплаты:', result.rows.length, 'записей');

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Сотрудник не найден. Проверьте введенные данные.'
      });
    }

    // Форматируем ответ (остальной код без изменений)
    const salaryData = result.rows[0];
    
    // Расчеты для подробного отчета
    const grossSalary = parseFloat(salaryData.gross_salary);
    const netSalary = parseFloat(salaryData.net_salary);
    const totalCost = parseFloat(salaryData.total_cost);
    
    const taxes = {
      ndfl: {
        amount: parseFloat(salaryData.tax_ndfl),
        percent: 13,
        description: 'НДФЛ (подоходный налог)'
      },
      pension: {
        amount: parseFloat(salaryData.tax_pension),
        percent: 22,
        description: 'Пенсионные отчисления'
      },
      medical: {
        amount: parseFloat(salaryData.tax_medical),
        percent: 5.1,
        description: 'Медицинское страхование'
      },
      social: {
        amount: parseFloat(salaryData.tax_social),
        percent: 2.9,
        description: 'Социальное страхование'
      }
    };

    const totalTaxes = parseFloat(salaryData.total_taxes);
    const employerTaxes = taxes.pension.amount + taxes.medical.amount + taxes.social.amount;

    const formattedResponse = {
      status: 'success',
      employee_info: {
        employee_id: salaryData.employee_id,
        personal_number: salaryData.personal_number,
        full_name: salaryData.full_name,
        birth_date: salaryData.birth_date,
        age: salaryData.age,
        department: salaryData.department_name,
        position: salaryData.position_name,
        hire_date: salaryData.hire_date,
        experience_years: salaryData.experience_years
      },
      salary_calculation: {
        gross_salary: {
          amount: grossSalary,
          formatted: grossSalary.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          })
        },
        employee_taxes: {
          ndfl: {
            amount: taxes.ndfl.amount,
            formatted: taxes.ndfl.amount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.ndfl.percent,
            description: taxes.ndfl.description
          },
          total_employee_taxes: {
            amount: taxes.ndfl.amount,
            formatted: taxes.ndfl.amount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.ndfl.percent
          }
        },
        employer_taxes: {
          pension: {
            amount: taxes.pension.amount,
            formatted: taxes.pension.amount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.pension.percent,
            description: taxes.pension.description
          },
          medical: {
            amount: taxes.medical.amount,
            formatted: taxes.medical.amount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.medical.percent,
            description: taxes.medical.description
          },
          social: {
            amount: taxes.social.amount,
            formatted: taxes.social.amount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.social.percent,
            description: taxes.social.description
          },
          total_employer_taxes: {
            amount: employerTaxes,
            formatted: employerTaxes.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 2
            }),
            percent: taxes.pension.percent + taxes.medical.percent + taxes.social.percent
          }
        },
        net_salary: {
          amount: netSalary,
          formatted: netSalary.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          }),
          percent: 87,
          description: 'Зарплата на руки (после вычета НДФЛ)'
        },
        total_cost_for_employer: {
          amount: totalCost,
          formatted: totalCost.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          }),
          description: 'Общая стоимость для работодателя (оклад + налоги работодателя)'
        }
      },
      summary: {
        gross_salary: grossSalary,
        net_salary: netSalary,
        total_taxes: totalTaxes,
        total_cost_for_employer: totalCost,
        tax_burden_percent: ((totalTaxes / grossSalary) * 100).toFixed(2),
        effective_tax_rate: ((taxes.ndfl.amount / grossSalary) * 100).toFixed(2)
      },
      breakdown: {
        employee_receives: `${((netSalary / totalCost) * 100).toFixed(1)}% от общей стоимости`,
        taxes_total: `${((totalTaxes / totalCost) * 100).toFixed(1)}% от общей стоимости`,
        employer_costs: `${((employerTaxes / totalCost) * 100).toFixed(1)}% от общей стоимости`
      }
    };

    res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Ошибка при расчете зарплаты с налогами:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера при расчете зарплаты';
    
    if (error.message.includes('invalid input syntax for type date')) {
      errorMessage = 'Неправильный формат даты. Используйте YYYY-MM-DD';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
//отчетность по зп в отделах
const getAvgSalaryByDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { department_id: deptIdFromBody } = req.body;

    // Поддерживаем оба варианта: из параметров URL или из body
    const targetDepartmentId = department_id || deptIdFromBody;

    console.log('Запрос средней зарплаты по отделу, ID:', targetDepartmentId);

    // Проверка обязательных полей
    if (!targetDepartmentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Не указан ID отдела. Используйте параметр department_id в URL или в теле запроса.',
        examples: {
          url_param: 'GET /api/functions/avg-salary/department/1',
          body_param: 'POST /api/functions/avg-salary/department с {"department_id": 1}'
        }
      });
    }

    // Проверка что ID является числом
    if (isNaN(targetDepartmentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID отдела должен быть числом'
      });
    }

    // Получаем информацию об отделе
    const departmentInfo = await pool.query(
      'SELECT department_id, name FROM departments WHERE department_id = $1',
      [targetDepartmentId]
    );

    if (departmentInfo.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Отдел с ID ${targetDepartmentId} не найден`
      });
    }

    // Вызов скалярной функции
    const result = await pool.query(queries.callGetAvgSalaryByDepartment, [targetDepartmentId]);
    
    const avgSalary = parseFloat(result.rows[0].avg_salary);
    const departmentName = departmentInfo.rows[0].name;

    console.log(`Средняя зарплата в отделе "${departmentName}": ${avgSalary}`);

    // Получаем дополнительную статистику
    const additionalStats = await pool.query(
      `SELECT 
        COUNT(e.employee_id) as employee_count,
        MIN(ec.salary) as min_salary,
        MAX(ec.salary) as max_salary,
        SUM(ec.salary) as total_budget,
        ROUND(STDDEV(ec.salary), 2) as salary_stddev
      FROM employees e
      JOIN employment_contract ec ON e.contract_id = ec.contract_id
      WHERE e.department_id = $1 AND e.status = 'активен'`,
      [targetDepartmentId]
    );

    const stats = additionalStats.rows[0];
    const employeeCount = parseInt(stats.employee_count) || 0;

    if (employeeCount === 0) {
      return res.status(200).json({
        status: 'success',
        message: `В отделе "${departmentName}" нет активных сотрудников`,
        department: {
          id: parseInt(targetDepartmentId),
          name: departmentName
        },
        statistics: {
          employee_count: 0,
          avg_salary: 0,
          note: 'Нет данных для расчета средней зарплаты'
        }
      });
    }

    const minSalary = parseFloat(stats.min_salary) || 0;
    const maxSalary = parseFloat(stats.max_salary) || 0;
    const totalBudget = parseFloat(stats.total_budget) || 0;
    const salaryStdDev = parseFloat(stats.salary_stddev) || 0;
    
    // Определяем диапазон зарплат
    const salaryRange = maxSalary - minSalary;
    const salaryMidpoint = (minSalary + maxSalary) / 2;

    // Форматируем ответ
    const formattedResponse = {
      status: 'success',
      department: {
        id: parseInt(targetDepartmentId),
        name: departmentName
      },
      average_salary: {
        value: avgSalary,
        formatted: avgSalary.toLocaleString('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          minimumFractionDigits: 2
        }),
        currency: 'RUB',
        calculated_from: employeeCount + ' сотрудников'
      },
      salary_distribution: {
        min_salary: {
          value: minSalary,
          formatted: minSalary.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          })
        },
        max_salary: {
          value: maxSalary,
          formatted: maxSalary.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          })
        },
        salary_range: {
          value: salaryRange,
          formatted: salaryRange.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          }),
          percentage_of_avg: ((salaryRange / avgSalary) * 100).toFixed(1) + '%'
        },
        midpoint: {
          value: salaryMidpoint,
          formatted: salaryMidpoint.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          })
        },
        standard_deviation: {
          value: salaryStdDev,
          formatted: salaryStdDev.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          }),
          interpretation: salaryStdDev > (avgSalary * 0.3) 
            ? 'Высокий разброс зарплат' 
            : salaryStdDev > (avgSalary * 0.15) 
              ? 'Средний разброс зарплат' 
              : 'Низкий разброс зарплат'
        }
      },
      department_statistics: {
        employee_count: employeeCount,
        total_budget: {
          value: totalBudget,
          formatted: totalBudget.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          }),
          monthly: true
        },
        avg_salary_percent_of_max: ((avgSalary / maxSalary) * 100).toFixed(1) + '%',
        comparison_to_min: avgSalary > minSalary 
          ? `На ${((avgSalary - minSalary) / minSalary * 100).toFixed(1)}% выше минимальной`
          : 'Равна минимальной'
      },
      comparison: {
        vs_min: {
          difference: avgSalary - minSalary,
          percentage: ((avgSalary - minSalary) / minSalary * 100).toFixed(1)
        },
        vs_max: {
          difference: maxSalary - avgSalary,
          percentage: ((maxSalary - avgSalary) / avgSalary * 100).toFixed(1)
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Ошибка при получении средней зарплаты по отделу:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера при расчете средней зарплаты',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Функция для получения средней зарплаты по всем отделам
const getAvgSalaryAllDepartments = async (req, res) => {
  try {
    console.log('Запрос средней зарплаты по всем отделам');

    // Получаем список всех отделов
    const departments = await pool.query(
      'SELECT department_id, name FROM departments ORDER BY name'
    );

    if (departments.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'В системе нет отделов',
        departments: []
      });
    }

    // Для каждого отдела получаем среднюю зарплату
    const departmentSalaries = [];
    let totalAvgSalary = 0;
    let deptWithSalaries = 0;

    for (const dept of departments.rows) {
      const result = await pool.query(queries.callGetAvgSalaryByDepartment, [dept.department_id]);
      const avgSalary = parseFloat(result.rows[0].avg_salary);
      
      if (avgSalary > 0) {
        totalAvgSalary += avgSalary;
        deptWithSalaries++;
      }

      departmentSalaries.push({
        department_id: dept.department_id,
        department_name: dept.name,
        avg_salary: avgSalary,
        formatted_salary: avgSalary.toLocaleString('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          minimumFractionDigits: 2
        })
      });
    }

    // Сортируем по убыванию зарплаты
    departmentSalaries.sort((a, b) => b.avg_salary - a.avg_salary);

    const overallAvg = deptWithSalaries > 0 ? totalAvgSalary / deptWithSalaries : 0;

    res.status(200).json({
      status: 'success',
      summary: {
        total_departments: departments.rows.length,
        departments_with_salaries: deptWithSalaries,
        overall_average_salary: {
          value: overallAvg,
          formatted: overallAvg.toLocaleString('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2
          })
        }
      },
      departments: departmentSalaries,
      highest_paid_department: departmentSalaries.length > 0 ? departmentSalaries[0] : null,
      lowest_paid_department: departmentSalaries.length > 0 ? departmentSalaries[departmentSalaries.length - 1] : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ошибка при получении зарплат по всем отделам:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// Функция для обработки результатов валидации
const validateSalaryData = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'error',
      message: 'Ошибка валидации данных',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  getEmployeeInfo,
  validateGetEmployeeInfo,
  getActiveEmployees,
  getAvgSalaryByDepartment,
  getAvgSalaryAllDepartments,
  updateAllEmployeeSalaries,
  calculateSalaryWithTaxes,
  validateSalaryCalculationData,
  validateSalaryData
};