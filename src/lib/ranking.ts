interface Pick {
	user_id: string;
	team_id: string;
	predicted_rank: number;
}

export function countExactPicks(picks: Pick[], actualRankByTeam: Record<string, number | undefined>) {
	const counts: Record<string, number> = {};
	for (const p of picks) {
		if (actualRankByTeam[p.team_id] === p.predicted_rank) counts[p.user_id] = (counts[p.user_id] ?? 0) + 1;
	}
	return counts;
}

// Sorts best-first and assigns competition ranks: entries the comparator can't separate share a place (1, 1, 3).
export function rankEntries<T>(items: T[], compare: (a: T, b: T) => number): (T & { rank: number })[] {
	const sorted = [...items].sort(compare);
	const ranked: (T & { rank: number })[] = [];
	sorted.forEach((item, i) => {
		const tiedWithPrev = i > 0 && compare(sorted[i - 1], item) === 0;
		ranked.push({ ...item, rank: tiedWithPrev ? ranked[i - 1].rank : i + 1 });
	});
	return ranked;
}
