import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams';

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave: () => void;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [bracket, setBracket] = useState<Record<string, string>>({});
	const [standings, setStandings] = useState<{ West: string[], East: string[] }>({ West: [], East: [] });
	const [loading, setLoading] = useState(true);

	const getTeam = (id: string) => NBA_TEAMS.find(t => t.id === id);

	useEffect(() => {
		loadData();
	}, [userId, leagueId]);

	async function loadData() {
		setLoading(true);
		try {
			// 1. Fetch Standing Predictions (Seeds 1-10)
			const { data: standingsData } = await supabase
				.from('predictions')
				.select('conference, rankings')
				.eq('user_id', userId)
				.eq('league_id', leagueId);

			const newStandings = { West: [] as string[], East: [] as string[] };
			standingsData?.forEach((row: { conference: 'West' | 'East'; rankings: string[] }) => {
				if (row.conference === 'West' || row.conference === 'East') {
					newStandings[row.conference] = row.rankings;
				}
			});
			setStandings(newStandings);

			// 2. Fetch existing Bracket Predictions
			const { data: bracketData } = await supabase
				.from('tournament_predictions')
				.select('selection_data')
				.eq('user_id', userId)
				.eq('league_id', leagueId)
				.maybeSingle();

			if (bracketData?.selection_data) {
				setBracket(bracketData.selection_data);
			}
		} catch (err) {
			console.error('Error loading data:', err);
		} finally {
			setLoading(false);
		}
	}

	const handlePick = (stageId: string, gameIndex: number, teamId: string) => {
		if (isLocked) return;
		const nextBracket = { ...bracket };
		nextBracket[`${stageId}_${gameIndex}`] = teamId;

		// Reset logic: If an early winner changes, clear their path forward
		const sequence = ['playin', 'first_round', 'conf_semis', 'conf_finals', 'finals', 'champion'];
		const startIdx = sequence.indexOf(stageId);
		for (let i = startIdx + 1; i < sequence.length; i++) {
			Object.keys(nextBracket).forEach(key => {
				if (key.startsWith(sequence[i])) delete nextBracket[key];
			});
		}
		setBracket(nextBracket);
	};

	const handleSave = async () => {
		setLoading(true);
		try {
			await supabase.from('tournament_predictions').upsert({
				user_id: userId,
				league_id: leagueId,
				selection_data: bracket,
				updated_at: new Date().toISOString()
			});
			onSave();
		} finally {
			setLoading(false);
		}
	};

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null, label?: string) => {
		const winnerId = bracket[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		return (
			<div className="flex flex-col gap-1">
				{label && <span className="text-[7px] font-black text-white/30 uppercase ml-1 tracking-widest">{label}</span>}
				<div className="w-40 bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-lg">
					{[teamA, teamB].map((team, idx) => (
						<button
							key={idx}
							disabled={isLocked || !team}
							onClick={() => team && handlePick(stageId, gameIndex, team.id)}
							className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
								winnerId === team?.id && team ? 'bg-orange-600 text-white' : 'hover:bg-white/5 text-gray-400'
							} ${!team ? 'opacity-20' : ''}`}
						>
							<div className="flex items-center gap-2">
								{team ? <img src={team.logo} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 rounded-full bg-white/5" />}
								<span className="text-[10px] font-black uppercase truncate">{team ? team.name.split(' ').pop() : 'TBD'}</span>
							</div>
							{winnerId === team?.id && team && <span className="text-white text-[8px]">★</span>}
						</button>
					))}
				</div>
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center text-orange-500 font-black">SYNCING STANDINGS...</div>;

	// Play-In Logic: Determining Seed 7 and Seed 8 candidates
	const getPlayInWinner = (gameId: string) => bracket[gameId] || null;
	const getPlayInLoser = (gameId: string, teamA: string, teamB: string) => {
		const winner = bracket[gameId];
		if (!winner) return null;
		return winner === teamA ? teamB : teamA;
	};

	// West Play-In
	const westWinner78 = getPlayInWinner('playin_w1'); // Becomes Seed 7
	const westLoser78 = getPlayInLoser('playin_w1', standings.West[6], standings.West[7]);
	const westWinner910 = getPlayInWinner('playin_w2');
	const westSeed8 = getPlayInWinner('playin_w3'); // Becomes Seed 8

	// East Play-In
	const eastWinner78 = getPlayInWinner('playin_e1'); // Becomes Seed 7
	const eastLoser78 = getPlayInLoser('playin_e1', standings.East[6], standings.East[7]);
	const eastWinner910 = getPlayInWinner('playin_e2');
	const eastSeed8 = getPlayInWinner('playin_e3'); // Becomes Seed 8

	return (
		<div className="w-full flex flex-col items-center bg-[#0a0f1a] pb-24 px-4 overflow-x-hidden">
			
			{/* FULL PLAY-IN TOURNAMENT GRID */}
			<div className="w-full max-w-6xl bg-white/5 border border-white/5 rounded-3xl p-6 mb-16">
				<div className="text-[10px] font-black text-center text-gray-500 uppercase tracking-[0.5em] mb-8">NBA Play-In Tournament</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
					{/* West Play-In */}
					<div className="flex flex-col gap-6">
						<span className="text-[9px] font-black text-blue-500/40 uppercase text-center italic">Western Conference</span>
						<div className="flex items-center justify-center gap-6">
							<div className="flex flex-col gap-4">
								{renderMatchup('playin_w1', 0, standings.West[6], standings.West[7], "7 vs 8 (Winner is #7)")}
								{renderMatchup('playin_w2', 0, standings.West[8], standings.West[9], "9 vs 10 (Winner to Game 3)")}
							</div>
							<div className="pt-8">
								{renderMatchup('playin_w3', 0, westLoser78, westWinner910, "Game 3 (Winner is #8)")}
							</div>
						</div>
					</div>
					{/* East Play-In */}
					<div className="flex flex-col gap-6">
						<span className="text-[9px] font-black text-red-500/40 uppercase text-center italic">Eastern Conference</span>
						<div className="flex items-center justify-center gap-6 flex-row-reverse">
							<div className="flex flex-col gap-4">
								{renderMatchup('playin_e1', 0, standings.East[6], standings.East[7], "7 vs 8 (Winner is #7)")}
								{renderMatchup('playin_e2', 0, standings.East[8], standings.East[9], "9 vs 10 (Winner to Game 3)")}
							</div>
							<div className="pt-8">
								{renderMatchup('playin_e3', 0, eastLoser78, eastWinner910, "Game 3 (Winner is #8)")}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MAIN PLAYOFF BRACKET */}
			<div className="w-full overflow-x-auto no-scrollbar">
				<div className="min-w-max mx-auto px-12">
					<div className="flex items-center gap-12">
						
						{/* WEST CONFERENCE */}
						<div className="flex items-center gap-10">
							<div className="flex flex-col gap-6">
								{renderMatchup('first_round', 0, standings.West[0], westWinner78, "1 vs #7 Seed")}
								{renderMatchup('first_round', 1, standings.West[3], standings.West[4], "4 vs 5")}
								{renderMatchup('first_round', 2, standings.West[2], standings.West[5], "3 vs 6")}
								{renderMatchup('first_round', 3, standings.West[1], westSeed8, "2 vs #8 Seed")}
							</div>
							<div className="flex flex-col gap-36">
								{renderMatchup('conf_semis', 0, bracket['first_round_0'], bracket['first_round_1'])}
								{renderMatchup('conf_semis', 1, bracket['first_round_2'], bracket['first_round_3'])}
							</div>
							<div className="pt-10">
								{renderMatchup('conf_finals', 0, bracket['conf_semis_0'], bracket['conf_semis_1'], "W. Finals")}
							</div>
						</div>

						{/* CENTER: NBA FINALS */}
						<div className="flex flex-col items-center gap-20 px-12">
							<div className="text-center">
								<div className="px-6 py-2 rounded-full border border-orange-500/20 bg-orange-500/5 text-xs font-black text-orange-500 uppercase tracking-widest mb-8">NBA Finals</div>
								{renderMatchup('finals', 0, bracket['conf_finals_0'], bracket['conf_finals_1'])}
							</div>
							<div 
								onClick={() => !isLocked && bracket['finals_0'] && handlePick('champion', 0, bracket['finals_0'])}
								className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
									bracket['champion_0'] ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/10 bg-black/40 hover:border-white/20'
								}`}
							>
								{bracket['champion_0'] ? (
									<img src={getTeam(bracket['champion_0'])?.logo} className="w-32 h-32 object-contain" />
								) : (
									<span className="text-6xl opacity-10">🏆</span>
								)}
							</div>
						</div>

						{/* EAST CONFERENCE */}
						<div className="flex items-center gap-10 flex-row-reverse">
							<div className="flex flex-col gap-6">
								{renderMatchup('first_round', 4, standings.East[0], eastWinner78, "1 vs #7 Seed")}
								{renderMatchup('first_round', 5, standings.East[3], standings.East[4], "4 vs 5")}
								{renderMatchup('first_round', 6, standings.East[2], standings.East[5], "3 vs 6")}
								{renderMatchup('first_round', 7, standings.East[1], eastSeed8, "2 vs #8 Seed")}
							</div>
							<div className="flex flex-col gap-36">
								{renderMatchup('conf_semis', 2, bracket['first_round_4'], bracket['first_round_5'])}
								{renderMatchup('conf_semis', 3, bracket['first_round_6'], bracket['first_round_7'])}
							</div>
							<div className="pt-10">
								{renderMatchup('conf_finals', 1, bracket['conf_semis_2'], bracket['conf_semis_3'], "E. Finals")}
							</div>
						</div>

					</div>
				</div>
			</div>

			{/* SAVE BUTTON */}
			<div className="mt-20">
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-orange-600 hover:bg-orange-500 text-white px-24 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
				>
					{loading ? 'SAVING...' : 'SAVE BRACKET'}
				</button>
			</div>
		</div>
	);
}