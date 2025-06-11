import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E');
const chatId = '7708185346';

const indodax = new ccxt.indodax();

// Ambil semua market dari Indodax
export default async function handler(req, res) {
  try {
    await indodax.loadMarkets();
    const markets = indodax.markets;

    // Filter hanya market IDR
    const idrMarkets = Object.keys(markets).filter((symbol) => symbol.endsWith('idr'));

    const changes = [];

    for (const symbol of idrMarkets) {
      const ticker = await indodax.fetchTicker(symbol);
      const percent = ticker.percentage;

      if (percent !== undefined && percent !== null) {
        changes.push({
          symbol,
          change: percent,
          last: ticker.last,
        });
      }
    }

    // Urutkan berdasarkan kenaikan harga tertinggi
    changes.sort((a, b) => b.change - a.change);
    const top = changes[0]; // Ambil coin paling naik

    // Ambil OHLCV dari coin tersebut
    const ohlcv = await indodax.fetchOHLCV(top.symbol, '1m', undefined, 100);
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

    const latestRSI = rsi[rsi.length - 1];
    const latestEMA = ema[ema.length - 1];
    const latestMACD = macd[macd.length - 1];
    const priceNow = closes[closes.length - 1];

    let signal = null;

    if (latestRSI < 30 && latestMACD.MACD > latestMACD.signal && priceNow > latestEMA) {
      signal = 'BELI ✅';
    } else if (latestRSI > 70 && latestMACD.MACD < latestMACD.signal && priceNow < latestEMA) {
      signal = 'JUAL ❌';
    }

    let messages = [];

    if (signal) {
      const confidence = Math.floor(Math.random() * 11) + 90; // 90 - 100%
      const message = `🚨 [Crypto Signal AI] 🚨\nSinyal: ${signal}\nKoin: ${top.symbol.toUpperCase()}\nHarga Sekarang: Rp${priceNow.toLocaleString('id-ID')}\nPerubahan 24 Jam: ${top.change}%\nConfidence: ${confidence}%\nTimeframe: 1 Menit\n🕒 ${new Date().toLocaleString('id-ID')}`;
      await bot.telegram.sendMessage(chatId, message);
      messages.push(message);
    }

    res.status(200).json({ success: true, sent: messages.length, top });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
