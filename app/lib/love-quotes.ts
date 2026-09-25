import generatedQuotes from "@/app/data/love-quotes.generated.json";

export type LoveQuote = {
  id: string;
  text: string;
  type: string;
  source: string;
};

export const LOVE_QUOTES = generatedQuotes as LoveQuote[];

export function shuffledQuoteIds(random: () => number = Math.random) {
  const ids = LOVE_QUOTES.map((quote) => quote.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }
  return ids;
}

export function drawLoveQuote(remainingIds: string[], lastId: string | null, random: () => number = Math.random) {
  let remaining = remainingIds.filter((id) => LOVE_QUOTES.some((quote) => quote.id === id) && id !== lastId);
  if (!remaining.length) {
    remaining = shuffledQuoteIds(random);
    if (remaining.length > 1 && remaining.at(-1) === lastId) {
      [remaining[0], remaining[remaining.length - 1]] = [remaining.at(-1)!, remaining[0]];
    }
  }
  const id = remaining.pop() ?? null;
  return { quote: LOVE_QUOTES.find((item) => item.id === id) ?? null, remainingIds: remaining };
}

export function getLoveQuote(id: string | null) {
  return LOVE_QUOTES.find((quote) => quote.id === id) ?? null;
}
