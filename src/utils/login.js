// login.js
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // 👉 install this: npm install input


const apiId =28615980;
const apiHash ="a3a8a519080b7b0e973247e96b90fc6c";

(async () => {
  console.log(  "🚀 Starting Telegram login...");

  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 10,
  });

  await client.start({
    phoneNumber: async () => await input.text("📱 Enter your phone number with country code: "),
    password: async () => await input.text("🔑 Enter your 2FA password (if set): "),
    phoneCode: async () => await input.text("📩 Enter the code you received: "),
    onError: (err) => console.log("❌ Error:", err),
  });

  console.log("\n✅ Login successful!");
  console.log("🔐 Copy the session string below into your .env file as TG_SESSION:\n");
  console.log(client.session.save());
  console.log("\n⚠️ Keep this string secret! Anyone with it can access your account.\n");

  process.exit();
})();
