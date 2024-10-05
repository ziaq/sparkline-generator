type OhlcvGecko = Record<string, number>;
export type OhlcvArrayGecko = OhlcvGecko[];

type OhlcvCmc = {
  time: number;
  open: number;
  close: number;
};
export type OhlcvArrayCmc = OhlcvCmc[];
