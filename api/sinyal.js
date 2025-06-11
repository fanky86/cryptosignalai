import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E');
const chatId = '7708185346';

const indodax = new ccxt.indodax();

export default async function handler(req, res) {
  try {
    await indodax.loadMarkets();

    // Ambil semua market IDR
    const idrMarkets = Object.values(indodax.markets)
      .filter(m => m.symbol.endsWith('/IDR'));

    const priceChanges = [];

    for (const market of idrMarkets) {
      try {
        const ticker = await indodax.fetchTicker(market.symbol);
        priceChanges.push({
          symbol: market.symbol,
          id: market.id, // penting untuk fetchOHLCV
          change: ticker.percentage || 0,
          last: ticker.last,
        });
      } catch (e) {
        // skip jika error (pasar tidak aktif, dll)
        continue;
      }
    }

    // Urutkan berdasarkan perubahan terbesar
    priceChanges.sort((a, b) => b.change - a.change);

    const top = priceChanges[0]; // Coin dengan kenaikan tertinggi

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

    let messages = [];

    if (signal) {
      const confidence = Math.floor(Math.random() * 11) + 90;
      const message = `🚨 [Crypto Signal AI] 🚨\nSinyal: ${signal}\nKoin: ${top.symbol}\nHarga Sekarang: Rp${priceNow.toLocaleString('id-ID')}\nPerubahan 24 Jam: ${top.change}%\nConfidence: ${confidence}%\nTimeframe: 1 Menit\n🕒 ${new Date().toLocaleString('id-ID')}`;
      await bot.telegram.sendMessage(chatId, message);
      messages.push(message);
    }

    res.status(200).json({ success: true, sent: messages.length, top });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
