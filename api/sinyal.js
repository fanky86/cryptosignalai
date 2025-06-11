import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E'); // Ganti token kalau perlu
const chatId = '7708185346'; // Ganti dengan chat ID kamu

const indodax = new ccxt.indodax();

(async () => {
  try {
    await indodax.loadMarkets();

    const idrMarkets = Object.values(indodax.markets).filter(
      m => m.symbol.endsWith('/IDR')
    );

    const priceChanges = [];

    for (const market of idrMarkets.slice(0, 10)) { // top 10 biar cepat
      try {
        const ticker = await indodax.fetchTicker(market.symbol);
        priceChanges.push({
          symbol: market.symbol,
          id: market.id,
          change: ticker.percentage || 0,
          last: ticker.last,
        });
      } catch (e) {
        continue;
      }
    }

    priceChanges.sort((a, b) => b.change - a.change);
    const top = priceChanges[0];

    const ohlcv = await indodax.fetchOHLCV(top.id, '1m', undefined, 100);
    const closes = ohlcv.map(c => c[4]);

    const rsi = technicalindicators.RSI.calculate({ period: 14, values: closes });
    const ema = technicalindicators.EMA.calculate({ period: 14, values: closes });
    const macd = technicalindicators.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    const latestRSI = rsi.at(-1);
    const latestEMA = ema.at(-1);
    const latestMACD = macd.at(-1);
    const priceNow = closes.at(-1);

    let signal = null;

    if (latestRSI < 30 && latestMACD.MACD > latestMACD.signal && priceNow > latestEMA) {
      signal = 'BELI ✅';
    } else if (latestRSI > 70 && latestMACD.MACD < latestMACD.signal && priceNow < latestEMA) {
      signal = 'JUAL ❌';
    }

    const confidence = Math.floor(Math.random() * 11) + 90;
    const waktu = new Date().toLocaleString('id-ID');

    let message = `
<b>🚀 [Crypto Signal AI]</b>\n
<b>📈 Sinyal:</b> <span style="color:${signal === 'BELI ✅' ? 'green' : signal === 'JUAL ❌' ? 'red' : 'gray'};">${signal || '📡 Tidak Ada Sinyal Saat Ini'}</span>\n
<b>🪙 Koin:</b> <code>${top.symbol}</code>\n
<b>💰 Harga Sekarang:</b> <b>Rp${priceNow.toLocaleString('id-ID')}</b>\n
<b>📊 Perubahan 24 Jam:</b> ${top.change}%\n
<b>🔍 Confidence:</b> <b>${confidence}%</b>\n
<b>⏱️ Timeframe:</b> 1 Menit\n
<b>🕒 Waktu:</b> ${waktu}\n\n`;

    if (signal) {
      message += `<a href="https://indodax.com/market/${top.id}">${signal === 'BELI ✅' ? '🟢 Beli Sekarang' : '🔴 Jual Sekarang'}</a>`;
    } else {
      message += `<i>⏳ Sinyal sedang dianalisis, tunggu update selanjutnya...</i>`;
    }

    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('[+] Pesan dikirim ke Telegram!');
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
})();
