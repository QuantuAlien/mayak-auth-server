const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// Подключение к Supabase (Переменные окружения на Render)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. РЕГИСТРАЦИЯ
app.post('/register', async (req, res) => {
    const { username, salt, password_hash } = req.body;

    if (!username || !salt || !password_hash) {
        return res.status(400).json({ error: "Переданы не все криптографические данные!" });
    }

    // ИСПРАВЛЕНО:toLowerCase() вместо lower()
    const key = username.trim().toLowerCase(); 

    // Записываем данные в таблицу users в Supabase
    const { data, error } = await supabase
        .from('users')
        .insert([{ 
            username: key, 
            display_name: username, 
            salt: salt, 
            password_hash: password_hash 
        }]);

    if (error) {
        return res.status(400).json({ error: "Этот никнейм уже занят или произошла ошибка базы данных." });
    }

    res.json({ status: "success", message: "Пользователь успешно зарегистрирован!" });
});

// 2. ЗАПРОС СОЛИ (Первый шаг авторизации)
app.post('/get-salt', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Укажите имя пользователя!" });

    // ИСПРАВЛЕНО: toLowerCase()
    const key = username.trim().toLowerCase(); 

    // Ищем пользователя, чтобы отдать клиенту его уникальную соль
    const { data: user, error } = await supabase
        .from('users')
        .select('salt')
        .eq('username', key)
        .single();

    if (error || !user) {
        return res.status(400).json({ error: "Пользователь не найден." });
    }

    res.json({ status: "success", salt: user.salt });
});

// 3. ПРОВЕРКА ХЕША (Второй шаг авторизации)
app.post('/login', async (req, res) => {
    const { username, client_hash } = req.body;
    if (!username || !client_hash) return res.status(400).json({ error: "Ошибка верификации данных." });

    // ИСПРАВЛЕНО: toLowerCase()
    const key = username.trim().toLowerCase(); 

    // Запрашиваем эталонный хеш из базы
    const { data: user, error } = await supabase
        .from('users')
        .select('password_hash, display_name')
        .eq('username', key)
        .single();

    if (error || !user) {
        return res.status(400).json({ error: "Пользователь не найден." });
    }

    // Сверяем локальный хеш от игры с хешем из Supabase
    if (client_hash === user.password_hash) {
        res.json({ 
            status: "success", 
            message: "Вход выполнен успешно!", 
            display_name: user.display_name 
        });
    } else {
        res.status(400).json({ error: "Неверный пароль." });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Крипто-бэкенд запущен!'));