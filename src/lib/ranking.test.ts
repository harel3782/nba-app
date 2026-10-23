import { describe, expect, it } from 'vitest';
import { countExactPicks, rankEntries } from './ranking';

describe('countExactPicks', () => {
	const actual = { MIN: 1, POR: 2, OKC: 3 };

	it('counts picks whose predicted rank equals the actual rank, per user', () => {
		const picks = [
			{ user_id: 'a', team_id: 'MIN', predicted_rank: 1 },
			{ user_id: 'a', team_id: 'POR', predicted_rank: 2 },
			{ user_id: 'a', team_id: 'OKC', predicted_rank: 1 },
			{ user_id: 'b', team_id: 'MIN', predicted_rank: 2 },
		];
		expect(countExactPicks(picks, actual)).toEqual({ a: 2 });
	});

	it('ignores teams without an actual rank', () => {
		expect(countExactPicks([{ user_id: 'a', team_id: 'XXX', predicted_rank: 1 }], actual)).toEqual({});
	});
});

describe('rankEntries', () => {
	type Row = { id: string; total: number; exact: number; playoff: number };
	const compare = (a: Row, b: Row) => b.total - a.total || b.exact - a.exact || b.playoff - a.playoff;
	const ranks = (rows: Row[]) => rankEntries(rows, compare).map(r => `${r.id}#${r.rank}`);

	it('sorts best first', () => {
		expect(ranks([
			{ id: 'low', total: 10, exact: 0, playoff: 0 },
			{ id: 'high', total: 30, exact: 0, playoff: 0 },
		])).toEqual(['high#1', 'low#2']);
	});

	it('breaks ties on total by exact picks, then playoff points', () => {
		expect(ranks([
			{ id: 'c', total: 30, exact: 1, playoff: 0 },
			{ id: 'a', total: 30, exact: 2, playoff: 0 },
			{ id: 'b', total: 30, exact: 1, playoff: 5 },
		])).toEqual(['a#1', 'b#2', 'c#3']);
	});

	it('shares the place when every tiebreaker is equal and skips the next place', () => {
		expect(ranks([
			{ id: 'a', total: 40, exact: 0, playoff: 0 },
			{ id: 'b', total: 20, exact: 1, playoff: 10 },
			{ id: 'c', total: 20, exact: 1, playoff: 10 },
			{ id: 'd', total: 10, exact: 0, playoff: 0 },
		])).toEqual(['a#1', 'b#2', 'c#2', 'd#4']);
	});

	it('does not mutate the input array', () => {
		const rows = [{ id: 'b', total: 1, exact: 0, playoff: 0 }, { id: 'a', total: 2, exact: 0, playoff: 0 }];
		rankEntries(rows, compare);
		expect(rows.map(r => r.id)).toEqual(['b', 'a']);
	});
});
