export default function Home() {
  return (
    <div style={{ padding: 20, fontFamily: 'Arial', textAlign: 'center' }}>
      <h1>📊 Crypto Signal AI</h1>
      <p>Bot AI menganalisa 10 koin teratas dan kirim sinyal beli/jual otomatis ke Telegram.</p>
      <p>🚀 Powered by Vercel + Telegraf + Binance + Technical Indicators</p>
      <p>⏱️ Update setiap 1 menit via cron-job</p>
      <p>🔗 Endpoint: <code>/api/sinyal</code></p>
    </div>
  );
}
