/** « 1 place », « 3 places », « 0 place ». */
export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n > 1 ? pluralForm : singular}`;

export const quoted = (title: string) => `« ${title} »`;

/** Minuscules sans accents, pour la recherche. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
