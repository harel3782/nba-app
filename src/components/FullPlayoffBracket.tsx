import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NBA_TEAMS, type Team } from '../lib/teams';

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	triggerSave?: number;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, triggerSave }: Props) {
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	
	const [westSeeds, setWestSeeds] = useState<Team[]>([]);
	const [eastSeeds, setEastSeeds] = useState<Team[]>([]);
	
	// State to hold all the interactive picks
	const [picks, setPicks] = useState<Record<string, Team | null>>({});

	const westTeamsList = NBA_TEAMS.filter((t) => t.conference === 'West');
	const eastTeamsList = NBA_TEAMS.filter((t) => t.conference === 'East');

	useEffect(() => {
		if (userId && leagueId) {
			loadActualStandingsForBracket();
			loadBracketPicks();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, leagueId]);

	// Listen to the global save trigger from App.tsx
	useEffect(() => {
		if (triggerSave && triggerSave > 0) {
			saveBracket();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [triggerSave]);

	async function loadActualStandingsForBracket() {
		setLoading(true);
		
		const { data: actualData } = await supabase
			.from('actual_standings')
			.select('team_id, actual_rank');

		const standingsMap: Record<string, number> = {};
		if (actualData) {
			actualData.forEach(s => {
				standingsMap[s.team_id] = s.actual_rank;
			});
		}

		const sortedWest = [...westTeamsList].sort((a, b) => {
			const rankA = standingsMap[a.id] ?? 99;
			const rankB = standingsMap[b.id] ?? 99;
			return rankA - rankB;
		});

		const sortedEast = [...eastTeamsList].sort((a, b) => {
			const rankA = standingsMap[a.id] ?? 99;
			const rankB = standingsMap[b.id] ?? 99;
			return rankA - rankB;
		});

		setWestSeeds(sortedWest.slice(0, 10));
		setEastSeeds(sortedEast.slice(0, 10));

		setLoading(false);
	}

	async function loadBracketPicks() {
		const { data, error } = await supabase
			.from('tournament_predictions')
			.select('stage_slug, team_id')
			.eq('user_id', userId)
			.eq('league_id', leagueId);

		if (error) {
			console.error("Error loading bracket picks:", error);
			return;
		}

		if (data && data.length > 0) {
			const loadedPicks: Record<string, Team | null> = {};
			data.forEach((row) => {
				const team = NBA_TEAMS.find(t => t.id === row.team_id);
				if (team) {
					loadedPicks[row.stage_slug] = team;
				}
			});
			setPicks(loadedPicks);
		}
	}

	async function saveBracket() {
		if (isLocked) return;
		setIsSaving(true);

		const predictionsToInsert = Object.entries(picks)
			.filter(([_, team]) => team !== null)
			.map(([stage_slug, team]) => ({
				user_id: userId,
				league_id: leagueId,
				stage_slug: stage_slug,
				team_id: team!.id
			}));

		try {
			const { error: deleteError } = await supabase
				.from('tournament_predictions')
				.delete()
				.eq('user_id', userId)
				.eq('league_id', leagueId);

			if (deleteError) throw deleteError;

			if (predictionsToInsert.length > 0) {
				const { error: insertError } = await supabase
					.from('tournament_predictions')
					.insert(predictionsToInsert);

				if (insertError) throw insertError;
			}

			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (error: any) {
			console.error('Error saving bracket:', error);
			alert('Error saving bracket picks: ' + error.message);
		} finally {
			setIsSaving(false);
		}
	}

	const makePick = (key: string, team: Team | null) => {
		if (isLocked || !team) return;
		setPicks((prev) => {
			if (prev[key]?.id === team.id) return prev;
			
			const next = { ...prev, [key]: team };
			
			// WEST Cascades
			if (key === 'W_PI_78') { next['W_PI_8TH'] = null; next['W_R1_1'] = null; next['W_R1_4'] = null; next['W_R2_1'] = null; next['W_R2_2'] = null; next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_PI_910') { next['W_PI_8TH'] = null; next['W_R1_1'] = null; next['W_R2_1'] = null; next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_PI_8TH') { next['W_R1_1'] = null; next['W_R2_1'] = null; next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_R1_1' || key === 'W_R1_2') { next['W_R2_1'] = null; next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_R1_3' || key === 'W_R1_4') { next['W_R2_2'] = null; next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_R2_1' || key === 'W_R2_2') { next['W_CF'] = null; next['FINALS'] = null; }
			if (key === 'W_CF') { next['FINALS'] = null; }

			// EAST Cascades
			if (key === 'E_PI_78') { next['E_PI_8TH'] = null; next['E_R1_1'] = null; next['E_R1_4'] = null; next['E_R2_1'] = null; next['E_R2_2'] = null; next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_PI_910') { next['E_PI_8TH'] = null; next['E_R1_1'] = null; next['E_R2_1'] = null; next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_PI_8TH') { next['E_R1_1'] = null; next['E_R2_1'] = null; next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_R1_1' || key === 'E_R1_2') { next['E_R2_1'] = null; next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_R1_3' || key === 'E_R1_4') { next['E_R2_2'] = null; next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_R2_1' || key === 'E_R2_2') { next['E_CF'] = null; next['FINALS'] = null; }
			if (key === 'E_CF') { next['FINALS'] = null; }

			return next;
		});
	};

	const getLoser = (teamA?: Team | null, teamB?: Team | null, winner?: Team | null) => {
		if (!winner || !teamA || !teamB) return null;
		return winner.id === teamA.id ? teamB : teamA;
	};

	const MatchupBox = ({ teamA, teamB, label, seedA, seedB, isFinals = false, winner, onPickA, onPickB }: any) => {
		const isSelected = (t: any) => winner && t && winner.id === t.id;
		const isLoser = (t: any) => winner && t && winner.id !== t.id;

		return (
			<div className={`
				bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-lg w-24 lg:w-28 flex flex-col overflow-hidden shadow-lg transition-all duration-300 transform hover:-translate-y-1
				${isFinals ? 'border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border border-white/10 hover:border-orange-500/50'}
			`}>
				<div className={`text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-center py-1 border-b border-white/5 
					${isFinals ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/40 text-gray-400'}
				`}>
					{label}
				</div>
				<div className="flex flex-col p-1 gap-0.5">
					<button 
						disabled={!teamA || !teamB || isLocked} 
						onClick={onPickA}
						className={`flex items-center gap-1.5 p-1 rounded transition-colors group text-left ${!teamA || !teamB || isLocked ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}
							${isSelected(teamA) ? 'bg-orange-500/20 border border-orange-500' : 'bg-white/5 border border-transparent'}
							${isLoser(teamA) ? 'opacity-30' : ''}
						`}>
						<span className="text-gray-500 text-[8px] lg:text-[9px] font-black w-3 text-right">{seedA}</span>
						{teamA ? (
							<>
								<img src={teamA.logo} alt={teamA.id} className="w-4 h-4 lg:w-5 lg:h-5 object-contain drop-shadow-md" />
								<span className={`text-[9px] lg:text-[10px] font-bold truncate tracking-wider ${isSelected(teamA) ? 'text-orange-400' : 'text-gray-200 group-hover:text-white'}`}>{teamA.id}</span>
							</>
						) : (
							<span className="text-[9px] lg:text-[10px] font-bold text-gray-600 italic">TBD</span>
						)}
					</button>
					<button 
						disabled={!teamA || !teamB || isLocked} 
						onClick={onPickB}
						className={`flex items-center gap-1.5 p-1 rounded transition-colors group text-left ${!teamA || !teamB || isLocked ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}
							${isSelected(teamB) ? 'bg-orange-500/20 border border-orange-500' : 'bg-white/5 border border-transparent'}
							${isLoser(teamB) ? 'opacity-30' : ''}
						`}>
						<span className="text-gray-500 text-[8px] lg:text-[9px] font-black w-3 text-right">{seedB}</span>
						{teamB ? (
							<>
								<img src={teamB.logo} alt={teamB.id} className="w-4 h-4 lg:w-5 lg:h-5 object-contain drop-shadow-md" />
								<span className={`text-[9px] lg:text-[10px] font-bold truncate tracking-wider ${isSelected(teamB) ? 'text-orange-400' : 'text-gray-200 group-hover:text-white'}`}>{teamB.id}</span>
							</>
						) : (
							<span className="text-[9px] lg:text-[10px] font-bold text-gray-600 italic">TBD</span>
						)}
					</button>
				</div>
			</div>
		);
	};

	if (loading) return <div className="text-center py-20 animate-pulse text-orange-500 font-black tracking-widest">BUILDING BRACKET...</div>;

	return (
		<div className="w-full overflow-x-auto pb-10 scrollbar-hide flex flex-col items-center">
			<div className="min-w-max flex justify-start lg:justify-center px-4 w-full">
				<div className="flex items-stretch gap-1.5 md:gap-2 lg:gap-3">
					{/* West PI */}
					<div className="flex flex-col justify-center gap-4">
						<MatchupBox teamA={westSeeds[6]} seedA="7" teamB={westSeeds[7]} seedB="8" label="PI (7v8)" winner={picks['W_PI_78']} onPickA={() => makePick('W_PI_78', westSeeds[6])} onPickB={() => makePick('W_PI_78', westSeeds[7])} />
						<MatchupBox teamA={getLoser(westSeeds[6], westSeeds[7], picks['W_PI_78'])} seedA="L7" teamB={picks['W_PI_910']} seedB="W9" label="PI (8th)" winner={picks['W_PI_8TH']} onPickA={() => makePick('W_PI_8TH', getLoser(westSeeds[6], westSeeds[7], picks['W_PI_78']))} onPickB={() => makePick('W_PI_8TH', picks['W_PI_910'])} />
						<MatchupBox teamA={westSeeds[8]} seedA="9" teamB={westSeeds[9]} seedB="10" label="PI (9v10)" winner={picks['W_PI_910']} onPickA={() => makePick('W_PI_910', westSeeds[8])} onPickB={() => makePick('W_PI_910', westSeeds[9])} />
					</div>
					{/* West R1 */}
					<div className="flex flex-col justify-around py-4">
						<MatchupBox teamA={westSeeds[0]} seedA="1" teamB={picks['W_PI_8TH']} seedB="8" label="Round 1" winner={picks['W_R1_1']} onPickA={() => makePick('W_R1_1', westSeeds[0])} onPickB={() => makePick('W_R1_1', picks['W_PI_8TH'])} />
						<MatchupBox teamA={westSeeds[3]} seedA="4" teamB={westSeeds[4]} seedB="5" label="Round 1" winner={picks['W_R1_2']} onPickA={() => makePick('W_R1_2', westSeeds[3])} onPickB={() => makePick('W_R1_2', westSeeds[4])} />
						<MatchupBox teamA={westSeeds[2]} seedA="3" teamB={westSeeds[5]} seedB="6" label="Round 1" winner={picks['W_R1_3']} onPickA={() => makePick('W_R1_3', westSeeds[2])} onPickB={() => makePick('W_R1_3', westSeeds[5])} />
						<MatchupBox teamA={westSeeds[1]} seedA="2" teamB={picks['W_PI_78']} seedB="7" label="Round 1" winner={picks['W_R1_4']} onPickA={() => makePick('W_R1_4', westSeeds[1])} onPickB={() => makePick('W_R1_4', picks['W_PI_78'])} />
					</div>
					{/* West Semis */}
					<div className="flex flex-col justify-around py-16">
						<MatchupBox teamA={picks['W_R1_1']} seedA="" teamB={picks['W_R1_2']} seedB="" label="Semis" winner={picks['W_R2_1']} onPickA={() => makePick('W_R2_1', picks['W_R1_1'])} onPickB={() => makePick('W_R2_1', picks['W_R1_2'])} />
						<MatchupBox teamA={picks['W_R1_3']} seedA="" teamB={picks['W_R1_4']} seedB="" label="Semis" winner={picks['W_R2_2']} onPickA={() => makePick('W_R2_2', picks['W_R1_3'])} onPickB={() => makePick('W_R2_2', picks['W_R1_4'])} />
					</div>
					{/* West Finals */}
					<div className="flex flex-col justify-center">
						<MatchupBox teamA={picks['W_R2_1']} seedA="" teamB={picks['W_R2_2']} seedB="" label="West Finals" winner={picks['W_CF']} onPickA={() => makePick('W_CF', picks['W_R2_1'])} onPickB={() => makePick('W_CF', picks['W_R2_2'])} />
					</div>
					{/* NBA Finals */}
					<div className="flex flex-col justify-center items-center px-1 md:px-2 relative">
						<img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" alt="NBA" className="h-10 lg:h-14 w-auto opacity-20 absolute top-10 drop-shadow-lg" />
						<MatchupBox teamA={picks['W_CF']} seedA="W" teamB={picks['E_CF']} seedB="E" label="NBA Finals" isFinals={true} winner={picks['FINALS']} onPickA={() => makePick('FINALS', picks['W_CF'])} onPickB={() => makePick('FINALS', picks['E_CF'])} />
					</div>
					{/* East Finals */}
					<div className="flex flex-col justify-center">
						<MatchupBox teamA={picks['E_R2_1']} seedA="" teamB={picks['E_R2_2']} seedB="" label="East Finals" winner={picks['E_CF']} onPickA={() => makePick('E_CF', picks['E_R2_1'])} onPickB={() => makePick('E_CF', picks['E_R2_2'])} />
					</div>
					{/* East Semis */}
					<div className="flex flex-col justify-around py-16">
						<MatchupBox teamA={picks['E_R1_1']} seedA="" teamB={picks['E_R1_2']} seedB="" label="Semis" winner={picks['E_R2_1']} onPickA={() => makePick('E_R2_1', picks['E_R1_1'])} onPickB={() => makePick('E_R2_1', picks['E_R1_2'])} />
						<MatchupBox teamA={picks['E_R1_3']} seedA="" teamB={picks['E_R1_4']} seedB="" label="Semis" winner={picks['E_R2_2']} onPickA={() => makePick('E_R2_2', picks['E_R1_3'])} onPickB={() => makePick('E_R2_2', picks['E_R1_4'])} />
					</div>
					{/* East R1 */}
					<div className="flex flex-col justify-around py-4">
						<MatchupBox teamA={eastSeeds[0]} seedA="1" teamB={picks['E_PI_8TH']} seedB="8" label="Round 1" winner={picks['E_R1_1']} onPickA={() => makePick('E_R1_1', eastSeeds[0])} onPickB={() => makePick('E_R1_1', picks['E_PI_8TH'])} />
						<MatchupBox teamA={eastSeeds[3]} seedA="4" teamB={eastSeeds[4]} seedB="5" label="Round 1" winner={picks['E_R1_2']} onPickA={() => makePick('E_R1_2', eastSeeds[3])} onPickB={() => makePick('E_R1_2', eastSeeds[4])} />
						<MatchupBox teamA={eastSeeds[2]} seedA="3" teamB={eastSeeds[5]} seedB="6" label="Round 1" winner={picks['E_R1_3']} onPickA={() => makePick('E_R1_3', eastSeeds[2])} onPickB={() => makePick('E_R1_3', eastSeeds[5])} />
						<MatchupBox teamA={eastSeeds[1]} seedA="2" teamB={picks['E_PI_78']} seedB="7" label="Round 1" winner={picks['E_R1_4']} onPickA={() => makePick('E_R1_4', eastSeeds[1])} onPickB={() => makePick('E_R1_4', picks['E_PI_78'])} />
					</div>
					{/* East PI */}
					<div className="flex flex-col justify-center gap-4">
						<MatchupBox teamA={eastSeeds[6]} seedA="7" teamB={eastSeeds[7]} seedB="8" label="PI (7v8)" winner={picks['E_PI_78']} onPickA={() => makePick('E_PI_78', eastSeeds[6])} onPickB={() => makePick('E_PI_78', eastSeeds[7])} />
						<MatchupBox teamA={getLoser(eastSeeds[6], eastSeeds[7], picks['E_PI_78'])} seedA="L7" teamB={picks['E_PI_910']} seedB="W9" label="PI (8th)" winner={picks['E_PI_8TH']} onPickA={() => makePick('E_PI_8TH', getLoser(eastSeeds[6], eastSeeds[7], picks['E_PI_78']))} onPickB={() => makePick('E_PI_8TH', picks['E_PI_910'])} />
						<MatchupBox teamA={eastSeeds[8]} seedA="9" teamB={eastSeeds[9]} seedB="10" label="PI (9v10)" winner={picks['E_PI_910']} onPickA={() => makePick('E_PI_910', eastSeeds[8])} onPickB={() => makePick('E_PI_910', eastSeeds[9])} />
					</div>
				</div>
			</div>
			{!isLocked ? (
				<div className="mt-10 flex flex-col items-center gap-3">
					<button
						onClick={saveBracket}
						disabled={isSaving}
						className={`px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl text-lg min-w-[300px]
							${isSaving ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 
							saveSuccess ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' : 
							'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] hover:scale-105'}
						`}
					>
						{isSaving ? 'Saving Bracket...' : saveSuccess ? '✔ Bracket Saved!' : 'Save Bracket Picks'}
					</button>
				</div>
			) : (
				<div className="mt-10 text-center text-sm text-red-400 bg-red-900/20 px-6 py-3 rounded-full border border-red-500/20 uppercase tracking-widest font-black">
					🔒 Bracket is locked. Good luck!
				</div>
			)}
		</div>
	);
}