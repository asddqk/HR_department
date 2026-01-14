// server.js - С ШИРОКОЙ ПЛАШКОЙ И ВАЛИДАЦИЕЙ
require("dotenv").config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

// Импортируем роутеры
let queryRouter, procedureRouter, functionRouter, viewRouter;
try {
    queryRouter = require('./routes/queryRouter'); 
    procedureRouter = require("./routes/procedureRouter");
    functionRouter = require('./routes/functionRouter');
    viewRouter = require('./routes/viewRouter');
} catch (err) {
    console.log('Некоторые роутеры не найдены:', err.message);
}

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static('public'));

// ============ ФОРМА ВХОДА С ВАЛИДАЦИЕЙ ============

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Вход в систему</title>
            <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                
                .login-container {
                    width: 100%;
                    max-width: 450px;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    backdrop-filter: blur(10px);
                }
                
                h1 {
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                    font-size: 28px;
                    font-weight: 600;
                }
                
                .form-group {
                    margin-bottom: 25px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: #555;
                    font-weight: 500;
                }
                
                .input-wrapper {
                    position: relative;
                }
                
                .input-wrapper i {
                    position: absolute;
                    left: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #667eea;
                }
                
                .form-group input {
                    width: 100%;
                    padding: 15px 15px 15px 45px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: all 0.3s;
                    box-sizing: border-box;
                }
                
                .form-group input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                
                .form-group input.invalid {
                    border-color: #ff4757;
                    background-color: #fff8f8;
                }
                
                .hint {
                    display: block;
                    font-size: 12px;
                    color: #6c757d;
                    margin-top: 5px;
                    margin-left: 5px;
                }
                
                .submit-btn {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-top: 10px;
                    box-sizing: border-box;
                }
                
                .submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
                
                .submit-btn:active {
                    transform: translateY(0);
                }
                
                /* Широкая плашка для ошибок */
                .error-container {
                    width: 100%;
                    margin-top: 25px;
                }
                
                .error-message {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    animation: slideIn 0.5s ease;
                    box-shadow: 0 5px 15px rgba(255, 107, 107, 0.2);
                    border-left: 5px solid #ff4757;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                .error-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }
                
                .error-text {
                    flex: 1;
                }
                
                .error-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .error-desc {
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .success-message {
                    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    margin-top: 25px;
                    animation: slideIn 0.5s ease;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .validation-info {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #6c757d;
                    border-left: 4px solid #3498db;
                }
                
                .validation-info ul {
                    margin: 8px 0;
                    padding-left: 20px;
                }
                
                .validation-info li {
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1><i class="fas fa-sign-in-alt"></i> Вход в систему</h1>
                
                <form id="loginForm">
                    <div class="form-group">
                        <label for="username">Логин</label>
                        <div class="input-wrapper">
                            <i class="fas fa-user"></i>
                            <input type="text" id="username" name="username" 
                                   placeholder="Введите логин" required>
                        </div>
                        <span class="hint">Только английские буквы (например: john, olga)</span>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Пароль</label>
                        <div class="input-wrapper">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="password" name="password" 
                                   placeholder="Введите пароль" required>
                        </div>
                        <span class="hint">Английские буквы и цифры, минимум 5 символов</span>
                    </div>
                    
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-sign-in-alt"></i> Войти
                    </button>
                </form>
                
                <div class="error-container" id="errorContainer"></div>
                <div class="success-message" id="successMessage" style="display: none;"></div>
                
                <div class="validation-info">
                    <strong>Требования к данным:</strong>
                    <ul>
                        <li>Логин: только английские буквы</li>
                        <li>Пароль: английские буквы и цифры, минимум 5 символов</li>
                        <li>Примеры: john, user123, admin, password123</li>
                    </ul>
                </div>
            </div>
            
            <script>
                const form = document.getElementById('loginForm');
                const errorContainer = document.getElementById('errorContainer');
                const successMessage = document.getElementById('successMessage');
                const usernameInput = document.getElementById('username');
                const passwordInput = document.getElementById('password');
                
                // Регулярные выражения для валидации
                const usernameRegex = /^[a-zA-Z]+$/;
                const passwordRegex = /^[a-zA-Z0-9]+$/;
                
                // Валидация при вводе
                usernameInput.addEventListener('input', validateUsername);
                passwordInput.addEventListener('input', validatePassword);
                
                function validateUsername() {
                    const value = usernameInput.value.trim();
                    
                    if (value === '') {
                        usernameInput.classList.remove('invalid');
                        return true;
                    }
                    
                    if (!usernameRegex.test(value)) {
                        usernameInput.classList.add('invalid');
                        return false;
                    } else {
                        usernameInput.classList.remove('invalid');
                        return true;
                    }
                }
                
                function validatePassword() {
                    const value = passwordInput.value;
                    
                    if (value === '') {
                        passwordInput.classList.remove('invalid');
                        return true;
                    }
                    
                    if (value.length < 5) {
                        passwordInput.classList.add('invalid');
                        return false;
                    }
                    
                    if (!passwordRegex.test(value)) {
                        passwordInput.classList.add('invalid');
                        return false;
                    } else {
                        passwordInput.classList.remove('invalid');
                        return true;
                    }
                }
                
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // Скрываем предыдущие сообщения
                    errorContainer.innerHTML = '';
                    successMessage.style.display = 'none';
                    
                    // Проверка валидации
                    const isUsernameValid = validateUsername();
                    const isPasswordValid = validatePassword();
                    
                    if (!isUsernameValid || !isPasswordValid) {
                        showError('Пожалуйста, проверьте введенные данные');
                        return;
                    }
                    
                    const formData = {
                        username: usernameInput.value.trim(),
                        password: passwordInput.value
                    };
                    
                    // Дополнительная проверка перед отправкой
                    if (formData.username === '') {
                        showError('Введите логин');
                        return;
                    }
                    
                    if (formData.password === '') {
                        showError('Введите пароль');
                        return;
                    }
                    
                    if (formData.password.length < 5) {
                        showError('Пароль должен содержать минимум 5 символов');
                        return;
                    }
                    
                    // Показываем сообщение о загрузке
                    showLoading();
                    
                    try {
                        const response = await fetch('/user/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(formData)
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            showSuccess('Вход выполнен успешно! Перенаправление...');
                            // Перенаправление через 1 секунду
                            setTimeout(() => {
                                window.location.href = '/welcome?username=' + encodeURIComponent(data.user.username);
                            }, 1000);
                        } else {
                            showError(data.message);
                        }
                    } catch (error) {
                        showError('Ошибка соединения с сервером');
                    }
                });
                
                function showError(message) {
                    errorContainer.innerHTML = \`
                        <div class="error-message">
                            <div class="error-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="error-text">
                                <div class="error-title">Ошибка авторизации</div>
                                <div class="error-desc">\${message}</div>
                            </div>
                        </div>
                    \`;
                }
                
                function showSuccess(message) {
                    successMessage.textContent = message;
                    successMessage.style.display = 'block';
                    errorContainer.innerHTML = '';
                }
                
                function showLoading() {
                    errorContainer.innerHTML = \`
                        <div class="error-message" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); border-left-color: #2980b9;">
                            <div class="error-icon">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <div class="error-text">
                                <div class="error-title">Проверка данных</div>
                                <div class="error-desc">Идет проверка введенных данных...</div>
                            </div>
                        </div>
                    \`;
                }
                
                // Автофокус на поле логина
                usernameInput.focus();
            </script>
        </body>
        </html>
    `);
});

// ============ СТРАНИЦА ПРИВЕТСТВИЯ ============

app.get('/welcome', (req, res) => {
    const username = req.query.username || 'Пользователь';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Добро пожаловать</title>
            <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .welcome-container {
                    max-width: 500px;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 50px 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    text-align: center;
                    backdrop-filter: blur(10px);
                }
                h1 {
                    color: #333;
                    margin-bottom: 30px;
                    font-size: 28px;
                    font-weight: 600;
                }
                .welcome-message {
                    font-size: 32px;
                    color: #2c3e50;
                    margin: 30px 0;
                    padding: 20px;
                    line-height: 1.4;
                }
                .user-name {
                    color: #e74c3c;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                .success-icon {
                    font-size: 60px;
                    color: #2ecc71;
                    margin-bottom: 20px;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .info-box {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-radius: 10px;
                    border-left: 5px solid #3498db;
                    text-align: left;
                    font-size: 15px;
                }
                .info-item {
                    margin: 8px 0;
                    color: #555;
                }
                .back-link {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                .back-link a {
                    color: #3498db;
                    text-decoration: none;
                    font-size: 16px;
                    transition: color 0.3s;
                }
                .back-link a:hover {
                    color: #2980b9;
                    text-decoration: underline;
                }
                .back-link i {
                    margin-right: 8px;
                }
                .timestamp {
                    font-size: 14px;
                    color: #7f8c8d;
                    margin-top: 5px;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="welcome-container">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                
                <h1>Авторизация успешна</h1>
                
                <div class="welcome-message">
                    С возвращением, <span class="user-name">${username}</span>!
                </div>
                
                <div class="info-box">
                    <div class="info-item">
                        <i class="fas fa-user-circle"></i> <strong>Пользователь:</strong> ${username}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-check"></i> <strong>Статус:</strong> Успешная авторизация
                    </div>
                    <div class="info-item">
                        <i class="fas fa-shield-alt"></i> <strong>Безопасность:</strong> Сессия защищена
                    </div>
                </div>
                
                <div class="timestamp">
                    <i class="fas fa-clock"></i> Вход выполнен: ${new Date().toLocaleString('ru-RU')}
                </div>
                
                <div class="back-link">
                    <a href="/"><i class="fas fa-sign-in-alt"></i>Вернуться к форме входа</a>
                </div>
            </div>
            
            <script>
                console.log('Авторизация успешна. Добро пожаловать, ${username}!');
            </script>
        </body>
        </html>
    `);
});

// ============ API ДЛЯ ВХОДА С СЕРВЕРНОЙ ВАЛИДАЦИЕЙ ============

app.post('/user/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Попытка входа: Логин=${username}`);
    
    // Серверная валидация
    const usernameRegex = /^[a-zA-Z]+$/;
    const passwordRegex = /^[a-zA-Z0-9]+$/;
    
    // Валидация логина
    if (!username || username.trim() === '') {
        return res.status(400).json({ 
            message: 'Введите логин'
        });
    }
    
    if (!usernameRegex.test(username.trim())) {
        return res.status(400).json({ 
            message: 'Логин должен содержать только английские буквы'
        });
    }
    
    // Валидация пароля
    if (!password || password === '') {
        return res.status(400).json({ 
            message: 'Введите пароль'
        });
    }
    
    if (password.length < 5) {
        return res.status(400).json({ 
            message: 'Пароль должен содержать минимум 5 символов'
        });
    }
    
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            message: 'Пароль должен содержать только английские буквы и цифры'
        });
    }
    
    try {
        const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
        const result = await pool.query(query, [username.trim(), password]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('Пользователь найден:', user.username);
            
            res.json({ 
                message: 'Вход выполнен успешно',
                user: { 
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } else {
            console.log('Неверные данные: пользователь не найден');
            res.status(401).json({ 
                message: 'Неверное имя пользователя или пароль'
            });
        }
    } catch (error) {
        console.error('Ошибка при выполнении SQL-запроса:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при подключении к базе данных'
        });
    }
});

// ============ ОСТАЛЬНЫЙ КОД БЕЗ ИЗМЕНЕНИЙ ============

if (queryRouter) {
    app.use('/api/query', queryRouter);
    console.log('Query router подключен');
}

if (procedureRouter) {
    app.use('/api/procedures', procedureRouter);
    console.log('Procedure router подключен');
}

if (functionRouter) {
    app.use('/api/functions', functionRouter);
    console.log('Function router подключен');
}

if (viewRouter) {
    app.use('/api/views', viewRouter);
    console.log('View router подключен');
}

// Полная API документация
app.get('/api', (req, res) => {
    const endpoints = {
        status: 'success',
        message: 'API системы управления персоналом',
        endpoints: {
            auth: {
                login: 'POST /user/login'
            },
            pages: {
                login: 'GET /',
                welcome: 'GET /welcome?username=ИМЯ'
            }
        }
    };
    
    if (queryRouter) endpoints.endpoints.query = 'POST /api/query/*';
    if (procedureRouter) endpoints.endpoints.procedures = 'POST /api/procedures/*';
    if (functionRouter) endpoints.endpoints.functions = 'POST /api/functions/*';
    if (viewRouter) endpoints.endpoints.views = 'POST /api/views/*';
    
    res.json(endpoints);
});

// Резервный маршрут для функций
app.post('/api/functions/calculate-salary', async (req, res) => {
    const { last_name, first_name, middle_name, birth_date } = req.body;
    
    console.log('Запрос calculate-salary:', { last_name, first_name });
    
    if (!last_name || !first_name || !birth_date) {
        return res.status(400).json({
            status: 'error',
            message: 'Необходимые поля: last_name, first_name, birth_date'
        });
    }
    
    try {
        const result = await pool.query(
            'SELECT * FROM calculate_employee_salary($1, $2, $3, $4)',
            [last_name, first_name, middle_name, birth_date]
        );
        
        if (result.rows.length > 0) {
            res.json({
                status: 'success',
                message: 'Зарплата успешно рассчитана',
                data: result.rows[0]
            });
        } else {
            res.status(404).json({
                status: 'error', 
                message: 'Функция не вернула результат'
            });
        }
    } catch (error) {
        console.error('Ошибка при вызове функции:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка при расчете зарплаты',
            error: error.message
        });
    }
});

// ============ ОБРАБОТКА ОШИБОК ============

app.use((req, res) => {
    const availableRoutes = [
        'GET / - форма входа',
        'GET /welcome - страница приветствия',
        'GET /api - документация API',
        'POST /user/login - вход',
        'POST /api/functions/calculate-salary - расчет зарплаты'
    ];
    
    if (functionRouter) availableRoutes.push('POST /api/functions/* - функции БД');
    if (procedureRouter) availableRoutes.push('POST /api/procedures/* - процедуры БД');
    if (queryRouter) availableRoutes.push('POST /api/query/* - запросы');
    if (viewRouter) availableRoutes.push('POST /api/views/* - представления');
    
    res.status(404).json({ 
        status: 'error',
        message: 'Маршрут не найден',
        available_routes: availableRoutes
    });
});

// ============ ЗАПУСК СЕРВЕРА ============

const port = 8080;

app.listen(port, () => {
    console.log(`СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${port}`);
    console.log(`\nВЕБ-ИНТЕРФЕЙС:`);
    console.log(`   • Форма входа:        http://localhost:${port}`);
    console.log(`   • Страница приветствия: http://localhost:${port}/welcome?username=ИМЯ`);
});