import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NBA_TEAMS, type Team } from '../lib/teams';

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	triggerSave?: number;
	onSaveSuccess?: () => void;
}

interface BracketPick {
	team: Team | null;
	games: number;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, triggerSave, onSaveSuccess }: Props) {
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	
	const [westSeeds, setWestSeeds] = useState<Team[]>([]);
	const [eastSeeds, setEastSeeds] = useState<Team[]>([]);
	const [picks, setPicks] = useState<Record<string, BracketPick>>({});

	useEffect(() => {
		if (userId && leagueId) {
			loadActualStandingsForBracket();
			loadBracketPicks();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, leagueId]);

	useEffect(() => {
		if (triggerSave && triggerSave > 0) saveBracket();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [triggerSave]);

	async function loadActualStandingsForBracket() {
		// Only show global loading if seeds are empty
		if (westSeeds.length === 0) {
			setLoading(true);
		}
		
		const { data } = await supabase.from('official_regular_standings').select('team_id, actual_rank');
		const sMap: Record<string, number> = {};
		data?.forEach(s => { sMap[s.team_id] = s.actual_rank; });
		
		const sortFn = (a: Team, b: Team) => (sMap[a.id] ?? 99) - (sMap[b.id] ?? 99);
		const wTeams = NBA_TEAMS.filter(t => t.conference === 'West');
		const eTeams = NBA_TEAMS.filter(t => t.conference === 'East');

		setWestSeeds([...wTeams].sort(sortFn).slice(0, 10));
		setEastSeeds([...eTeams].sort(sortFn).slice(0, 10));
		setLoading(false);
	}

	async function loadBracketPicks() {
		const { data } = await supabase.from('user_bracket_picks').select('*').eq('user_id', userId).eq('league_id', leagueId);
		if (data) {
			const loaded: Record<string, BracketPick> = {};
			data.forEach(row => {
				const team = NBA_TEAMS.find(t => t.id === row.team_id);
				if (team) loaded[row.stage_slug] = { team, games: row.predicted_games || (row.stage_slug.includes('pi_') ? 1 : 4) };
			});
			setPicks(loaded);
		}
	}

	async function saveBracket() {
		if (isLocked) return;
		setIsSaving(true);
		const toInsert = Object.entries(picks).filter(([_, p]) => p.team).map(([slug, p]) => ({
			user_id: userId, league_id: leagueId, stage_slug: slug, team_id: p.team!.id, predicted_games: p.games
		}));
		try {
			await supabase.from('user_bracket_picks').delete().eq('user_id', userId).eq('league_id', leagueId);
			if (toInsert.length > 0) await supabase.from('user_bracket_picks').insert(toInsert);
			
			setSaveSuccess(true);
			if (onSaveSuccess) {
				setTimeout(() => {
					onSaveSuccess();
				}, 500);
			}
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (e) { 
			console.error(e); 
		} finally { 
			setIsSaving(false);
		}
	}

	const makePick = (key: string, team: Team | null) => {
		if (isLocked || !team) return;
		setPicks((prev) => {
			if (prev[key]?.team?.id === team.id) return prev;
			const next = { ...prev, [key]: { team, games: key.includes('_PI_') ? 1 : 4 } };

			const cascades: Record<string, string[]> = {
				'W_PI_78': ['W_PI_8TH', 'W_R1_1', 'W_R1_4', 'W_R2_1', 'W_R2_2', 'W_CF', 'FINALS'],
				'W_PI_910': ['W_PI_8TH', 'W_R1_1', 'W_R2_1', 'W_CF', 'FINALS'],
				'W_PI_8TH': ['W_R1_1', 'W_R2_1', 'W_CF', 'FINALS'],
				'W_R1_1': ['W_R2_1', 'W_CF', 'FINALS'], 'W_R1_2': ['W_R2_1', 'W_CF', 'FINALS'],
				'W_R1_3': ['W_R2_2', 'W_CF', 'FINALS'], 'W_R1_4': ['W_R2_2', 'W_CF', 'FINALS'],
				'W_R2_1': ['W_CF', 'FINALS'], 'W_R2_2': ['W_CF', 'FINALS'], 'W_CF': ['FINALS'],
				'E_PI_78': ['E_PI_8TH', 'E_R1_1', 'E_R1_4', 'E_R2_1', 'E_R2_2', 'E_CF', 'FINALS'],
				'E_PI_910': ['E_PI_8TH', 'E_R1_1', 'E_R2_1', 'E_CF', 'FINALS'],
				'E_PI_8TH': ['E_R1_1', 'E_R2_1', 'E_CF', 'FINALS'],
				'E_R1_1': ['E_R2_1', 'E_CF', 'FINALS'], 'E_R1_2': ['E_R2_1', 'E_CF', 'FINALS'],
				'E_R1_3': ['E_R2_2', 'E_CF', 'FINALS'], 'E_R1_4': ['E_R2_2', 'E_CF', 'FINALS'],
				'E_R2_1': ['E_CF', 'FINALS'], 'E_R2_2': ['E_CF', 'FINALS'], 'E_CF': ['FINALS']
			};
			if (cascades[key]) {
				cascades[key].forEach(childKey => {
					const currentWinner = prev[key]?.team;
					if (next[childKey]?.team?.id === currentWinner?.id) {
						next[childKey] = { team: null, games: childKey.includes('_PI_') ? 1 : 4 };
					}
				});
			}
			return next;
		});
	};

	const updateGames = (key: string, games: number) => {
		if (isLocked) return;
		setPicks(prev => ({ ...prev, [key]: { ...prev[key], games } }));
	};

	const MatchupBox = ({ teamA, teamB, label, seedA, seedB, isFinals = false, stageKey }: any) => {
		const current = picks[stageKey] || { team: null, games: stageKey.includes('_PI_') ? 1 : 4 };
		const isSelected = (t: any) => current.team && t && current.team.id === t.id;
		return (
			<div className={`flex flex-col bg-[#0f172a] rounded-lg w-28 lg:w-32 overflow-hidden shadow-xl border ${isFinals ? 'border-yellow-500/50' : 'border-white/10'}`}>
				<div className="text-[8px] font-black uppercase py-1 bg-black/40 text-gray-400 text-center">{label}</div>
				<div className="p-1 space-y-1">
					{[ {t: teamA, s: seedA}, {t: teamB, s: seedB} ].map((item, i) => (
						<button key={i} disabled={!item.t || isLocked} onClick={() => makePick(stageKey, item.t)}
							className={`w-full flex items-center gap-1.5 p-1 rounded transition-colors text-[9px] font-bold ${isSelected(item.t) ? 'bg-orange-500/20 border border-orange-500' : 'bg-white/5 border border-transparent'}`}>
							<span className="text-gray-500 w-3 text-right">{item.s}</span>
							{item.t ? (<><img src={item.t.logo} className="w-4 h-4 object-contain" /> <span className={isSelected(item.t) ? 'text-orange-400' : 'text-gray-300'}>{item.t.id}</span></>) : <span className="text-gray-600 italic">TBD</span>}
						</button>
					))}
				</div>
				{!stageKey.includes('_PI_') && current.team && (
					<div className="flex border-t border-white/5 bg-black/20 p-1 justify-center gap-1">
						{[4, 5, 6, 7].map(g => (
							<button key={g} disabled={isLocked} onClick={() => updateGames(stageKey, g)}
								className={`w-5 h-5 flex items-center justify-center rounded text-[8px] font-black ${current.games === g ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{g}</button>
						))}
					</div>
				)}
			</div>
		);
	};

	const getLoser = (tA?: Team | null, tB?: Team | null, winner?: Team | null) => (winner && tA && tB) ? (winner.id === tA.id ? tB : tA) : null;

	if (loading && westSeeds.length === 0) return <div className="text-center py-20 animate-pulse text-orange-500 font-black italic">REFRESHING BRACKET...</div>;

	return (
		<div className="w-full overflow-x-auto pb-10 flex flex-col items-center relative">
			{loading && westSeeds.length > 0 && (
				<div className="absolute top-0 right-10">
					<div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
				</div>
			)}
			<div className="min-w-max flex gap-3 px-4">
				<div className="flex gap-3">
					<div className="flex flex-col justify-center gap-4">
						<MatchupBox stageKey="W_PI_78" teamA={westSeeds[6]} seedA="7" teamB={westSeeds[7]} seedB="8" label="PI (7v8)" />
						<MatchupBox stageKey="W_PI_8TH" teamA={getLoser(westSeeds[6], westSeeds[7], picks['W_PI_78']?.team)} seedA="L7" teamB={picks['W_PI_910']?.team} seedB="W9" label="PI (8th)" />
						<MatchupBox stageKey="W_PI_910" teamA={westSeeds[8]} seedA="9" teamB={westSeeds[9]} seedB="10" label="PI (9v10)" />
					</div>
					<div className="flex flex-col justify-around py-4">
						<MatchupBox stageKey="W_R1_1" teamA={westSeeds[0]} seedA="1" teamB={picks['W_PI_8TH']?.team} seedB="8" label="Round 1" />
						<MatchupBox stageKey="W_R1_2" teamA={westSeeds[3]} seedA="4" teamB={westSeeds[4]} seedB="5" label="Round 1" />
						<MatchupBox stageKey="W_R1_3" teamA={westSeeds[2]} seedA="3" teamB={westSeeds[5]} seedB="6" label="Round 1" />
						<MatchupBox stageKey="W_R1_4" teamA={westSeeds[1]} seedA="2" teamB={picks['W_PI_78']?.team} seedB="7" label="Round 1" />
					</div>
					<div className="flex flex-col justify-around py-16">
						<MatchupBox stageKey="W_R2_1" teamA={picks['W_R1_1']?.team} teamB={picks['W_R1_2']?.team} label="Semis" />
						<MatchupBox stageKey="W_R2_2" teamA={picks['W_R1_3']?.team} teamB={picks['W_R1_4']?.team} label="Semis" />
					</div>
					<div className="flex flex-col justify-center">
						<MatchupBox stageKey="W_CF" teamA={picks['W_R2_1']?.team} teamB={picks['W_R2_2']?.team} label="West Finals" />
					</div>
				</div>
				<div className="flex flex-col justify-center px-4">
					<MatchupBox stageKey="FINALS" teamA={picks['W_CF']?.team} seedA="W" teamB={picks['E_CF']?.team} seedB="E" label="NBA Finals" isFinals={true} />
				</div>
				<div className="flex gap-3">
					<div className="flex flex-col justify-center">
						<MatchupBox stageKey="E_CF" teamA={picks['E_R2_1']?.team} teamB={picks['E_R2_2']?.team} label="East Finals" />
					</div>
					<div className="flex flex-col justify-around py-16">
						<MatchupBox stageKey="E_R2_1" teamA={picks['E_R1_1']?.team} teamB={picks['E_R1_2']?.team} label="Semis" />
						<MatchupBox stageKey="E_R2_2" teamA={picks['E_R1_3']?.team} teamB={picks['E_R1_4']?.team} label="Semis" />
					</div>
					<div className="flex flex-col justify-around py-4">
						<MatchupBox stageKey="E_R1_1" teamA={eastSeeds[0]} seedA="1" teamB={picks['E_PI_8TH']?.team} seedB="8" label="Round 1" />
						<MatchupBox stageKey="E_R1_2" teamA={eastSeeds[3]} seedA="4" teamB={eastSeeds[4]} seedB="5" label="Round 1" />
						<MatchupBox stageKey="E_R1_3" teamA={eastSeeds[2]} seedA="3" teamB={eastSeeds[5]} seedB="6" label="Round 1" />
						<MatchupBox stageKey="E_R1_4" teamA={eastSeeds[1]} seedA="2" teamB={picks['E_PI_78']?.team} seedB="7" label="Round 1" />
					</div>
					<div className="flex flex-col justify-center gap-4">
						<MatchupBox stageKey="E_PI_78" teamA={eastSeeds[6]} seedA="7" teamB={eastSeeds[7]} seedB="8" label="PI (7v8)" />
						<MatchupBox stageKey="E_PI_8TH" teamA={getLoser(eastSeeds[6], eastSeeds[7], picks['E_PI_78']?.team)} seedA="L7" teamB={picks['E_PI_910']?.team} seedB="W9" label="PI (8th)" />
						<MatchupBox stageKey="E_PI_910" teamA={eastSeeds[8]} seedA="9" teamB={eastSeeds[9]} seedB="10" label="PI (9v10)" />
					</div>
				</div>
			</div>
			{!isLocked && (
				<button onClick={saveBracket} disabled={isSaving} className={`mt-8 px-12 py-3 rounded-xl font-black uppercase transition-all ${saveSuccess ? 'bg-green-600' : 'bg-orange-600 hover:scale-105'} text-white shadow-xl`}>
					{isSaving ? 'Saving...' : saveSuccess ? '✔ Saved' : 'Save Picks'}
				</button>
			)}
		</div>
	);
}