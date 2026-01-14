// Запросы
const getCooperator = "SELECT * FROM employees";
const getCooperatorById = "SELECT * FROM employees WHERE employee_id = $1";

// Процедуры
const callAddEmployee = `
  CALL add_employee(
    $1::VARCHAR(20),      -- p_personal_number
    $2::VARCHAR(50),      -- p_middle_name
    $3::VARCHAR(50),      -- p_first_name
    $4::VARCHAR(50),      -- p_last_name
    $5::DATE,             -- p_birth_date
    $6::VARCHAR(10),      -- p_passport
    $7::VARCHAR(12),      -- p_inn
    $8::VARCHAR(14),      -- p_snils
    $9::VARCHAR(100),     -- p_address
    $10::VARCHAR(11),     -- p_phone_number
    $11::INTEGER,         -- p_department_id
    $12::INTEGER,         -- p_position_id
    $13::VARCHAR(100),    -- p_education
    $14::VARCHAR(50),     -- p_diplom_num
    $15::DATE,            -- p_finish_year
    $16::DATE,            -- p_hire_date
    $17::NUMERIC,         -- p_salary
    $18::NUMERIC,         -- p_probation_period
    NULL::INTEGER,        -- p_employee_id (OUT)
    NULL::VARCHAR(10),    -- p_status (OUT)
    NULL::VARCHAR(255)    -- p_message (OUT)
  )
`;

// Процедура удаления отдела с переводом сотрудников
const callDeleteDepartment = `
  CALL delete_department_with_transfer(
    $1::INTEGER,
    $2::INTEGER, 
    $3::VARCHAR(100),    -- Соответствует IN p_reason VARCHAR(100)
    NULL::VARCHAR(50),   -- Соответствует OUT p_status VARCHAR(50)
    NULL::VARCHAR(200)   -- Соответствует OUT p_message VARCHAR(200)
  )
`;
//проц удаления сотрудника
const callDismissEmployeeCall = `
  CALL dismiss_specific_employee(
    $1::VARCHAR(50),
    $2::VARCHAR(50),
    $3::VARCHAR(50),
    $4::VARCHAR(50),
    $5::VARCHAR(50),
    $6::VARCHAR(255),
    NULL::VARCHAR(10),
    NULL::VARCHAR(255)
  )
`;

const callGetSalaryAnalysis = 'SELECT * FROM get_salary_analysis_wrapper_enhanced()';

const callGetEmployeeInfo = 'SELECT * FROM func_get_employee_info($1, $2, $3)';

const callGetActiveEmployees = 'SELECT * FROM get_active_employees()';

const callUpdateAllEmployeeSalaries = 'SELECT * FROM func_update_all_employee_salaries()';

const callCalculateSalaryWithTaxes = 'SELECT * FROM func_calculate_salary_with_taxes_by_fio($1, $2, $3, $4)';

const callGetAvgSalaryByDepartment = 'SELECT get_avg_salary_by_department($1) as avg_salary';

//предстваления
const getEmployeesOnProbation = 'SELECT * FROM v_employees_on_probation';
const getSalaryGrades = 'SELECT * FROM v_salary_grades';
const getEmployeeBirthdays = 'SELECT * FROM v_employee_birthdays';

module.exports = {
  getCooperator,
  getCooperatorById,
  callAddEmployee,
  callDeleteDepartment,
  callDismissEmployeeCall,
  callGetSalaryAnalysis,
  callGetEmployeeInfo,
  callGetActiveEmployees,
  callUpdateAllEmployeeSalaries,
  callCalculateSalaryWithTaxes,
  callGetAvgSalaryByDepartment,
  getEmployeesOnProbation,
  getSalaryGrades,
  getEmployeeBirthdays

};