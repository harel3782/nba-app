export type RoundPoints = [win: number, gamesBonus: number];

export interface ScoringConfig {
	regular: number[];
	playoff: {
		pi: number;
		r1: RoundPoints;
		semis: RoundPoints;
		cf: RoundPoints;
		finals: RoundPoints;
	};
}

export type PlayoffRoundKey = Exclude<keyof ScoringConfig['playoff'], 'pi'>;

// Must match the default in the `leaderboard` view (db/migrations/20261023_league_scoring_config.sql).
export const STANDARD_SCORING: ScoringConfig = {
	regular: [10, 6, 3, 1],
	playoff: { pi: 5, r1: [10, 5], semis: [20, 10], cf: [40, 20], finals: [80, 40] },
};

export const PLAYOFF_ROUNDS: { key: PlayoffRoundKey; label: string }[] = [
	{ key: 'r1', label: 'Round 1' },
	{ key: 'semis', label: 'Conf. Semis' },
	{ key: 'cf', label: 'Conf. Finals' },
	{ key: 'finals', label: 'NBA Finals' },
];

export const MAX_REGULAR_SLOTS = 15;
export const MAX_POINTS = 1000;

export function getStagePoints(slug: string, config: ScoringConfig | null) {
	const { playoff } = config ?? STANDARD_SCORING;
	const round: RoundPoints | null =
		slug === 'FINALS' ? playoff.finals
		: slug.includes('CF') ? playoff.cf
		: slug.includes('R2') ? playoff.semis
		: slug.includes('R1') ? playoff.r1
		: null;
	return round ? { win: round[0], bonus: round[1] } : { win: playoff.pi, bonus: 0 };
}
