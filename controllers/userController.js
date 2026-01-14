const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const secretKey = process.env.secretKey; // получение значения secretKey из файла .env

//extended: true означает, что req.body может содержать любые значения, extended: false - только строки.
//urlencoded({ extended: true })); //обрабатывает данные формы и добавляет их в объект req.body
const urlencodedParser = express.urlencoded({ extended: true }); //создадим отдельный экземпляр urlencodedParser для обработки данных из формы внутри функции getLogin

// Аутентификация пользователя
//не забудьте использовать async/await при выполнении асинхронных операций, таких как запрос к базе данных
const getLogin = async (req, res) => {
  // применим парсер для обработки данных из формы
  urlencodedParser(req, res, async () => {
    //const { username, password } = req.body;
    let username = req.body.username;
    let password = req.body.password;

    try {
      const result = await pool.query(
        "SELECT * FROM user_cooperator WHERE username = $1",
        [username]
      );
      const user = result.rows[0];

      if (!user) {
        console.warn(`Неудачная попытка входа для пользователя: ${username}`);
        return res
          .status(401)
          .json({ message: "Пользователь не найден или неверный пароль" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        console.warn(`Неверный пароль для пользователя: ${username}`);
        return res
          .status(401)
          .json({ message: "Пользователь не найден или неверный пароль" });
      }

      // Если успешная аутентификация
      // Генерация JWT токена и добавление его срока действия через  параметр expiresIn равному 2 часа
      const token = jwt.sign({ userId: user.id }, secretKey, {
        expiresIn: "2h",
      });

      // Сохраняем токен в cookie на 2 часа, maxAge задается в миллисекундах
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 2 * 60 * 60 * 1000,
        sameSite: "None",
        secure: true,
      });

      // Сохраняем в cookie также имя пользователя на 2 часа
      res.cookie("username", username, {
        maxAge: 2 * 60 * 60 * 1000,
        sameSite: "None",
        secure: true,
      });

      // Перенаправление на домашнюю страницу
      res.redirect("/home");
    } catch (error) {
      console.error("Ошибка при аутентификации", error);
      res.status(500).send("Ошибка при аутентификации");
    }
  });
};

const getRedirectHome = async (req, res) => {
  // Проверяем наличие cookie с токеном и именем пользователя
  if (req.cookies && req.cookies.token && req.cookies.username) {
    const user = req.cookies.username; // Извлекаем имя пользователя из cookie
    res.send(`С возвращением, ${user}!`);
  } else {
    res.send("Пожалуйста, войдите в систему, чтобы просмотреть эту страницу!");
  }
};

// экспортируем модуль как объект, в котором будет несколько функций
module.exports = {
  getLogin,
  getRedirectHome,
};
