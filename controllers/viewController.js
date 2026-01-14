const pool = require("../db");
const queries = require("../queries");

// 1. Сотрудники на испытательном сроке
const getEmployeesOnProbation = async (req, res) => {
  try {
    console.log('Запрос сотрудников на испытательном сроке');
    
    const result = await pool.query(queries.getEmployeesOnProbation);
    
    console.log('Результат:', result.rows.length, 'сотрудников');

    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Нет сотрудников на испытательном сроке',
        data: []
      });
    }

    // Форматируем данные
    const employees = result.rows.map(emp => ({
      employee_id: emp.employee_id,
      personal_number: emp.personal_number,
      full_name: `${emp.last_name} ${emp.first_name} ${emp.middle_name || ''}`.trim(),
      department: emp.department_name,
      position: emp.position_name,
      hire_date: emp.hire_date,
      probation_period: emp.probation_period,
      probation_end_date: emp.probation_end_date,
      probation_status: emp.probation_status,
      days_worked: parseInt(emp.days_worked),
      // Расчет дней до окончания испытательного срока
      days_remaining: Math.max(0, Math.ceil((new Date(emp.probation_end_date) - new Date()) / (1000 * 60 * 60 * 24))),
      warning_level: emp.days_remaining <= 7 ? 'high' : emp.days_remaining <= 14 ? 'medium' : 'low'
    }));

    // Группировка по статусу
    const byStatus = employees.reduce((acc, emp) => {
      if (!acc[emp.probation_status]) acc[emp.probation_status] = [];
      acc[emp.probation_status].push(emp);
      return acc;
    }, {});

    // Сотрудники, у которых скоро заканчивается испытательный срок
    const endingSoon = employees.filter(emp => 
      emp.probation_status === 'На испытательном сроке' && emp.days_remaining <= 14
    ).sort((a, b) => a.days_remaining - b.days_remaining);

    res.status(200).json({
      status: 'success',
      summary: {
        total: employees.length,
        on_probation: (byStatus['На испытательном сроке'] || []).length,
        completed_probation: (byStatus['Испытательный срок пройден'] || []).length,
        ending_within_7_days: endingSoon.filter(e => e.days_remaining <= 7).length,
        ending_within_14_days: endingSoon.filter(e => e.days_remaining <= 14).length
      },
      data: employees,
      grouped_by_status: byStatus,
      ending_soon: endingSoon,
      statistics: {
        avg_probation_period: Math.round(employees.reduce((sum, emp) => sum + emp.probation_period, 0) / employees.length),
        avg_days_worked: Math.round(employees.reduce((sum, emp) => sum + emp.days_worked, 0) / employees.length),
        max_probation_period: Math.max(...employees.map(emp => emp.probation_period)),
        min_probation_period: Math.min(...employees.map(emp => emp.probation_period))
      }
    });
    
  } catch (error) {
    console.error('Ошибка при получении сотрудников на испытательном сроке:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// 2. Распределение зарплат по грейдам
const getSalaryGrades = async (req, res) => {
  try {
    console.log('Запрос распределения зарплат по грейдам');
    
    const { department, grade, min_salary, max_salary } = req.query;
    
    let query = 'SELECT * FROM v_salary_grades';
    const params = [];
    const conditions = [];
    
    // Фильтрация
    if (department) {
      conditions.push(`LOWER(department_name) LIKE $${params.length + 1}`);
      params.push(`%${department.toLowerCase()}%`);
    }
    
    if (grade) {
      conditions.push(`LOWER(salary_grade) LIKE $${params.length + 1}`);
      params.push(`%${grade.toLowerCase()}%`);
    }
    
    if (min_salary) {
      conditions.push(`salary >= $${params.length + 1}`);
      params.push(parseFloat(min_salary));
    }
    
    if (max_salary) {
      conditions.push(`salary <= $${params.length + 1}`);
      params.push(parseFloat(max_salary));
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY department_name, salary DESC';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Нет данных по зарплатным грейдам',
        data: []
      });
    }

    // Анализ распределения
    const employees = result.rows.map(row => ({
      personal_number: row.personal_number,
      employee_name: row.employee_name,
      department: row.department_name,
      position: row.position_name,
      salary: parseFloat(row.salary),
      salary_grade: row.salary_grade,
      deviation_from_position_avg: parseFloat(row.deviation_from_position_avg_percent),
      salary_rank_in_department: parseInt(row.salary_rank_in_department)
    }));

    // Группировка по грейдам
    const byGrade = employees.reduce((acc, emp) => {
      if (!acc[emp.salary_grade]) {
        acc[emp.salary_grade] = {
          count: 0,
          total_salary: 0,
          employees: [],
          departments: new Set()
        };
      }
      acc[emp.salary_grade].count++;
      acc[emp.salary_grade].total_salary += emp.salary;
      acc[emp.salary_grade].employees.push(emp);
      acc[emp.salary_grade].departments.add(emp.department);
      
      return acc;
    }, {});

    // Статистика по грейдам
    const gradeStats = Object.keys(byGrade).map(grade => ({
      grade,
      count: byGrade[grade].count,
      percentage: ((byGrade[grade].count / employees.length) * 100).toFixed(1),
      avg_salary: Math.round(byGrade[grade].total_salary / byGrade[grade].count),
      departments_count: byGrade[grade].departments.size,
      departments: Array.from(byGrade[grade].departments)
    })).sort((a, b) => b.count - a.count);

    // Группировка по отделам
    const byDepartment = employees.reduce((acc, emp) => {
      if (!acc[emp.department]) acc[emp.department] = [];
      acc[emp.department].push(emp);
      return acc;
    }, {});

    const departmentStats = Object.keys(byDepartment).map(dept => ({
      department: dept,
      count: byDepartment[dept].length,
      avg_salary: Math.round(byDepartment[dept].reduce((sum, emp) => sum + emp.salary, 0) / byDepartment[dept].length),
      grade_distribution: Object.keys(byGrade).filter(grade => 
        byDepartment[dept].some(emp => emp.salary_grade === grade)
      )
    }));

    res.status(200).json({
      status: 'success',
      summary: {
        total_employees: employees.length,
        total_departments: Object.keys(byDepartment).length,
        total_grades: gradeStats.length,
        avg_salary_all: Math.round(employees.reduce((sum, emp) => sum + emp.salary, 0) / employees.length),
        salary_range: {
          min: Math.min(...employees.map(emp => emp.salary)),
          max: Math.max(...employees.map(emp => emp.salary)),
          range: Math.max(...employees.map(emp => emp.salary)) - Math.min(...employees.map(emp => emp.salary))
        }
      },
      data: employees,
      statistics: {
        by_grade: gradeStats,
        by_department: departmentStats
      },
      top_earners: employees
        .filter(emp => emp.salary_rank_in_department === 1)
        .sort((a, b) => b.salary - a.salary)
        .slice(0, 10)
    });
    
  } catch (error) {
    console.error('Ошибка при получении распределения зарплат:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// 3. Дни рождения сотрудников
const getEmployeeBirthdays = async (req, res) => {
  try {
    console.log('Запрос дней рождения сотрудников');
    
    const { month, upcoming_days, department } = req.query;
    
    let query = 'SELECT * FROM v_employee_birthdays';
    const params = [];
    const conditions = [];
    
    // Фильтрация по месяцу
    if (month && !isNaN(month) && month >= 1 && month <= 12) {
      conditions.push(`EXTRACT(MONTH FROM birth_date) = $${params.length + 1}`);
      params.push(parseInt(month));
    }
    
    // Фильтрация по отделу
    if (department) {
      conditions.push(`LOWER(department_name) LIKE $${params.length + 1}`);
      params.push(`%${department.toLowerCase()}%`);
    }
    
    // Фильтрация по предстоящим дням рождения
    if (upcoming_days && !isNaN(upcoming_days)) {
      const days = parseInt(upcoming_days);
      conditions.push(`days_until_birthday <= $${params.length + 1}`);
      params.push(days);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY birth_month, birth_day';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Нет данных по дням рождения',
        data: []
      });
    }

    // Форматируем данные
    const birthdays = result.rows.map(row => ({
      employee_id: row.employee_id,
      personal_number: row.personal_number,
      full_name: `${row.last_name} ${row.first_name} ${row.middle_name || ''}`.trim(),
      department: row.department_name,
      birth_date: row.birth_date,
      birth_day: parseInt(row.birth_day),
      birth_month: parseInt(row.birth_month),
      current_age: parseInt(row.current_age),
      next_birthday: row.next_birthday,
      days_until_birthday: parseInt(row.days_until_birthday),
      hire_date: row.hire_date,
      years_in_company: parseInt(row.years_in_company),
      birthday_status: row.birthday_status,
      // Дополнительные расчеты
      //zodiac_sign: getZodiacSign(row.birth_month, row.birth_day),
      is_upcoming: row.days_until_birthday <= 30,
      milestone: row.current_age % 10 === 0 ? `Юбилей: ${row.current_age} лет` : null
    }));

    // Группировка по статусу
    const byStatus = birthdays.reduce((acc, bday) => {
      if (!acc[bday.birthday_status]) acc[bday.birthday_status] = [];
      acc[bday.birthday_status].push(bday);
      return acc;
    }, {});

    // Группировка по месяцам
    const byMonth = birthdays.reduce((acc, bday) => {
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      const monthName = monthNames[bday.birth_month - 1];
      
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(bday);
      return acc;
    }, {});

    // Сотрудники, у которых скоро день рождения (до 30 дней)
    const upcomingBirthdays = birthdays
      .filter(bday => bday.days_until_birthday <= 30 && bday.days_until_birthday > 0)
      .sort((a, b) => a.days_until_birthday - b.days_until_birthday);

    // Сегодняшние именинники
    const todayBirthdays = birthdays.filter(bday => bday.birthday_status.includes('СЕГОДНЯ'));

    // Статистика
    const monthStats = Object.keys(byMonth).map(month => ({
      month,
      count: byMonth[month].length,
      employees: byMonth[month].map(b => ({
        name: b.full_name,
        day: b.birth_day,
        age: b.current_age + 1
      }))
    }));

    res.status(200).json({
      status: 'success',
      summary: {
        total: birthdays.length,
        today_birthdays: todayBirthdays.length,
        upcoming_30_days: upcomingBirthdays.length,
        by_month: monthStats.length
      },
      data: birthdays,
      today_birthdays: todayBirthdays,
      upcoming_birthdays: upcomingBirthdays,
      by_status: byStatus,
      by_month: monthStats,
      statistics: {
        avg_age: Math.round(birthdays.reduce((sum, b) => sum + b.current_age, 0) / birthdays.length),
        youngest: Math.min(...birthdays.map(b => b.current_age)),
        oldest: Math.max(...birthdays.map(b => b.current_age))
        //common_zodiac: getMostCommonZodiac(birthdays)
      }
    });
    
  } catch (error) {
    console.error('Ошибка при получении дней рождения:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

module.exports = {
  getEmployeesOnProbation,
  getSalaryGrades,
  getEmployeeBirthdays
};