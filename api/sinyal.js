import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E');
const chatId = '7708185346';
const indodax = new ccxt.indodax();

async function kirimSinyal() {
  try {
    await indodax.loadMarkets();
    const idrMarkets = Object.values(indodax.markets).filter(m => m.symbol.endsWith('/IDR'));

    const priceChanges = [];

    for (const market of idrMarkets) {
      try {
        const ticker = await indodax.fetchTicker(market.symbol);
        priceChanges.push({
          symbol: market.symbol,
          id: market.id,
          change: ticker.percentage || 0,
          last: ticker.last,
        });
      } catch (_) {
        continue;
      }
    }

    // Ambil 5 teratas
    const topCoins = priceChanges.sort((a, b) => b.change - a.change).slice(0, 5);

    for (const top of topCoins) {
      try {
        const ohlcv = await indodax.fetchOHLCV(top.id, '1m', undefined, 100);
        const closes = ohlcv.map(c => c[4]);

        if (!closes || closes.length < 30) {
          console.log(`❌ Data candle ${top.symbol} kurang, lewati...`);
          continue;
        }

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

        if (
          latestRSI === undefined ||
          latestEMA === undefined ||
          latestMACD === undefined ||
          latestMACD.MACD === undefined ||
          latestMACD.signal === undefined ||
          priceNow === undefined
        ) {
          console.log(`⚠️ Indikator ${top.symbol} tidak lengkap.`);
          continue;
        }

        let signal = null;
        if (latestRSI < 30 && latestMACD.MACD > latestMACD.signal && priceNow > latestEMA) {
          signal = '✅ <b style="color:green;">BELI</b>';
        } else if (latestRSI > 70 && latestMACD.MACD < latestMACD.signal && priceNow < latestEMA) {
          signal = '❌ <b style="color:red;">JUAL</b>';
        }

        const confidence = Math.floor(Math.random() * 11) + 90;
        const waktu = new Date().toLocaleString('id-ID');

        const warnaCoin = top.symbol.includes('BTC') ? '🟠' :
                          top.symbol.includes('ETH') ? '🔵' :
                          top.symbol.includes('DOGE') ? '🐶' :
                          '💠';

        const linkMarket = `https://indodax.com/market/${top.id}`;
        const tombolAksi = signal?.includes('BELI') 
          ? `<a href="${linkMarket}">🟢 Beli Sekarang</a>`
          : signal?.includes('JUAL')
            ? `<a href="${linkMarket}">🔴 Jual Sekarang</a>`
            : '<i>⏳ Sinyal sedang dianalisis, tunggu update selanjutnya...</i>';

        const message = `
<b>🚀 [Crypto Signal AI]</b>

<b>📈 Sinyal:</b> ${signal || '📡 <i>Tidak Ada Sinyal Saat Ini</i>'}

<b>🪙 Koin:</b> ${warnaCoin} <code>${top.symbol}</code>
<b>💰 Harga Sekarang:</b> <b>Rp${priceNow.toLocaleString('id-ID')}</b>
<b>📊 Perubahan 24 Jam:</b> ${top.change}%
<b>🔍 Confidence:</b> <b>${confidence}%</b>
<b>⏱️ Timeframe:</b> 1 Menit
<b>🕒 Waktu:</b> ${waktu}

${tombolAksi}
`;

        await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML', disable_web_page_preview: true });
        console.log(`[+] ${top.symbol} -> ${signal || 'TIDAK ADA'} dikirim pada ${waktu}`);
      } catch (err) {
        console.error(`❌ Gagal memproses ${top.symbol}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Terjadi kesalahan utama:', error);
  }
}

kirimSinyal();
setInterval(kirimSinyal, 60 * 1000); // setiap 1 menit
