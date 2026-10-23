import { describe, expect, it } from 'vitest';
import { getStagePoints, STANDARD_SCORING, type ScoringConfig } from './scoring';

const ALL_SLUGS = [
	'W_PI_78', 'W_PI_910', 'W_PI_8TH', 'W_R1_1', 'W_R1_2', 'W_R1_3', 'W_R1_4', 'W_R2_1', 'W_R2_2', 'W_CF',
	'E_PI_78', 'E_PI_910', 'E_PI_8TH', 'E_R1_1', 'E_R1_2', 'E_R1_3', 'E_R1_4', 'E_R2_1', 'E_R2_2', 'E_CF',
	'FINALS',
];

describe('getStagePoints', () => {
	it('uses the standard rules when the league has no custom config', () => {
		expect(getStagePoints('W_PI_78', null)).toEqual({ win: 5, bonus: 0 });
		expect(getStagePoints('E_R1_3', null)).toEqual({ win: 10, bonus: 5 });
		expect(getStagePoints('W_R2_2', null)).toEqual({ win: 20, bonus: 10 });
		expect(getStagePoints('E_CF', null)).toEqual({ win: 40, bonus: 20 });
		expect(getStagePoints('FINALS', null)).toEqual({ win: 80, bonus: 40 });
	});

	it('maps every bracket slot to the matching round of a custom config', () => {
		const custom: ScoringConfig = {
			regular: [1],
			playoff: { pi: 3, r1: [11, 6], semis: [21, 11], cf: [41, 21], finals: [81, 41] },
		};
		const expected: Record<string, string> = { PI: '3/0', R1: '11/6', R2: '21/11', CF: '41/21', FINALS: '81/41' };
		for (const slug of ALL_SLUGS) {
			const round = slug === 'FINALS' ? 'FINALS' : slug.split('_')[1];
			const pts = getStagePoints(slug, custom);
			expect(`${pts.win}/${pts.bonus}`, slug).toBe(expected[round]);
		}
	});

	it('never gives a games bonus for play-in games', () => {
		for (const slug of ALL_SLUGS.filter(s => s.includes('_PI_'))) {
			expect(getStagePoints(slug, STANDARD_SCORING).bonus).toBe(0);
		}
	});
});

describe('STANDARD_SCORING', () => {
	it('matches the fallback hardcoded in the leaderboard view', () => {
		// db/migrations/*_league_scoring_config.sql: COALESCE(l.scoring_config -> 'regular', '[10,6,3,1]')
		expect(STANDARD_SCORING.regular).toEqual([10, 6, 3, 1]);
	});
});
