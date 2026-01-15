import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { NBA_TEAMS, type Team } from './teams';
import { BracketMatch } from './BracketMatch';

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave?: () => void;
}

type Picks = Record<string, string>;

const DEPENDENCIES: Record<string, string[]> = {
	w_pi_7v8: ['w_pi_8th', 'w_r1_2'],
	w_pi_9v10: ['w_pi_8th'],
	w_pi_8th: ['w_r1_1'],
	w_r1_1: ['w_semis_1'],
	w_r1_4: ['w_semis_1'],
	w_r1_3: ['w_semis_2'],
	w_r1_2: ['w_semis_2'],
	w_semis_1: ['w_finals'],
	w_semis_2: ['w_finals'],
	w_finals: ['nba_finals'],

	e_pi_7v8: ['e_pi_8th', 'e_r1_2'],
	e_pi_9v10: ['e_pi_8th'],
	e_pi_8th: ['e_r1_1'],
	e_r1_1: ['e_semis_1'],
	e_r1_4: ['e_semis_1'],
	e_r1_3: ['e_semis_2'],
	e_r1_2: ['e_semis_2'],
	e_semis_1: ['e_finals'],
	e_semis_2: ['e_finals'],
	e_finals: ['nba_finals'],
};

function cleanRecursive(picks: Picks, startMatchId: string): Picks {
	const newPicks = { ...picks };
	const queue = [startMatchId];

	while (queue.length > 0) {
		const currentMatch = queue.shift()!;
		const dependents = DEPENDENCIES[currentMatch];

		if (dependents) {
			dependents.forEach((dependentMatchId) => {
				if (newPicks[dependentMatchId]) {
					delete newPicks[dependentMatchId];
					queue.push(dependentMatchId);
				}
			});
		}
	}
	return newPicks;
}

const BracketLines = ({
	type,
	isRev = false,
}: {
	type: 'r1_to_semis' | 'semis_to_finals';
	isRev?: boolean;
}) => {
	const stroke = '#6b7280';
	const strokeWidth = 2;

	if (type === 'r1_to_semis') {
		return (
			<div className="w-[30px] flex-shrink-0 h-full relative z-0">
				<svg
					width="100%"
					height="100%"
					style={{ transform: isRev ? 'scaleX(-1)' : 'none' }}
				>
					<path
						d="M0,62.5 H15 V187.5 H0"
						fill="none"
						stroke={stroke}
						strokeWidth={strokeWidth}
					/>
					<path d="M15,125 H30" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
					<path
						d="M0,312.5 H15 V437.5 H0"
						fill="none"
						stroke={stroke}
						strokeWidth={strokeWidth}
					/>
					<path d="M15,375 H30" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
				</svg>
			</div>
		);
	}
	if (type === 'semis_to_finals') {
		return (
			<div className="w-[30px] flex-shrink-0 h-full relative z-0">
				<svg
					width="100%"
					height="100%"
					style={{ transform: isRev ? 'scaleX(-1)' : 'none' }}
				>
					<path
						d="M0,125 H15 V375 H0"
						fill="none"
						stroke={stroke}
						strokeWidth={strokeWidth}
					/>
					<path d="M15,250 H30" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
				</svg>
			</div>
		);
	}
	return null;
};

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [picks, setPicks] = useState<Picks>({});
	const [officialResults, setOfficialResults] = useState<Picks>({});
	const [standings, setStandings] = useState<{ West: Team[]; East: Team[] }>({
		West: [],
		East: [],
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Default zoom slightly smaller for mobile
	const [zoomLevel, setZoomLevel] = useState(0.8);

	useEffect(() => {
		loadData();
	}, [userId, leagueId]);

	async function loadData() {
		setLoading(true);

		const { data: rankData } = await supabase
			.from('predictions')
			.select('team_id, predicted_rank, conference')
			.eq('user_id', userId)
			.eq('league_id', leagueId)
			.order('predicted_rank', { ascending: true });

		if (rankData) {
			const west = rankData
				.filter((p) => p.conference === 'West')
				.map((p) => NBA_TEAMS.find((t) => t.id === p.team_id)!);
			const east = rankData
				.filter((p) => p.conference === 'East')
				.map((p) => NBA_TEAMS.find((t) => t.id === p.team_id)!);
			setStandings({ West: west, East: east });
		}

		const { data: bracketData } = await supabase
			.from('tournament_predictions')
			.select('stage_slug, team_id')
			.eq('user_id', userId)
			.eq('league_id', leagueId);

		if (bracketData && bracketData.length > 0) {
			const loadedPicks: Picks = {};
			bracketData.forEach((row) => {
				loadedPicks[row.stage_slug] = row.team_id;
			});
			setPicks(loadedPicks);
		} else {
			setPicks({});
		}

		const { data: resultsData } = await supabase
			.from('official_playoff_results')
			.select('match_id, winning_team_id');

		if (resultsData) {
			const resultsMap: Picks = {};
			resultsData.forEach((row) => {
				resultsMap[row.match_id] = row.winning_team_id;
			});
			setOfficialResults(resultsMap);
		}

		setLoading(false);
	}

	async function savePicks() {
		if (isLocked) return;
		setSaving(true);

		await supabase
			.from('tournament_predictions')
			.delete()
			.eq('user_id', userId)
			.eq('league_id', leagueId);

		const rowsToInsert = Object.entries(picks).map(([stage, teamId]) => ({
			user_id: userId,
			league_id: leagueId,
			stage_slug: stage,
			team_id: teamId,
		}));

		if (rowsToInsert.length > 0) {
			const { error } = await supabase.from('tournament_predictions').insert(rowsToInsert);
			if (error) {
				console.error(error);
				alert('Error saving bracket');
			} else {
				if (onSave) onSave();
			}
		}
		setSaving(false);
	}

	const handleWin = (matchId: string, teamId: string) => {
		if (isLocked) return;

		setPicks((prev) => {
			let newPicks = { ...prev };

			if (newPicks[matchId] === teamId) {
				delete newPicks[matchId];
			} else {
				newPicks[matchId] = teamId;
			}

			newPicks = cleanRecursive(newPicks, matchId);

			return newPicks;
		});
	};

	const getTeam = (id?: string | null) => {
		if (!id) return null;
		return NBA_TEAMS.find((t) => t.id === id) || null;
	};

	const getOfficial = (matchId: string) => officialResults[matchId] || null;

	const resolveSlot = (
		conf: 'West' | 'East',
		seed: number | string,
		matchSource?: string,
	): Team | null => {
		const teams = standings[conf];
		if (!teams || teams.length < 10) return null;

		if (typeof seed === 'number' && seed <= 6) return teams[seed - 1] || null;

		if (matchSource) {
			const winnerId = picks[matchSource];
			if (!winnerId) return null;
			return getTeam(winnerId);
		}

		if (seed === 7) return teams[6];
		if (seed === 8) return teams[7];
		if (seed === 9) return teams[8];
		if (seed === 10) return teams[9];
		return null;
	};

	const MainBracketSide = ({ conf }: { conf: 'West' | 'East' }) => {
		const p = conf === 'West' ? 'w' : 'e';
		const isRev = conf === 'East';

		const pi_7v8_id = `${p}_pi_7v8`;
		const pi_8th_seed_id = `${p}_pi_8th`;

		const winner7v8 = getTeam(picks[pi_7v8_id]);
		const final8thSeed = getTeam(picks[pi_8th_seed_id]);

		return (
			<div
				className={`flex ${isRev ? 'flex-row-reverse' : 'flex-row'} items-center h-[500px]`}
			>
				<div className="flex flex-col justify-around h-full w-40 flex-shrink-0 z-10">
					<BracketMatch
						matchId={`${p}_r1_1`}
						topTeam={resolveSlot(conf, 1)}
						bottomTeam={final8thSeed}
						topSeed={1}
						bottomSeed={8}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_r1_1`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_r1_1`)}
					/>
					<BracketMatch
						matchId={`${p}_r1_4`}
						topTeam={resolveSlot(conf, 4)}
						bottomTeam={resolveSlot(conf, 5)}
						topSeed={4}
						bottomSeed={5}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_r1_4`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_r1_4`)}
					/>
					<BracketMatch
						matchId={`${p}_r1_3`}
						topTeam={resolveSlot(conf, 3)}
						bottomTeam={resolveSlot(conf, 6)}
						topSeed={3}
						bottomSeed={6}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_r1_3`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_r1_3`)}
					/>
					<BracketMatch
						matchId={`${p}_r1_2`}
						topTeam={resolveSlot(conf, 2)}
						bottomTeam={winner7v8}
						topSeed={2}
						bottomSeed={7}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_r1_2`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_r1_2`)}
					/>
				</div>

				<BracketLines type="r1_to_semis" isRev={isRev} />

				<div className="flex flex-col justify-around h-full w-40 flex-shrink-0 z-10">
					<BracketMatch
						matchId={`${p}_semis_1`}
						topTeam={getTeam(picks[`${p}_r1_1`])}
						bottomTeam={getTeam(picks[`${p}_r1_4`])}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_semis_1`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_semis_1`)}
					/>
					<BracketMatch
						matchId={`${p}_semis_2`}
						topTeam={getTeam(picks[`${p}_r1_3`])}
						bottomTeam={getTeam(picks[`${p}_r1_2`])}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_semis_2`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_semis_2`)}
					/>
				</div>

				<BracketLines type="semis_to_finals" isRev={isRev} />

				<div className="flex flex-col justify-center h-full w-40 flex-shrink-0 z-10">
					<div
						className={`text-[9px] font-bold mb-2 text-center uppercase tracking-widest ${conf === 'West' ? 'text-blue-400' : 'text-red-400'}`}
					>
						{conf} Final
					</div>
					<BracketMatch
						matchId={`${p}_finals`}
						topTeam={getTeam(picks[`${p}_semis_1`])}
						bottomTeam={getTeam(picks[`${p}_semis_2`])}
						onWinnerClick={handleWin}
						selectedWinnerId={picks[`${p}_finals`]}
						reverse={isRev}
						officialWinnerId={getOfficial(`${p}_finals`)}
					/>
				</div>
			</div>
		);
	};

	const PlayInBracket = ({ conf }: { conf: 'West' | 'East' }) => {
		const p = conf === 'West' ? 'w' : 'e';
		const colorClass =
			conf === 'West' ? 'text-blue-400 border-blue-900/30' : 'text-red-400 border-red-900/30';

		const pi_7v8_id = `${p}_pi_7v8`;
		const pi_9v10_id = `${p}_pi_9v10`;
		const pi_8th_seed_id = `${p}_pi_8th`;

		const team7 = resolveSlot(conf, 7);
		const team8 = resolveSlot(conf, 8);
		const team9 = resolveSlot(conf, 9);
		const team10 = resolveSlot(conf, 10);

		const winner9v10 = getTeam(picks[pi_9v10_id]);

		let loser7v8 = null;
		if (picks[pi_7v8_id]) {
			loser7v8 = team7?.id === picks[pi_7v8_id] ? team8 : team7;
		}

		return (
			<div
				className={`bg-black/20 border ${colorClass} rounded-lg p-3 relative min-w-[380px]`}
			>
				<div
					className={`absolute top-0 left-0 bg-black/60 px-2 py-0.5 text-[8px] font-bold rounded-br border-b border-r border-white/10 ${conf === 'West' ? 'text-blue-400' : 'text-red-400'}`}
				>
					{conf} PLAY-IN
				</div>

				<div className="flex items-center gap-6 mt-3">
					<div className="flex flex-col gap-3">
						<div className="relative">
							<div className="text-[7px] uppercase text-gray-500 mb-0.5 ml-1 font-bold">
								7 vs 8
							</div>
							<BracketMatch
								matchId={pi_7v8_id}
								topTeam={team7}
								bottomTeam={team8}
								topSeed={7}
								bottomSeed={8}
								onWinnerClick={handleWin}
								selectedWinnerId={picks[pi_7v8_id]}
								officialWinnerId={getOfficial(pi_7v8_id)}
							/>
						</div>
						<div className="relative">
							<div className="text-[7px] uppercase text-gray-500 mb-0.5 ml-1 font-bold">
								9 vs 10
							</div>
							<BracketMatch
								matchId={pi_9v10_id}
								topTeam={team9}
								bottomTeam={team10}
								topSeed={9}
								bottomSeed={10}
								onWinnerClick={handleWin}
								selectedWinnerId={picks[pi_9v10_id]}
								officialWinnerId={getOfficial(pi_9v10_id)}
							/>
						</div>
					</div>

					<div className="text-gray-600 text-xl pt-4 opacity-50">▶</div>

					<div className="flex flex-col justify-center pt-4">
						<div className="text-[7px] uppercase text-orange-400 mb-0.5 ml-1 text-center font-bold">
							For 8th Seed
						</div>
						<BracketMatch
							matchId={pi_8th_seed_id}
							topTeam={loser7v8}
							bottomTeam={winner9v10}
							topSeed="L7"
							bottomSeed="W9"
							onWinnerClick={handleWin}
							selectedWinnerId={picks[pi_8th_seed_id]}
							officialWinnerId={getOfficial(pi_8th_seed_id)}
						/>
					</div>
				</div>
			</div>
		);
	};

	if (loading) return <div>Loading...</div>;
	if (standings.West.length < 10)
		return (
			<div className="text-white text-center mt-10">
				Please complete your Regular Season predictions first.
			</div>
		);

	const champion = getTeam(picks['nba_finals']);

	return (
		<div className="w-full min-h-screen bg-[#0f172a] overflow-auto flex flex-col items-center relative">
			{/* Bracket Container - Added padding bottom to prevent content hiding behind fixed bar */}
			<div className="w-full flex justify-center overflow-x-auto overflow-y-hidden pt-4 pb-32">
				<div
					style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
					className="flex flex-col items-center gap-6 transition-transform duration-200 ease-out"
				>
					<div className="flex flex-row items-center justify-center gap-0">
						<MainBracketSide conf="West" />

						<div className="flex flex-col items-center justify-center px-8 relative min-w-[200px] h-[500px] flex-shrink-0">
							<img
								src="https://cdn.nba.com/logos/leagues/logo-nba.svg"
								className="h-24 opacity-10 absolute top-20"
							/>

							<div className="mb-8 text-center">
								<h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2 z-10">
									Finals
								</h1>
								<div className="text-5xl drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
									🏆
								</div>
							</div>

							<div className="scale-110 mb-8 z-10 relative">
								<BracketMatch
									matchId="nba_finals"
									topTeam={getTeam(picks['w_finals'])}
									bottomTeam={getTeam(picks['e_finals'])}
									topSeed="W"
									bottomSeed="E"
									onWinnerClick={handleWin}
									selectedWinnerId={picks['nba_finals']}
									officialWinnerId={getOfficial('nba_finals')}
								/>
							</div>

							<div
								className={`transition-all duration-700 transform ${champion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
							>
								{champion && (
									<div className="text-center">
										<div className="text-yellow-500 text-[9px] font-bold tracking-[0.3em] mb-1 uppercase">
											Champion
										</div>
										<div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black px-6 py-2 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.4)] border border-yellow-200">
											<img
												src={champion.logo}
												className="w-12 h-12 object-contain mx-auto mb-1 drop-shadow-lg"
											/>
											<div className="text-lg font-black uppercase tracking-tight">
												{champion.name}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						<MainBracketSide conf="East" />
					</div>

					<div className="w-full border-t border-white/5 pt-4 mt-2">
						<div className="flex flex-wrap justify-center gap-8">
							<PlayInBracket conf="West" />
							<PlayInBracket conf="East" />
						</div>
					</div>
				</div>
			</div>

			{/* --- FIXED BOTTOM BAR (Action Bar) --- */}
			{/* Uses "safe-area-inset-bottom" for iPhone Home Bar */}
			<div className="fixed bottom-0 w-full bg-[#1D428A]/95 backdrop-blur-md border-t border-white/10 p-4 flex justify-between items-center z-40 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
				{/* Zoom Controls (Left) */}
				<div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/10">
					<button
						onClick={() => setZoomLevel((z) => Math.max(0.3, z - 0.1))}
						className="w-10 h-10 flex items-center justify-center text-white bg-white/10 rounded hover:bg-white/20 font-bold active:scale-90 transition-transform"
					>
						-
					</button>
					<span className="text-xs font-mono text-gray-300 w-10 text-center font-bold">
						{(zoomLevel * 100).toFixed(0)}%
					</span>
					<button
						onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
						className="w-10 h-10 flex items-center justify-center text-white bg-white/10 rounded hover:bg-white/20 font-bold active:scale-90 transition-transform"
					>
						+
					</button>
				</div>

				{/* Save Button (Right) */}
				<button
					onClick={savePicks}
					disabled={saving || isLocked}
					className={`
										px-6 py-3 rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 text-sm uppercase tracking-wider
										${
											isLocked
												? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
												: 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white active:scale-95 border border-white/20'
										}
								`}
				>
					{isLocked ? (
						<>🔒 Locked</>
					) : saving ? (
						<>
							<span className="animate-spin">⌛</span> Saving...
						</>
					) : (
						<>💾 Save</>
					)}
				</button>
			</div>
		</div>
	);
}
