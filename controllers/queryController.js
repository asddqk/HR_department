//имопрт пула БД
const pool = require("../db");
const queries = require("../queries");

//выборка всех записей из таблицы Coopertor
const getCooperator = (req, res) => {
  pool.query(queries.getCooperator, (error, results) => {
    if (error) throw error;
    res.status(200).json(results.rows); // если нет ошибки, то вернется статус 200
  });
};

//поиск записи по значению id
const getCooperatorById = (req, res) => {
  const id = parseInt(req.params.id); //получение значения Id
  pool.query(queries.getCooperatorById, [id], (error, results) => {
    // запрос к БД по полученному Id
    if (error) throw error;
    res.status(200).json(results.rows); //если статус вернулся 200 тогда получить результат в формате json
  });
};

// экспортируем модуль как объект, в котором будет несколько функций
module.exports = {
  getCooperator,
  getCooperatorById
};
