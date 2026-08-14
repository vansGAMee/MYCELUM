# Развёртывание на Vercel

1. Отправьте репозиторий на GitHub.
2. Импортируйте его в Vercel.
3. Оставьте автоматическое определение Next.js и команду `npm run build`.
4. Для одиночной игры переменные окружения не нужны. Для надёжной онлайн-игры между разными сетями добавьте TURN по инструкции ниже.
5. Нажмите Deploy.

База данных, авторизация и собственный серверный API не требуются. Игра и локальные сохранения полностью работают в браузере.

## TURN для онлайн-дуэлей

Рекомендуемый вариант — Metered TURN с отдельным credential API key, который разрешено использовать во фронтенде. Никогда не публикуйте Metered Secret Key.

1. Создайте аккаунт в [Metered](https://dashboard.metered.ca/signup) и TURN credential.
2. У credential нажмите **Show API Key**, затем составьте или скопируйте браузерный URL вида:

   ```text
   https://YOUR-APP.metered.live/api/v1/turn/credentials?apiKey=YOUR_CREDENTIAL_API_KEY
   ```

3. В Vercel откройте **Project → Settings → Environment Variables** и добавьте:

   ```text
   NEXT_PUBLIC_METERED_TURN_CREDENTIALS_URL=<полный URL из шага 2>
   ```

4. Выберите Production, Preview и Development при необходимости, сохраните переменную и выполните Redeploy. Значения `NEXT_PUBLIC_*` встраиваются во время сборки, поэтому без новой сборки настройка не применится.

Альтернатива для собственного статического TURN — заполнить все три переменные из `.env.example`: `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`. В этом режиме Trystero сохраняет штатные STUN-серверы и использует TURN только при необходимости.

Без TURN онлайн продолжит пробовать прямое P2P-соединение, но некоторые пары сетей с жёстким NAT или VPN не смогут установить канал.
