require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const db = new sqlite3.Database('./game.db');

// Создаём таблицы
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    telegram_id TEXT UNIQUE,
    name TEXT,
    money INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_income_time INTEGER DEFAULT 0
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    price INTEGER,
    income INTEGER
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS player_businesses (
    id INTEGER PRIMARY KEY,
    player_id INTEGER,
    business_name TEXT,
    quantity INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(id)
  )`);
});

// Бизнесы
const businesses = [
  { id: 1, name: '🚚 Киоск', price: 100, income: 10 },
  { id: 2, name: '☕ Кафе', price: 500, income: 50 },
  { id: 3, name: '🛒 Магазин', price: 1000, income: 120 },
  { id: 4, name: '🏭 Завод', price: 5000, income: 700 },
  { id: 5, name: '🏢 Офис', price: 15000, income: 2500 },
];

// Заполняем бизнесы
businesses.forEach(biz => {
  db.run('INSERT OR IGNORE INTO businesses (id, name, price, income) VALUES (?, ?, ?, ?)', 
    [biz.id, biz.name, biz.price, biz.income]);
});

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name;
  
  db.run('INSERT OR IGNORE INTO players (telegram_id, name) VALUES (?, ?)', [chatId, name]);
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '💼 Работать', callback_data: 'work' }],
      [{ text: '🏪 Бизнесы', callback_data: 'businesses' }],
      [{ text: '💰 Баланс', callback_data: 'balance' }],
      [{ text: '🎮 Открыть игру', web_app: { url: 'https://tubular-monstera-e9d3e5.netlify.app' } }]
    ]
  };
  
  bot.sendMessage(chatId, `Привет ${name}!`, { reply_markup: keyboard });
});

// Обработка кнопок
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  
  switch(query.data) {
    case 'work':
      const income = Math.floor(Math.random() * 30) + 10;
      db.run('UPDATE players SET money = money + ? WHERE telegram_id = ?', [income, chatId]);
      bot.sendMessage(chatId, `💼 Заработано: $${income}!`);
      break;
      
    case 'balance':
      db.get('SELECT money, level FROM players WHERE telegram_id = ?', [chatId], (err, row) => {
        bot.sendMessage(chatId, `💰 Баланс: $${row?.money || 0}\n📈 Уровень: ${row?.level || 1}`);
      });
      break;
      
    case 'businesses':
      let msg = '🏪 Бизнесы:\n\n';
      businesses.forEach(biz => {
        msg += `${biz.name}\nЦена: $${biz.price}\nДоход: $${biz.income}/час\n\n`;
      });
      bot.sendMessage(chatId, msg);
      break;
  }
});

console.log('🤖 Бот запущен!');
