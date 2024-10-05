import { OhlcvArrayCmc, OhlcvArrayGecko } from '../types/ohlcv.types';

function formatPositivePriceValue(priceChangeRounded: number) {
  return priceChangeRounded > 999 ? '+999' : `+${priceChangeRounded}`;
}

export function calcPriceChange(
  ohlcv: OhlcvArrayCmc | OhlcvArrayGecko,
  timestampSinceCulcPriceChange: number | null,
  isFromGeckoApi: boolean,
) {
  let startingBarPrice;
  const finalBar = isFromGeckoApi ? ohlcv[0] : ohlcv[ohlcv.length - 1];
  const finalBarPrice = isFromGeckoApi
    ? (ohlcv as OhlcvArrayGecko)[0][4]
    : finalBar.close;

  if (timestampSinceCulcPriceChange) {
    if (isFromGeckoApi) {
      const startingBar = (ohlcv as OhlcvArrayGecko).reduce(
        (savedClosestBar, potentialClosestBar) => {
          if (potentialClosestBar[0] > timestampSinceCulcPriceChange) {
            if (
              // Check if current bar is closer to timestampSinceCulcPriceChange than the best match found so far
              potentialClosestBar[0] - timestampSinceCulcPriceChange < // Potential best match
              savedClosestBar[0] - timestampSinceCulcPriceChange // Saved best match
            )
              return potentialClosestBar;
          }

          return savedClosestBar; // Saved best match
        },
        finalBar,
      );

      startingBarPrice = startingBar[1];
    } else {
      const startingBar = (ohlcv as OhlcvArrayCmc).reduce(
        (savedClosestBar, potentialClosestBar) => {
          if (potentialClosestBar.time > timestampSinceCulcPriceChange) {
            if (
              // Check if current bar is closer to timestampSinceCulcPriceChange than the best match found so far
              potentialClosestBar.time - timestampSinceCulcPriceChange < // Potential best match
              savedClosestBar.time - timestampSinceCulcPriceChange // Saved best match
            )
              return potentialClosestBar;
          }

          return savedClosestBar; // Saved best match
        },
        finalBar,
      );

      startingBarPrice = startingBar.open;
    }
  } else {
    // For earlier 24h taking the first bar open price
    startingBarPrice = isFromGeckoApi
      ? (ohlcv as OhlcvArrayGecko)[ohlcv.length - 1][1]
      : ohlcv[0].open;
  }

  const priceChange =
    ((finalBarPrice - startingBarPrice) / startingBarPrice) * 100;
  const priceChangeRounded = Math.round(priceChange);

  const priceChangeFormattedRaw =
    priceChangeRounded > 0
      ? formatPositivePriceValue(priceChangeRounded)
      : `${priceChangeRounded}`;

  const priceChangeFormatted = `${priceChangeFormattedRaw}%`;

  return priceChangeFormatted;
}
