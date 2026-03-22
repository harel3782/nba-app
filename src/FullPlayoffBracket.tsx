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
			const { data: standingsData } = await supabase
				.from('predictions')
				.select('conference, rankings')
				.eq('user_id', userId)
				.eq('league_id', leagueId);

			const newStandings = { West: [] as string[], East: [] as string[] };
			standingsData?.forEach((row: any) => {
				if (row.conference === 'West' || row.conference === 'East') {
					newStandings[row.conference as 'West' | 'East'] = row.rankings;
				}
			});
			setStandings(newStandings);

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

		// Cascade Reset: Clear forward path if earlier winner is changed
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

	// ESPN Style Card: Seed box, Logo, Team Name
	const TeamRow = ({ teamId, seed, isWinner, onClick }: { teamId: string | null, seed: number | string, isWinner: boolean, onClick: () => void }) => {
		const team = teamId ? getTeam(teamId) : null;
		return (
			<button
				disabled={isLocked || !team}
				onClick={onClick}
				className={`flex items-center w-full h-10 border-b border-white/5 last:border-0 transition-all ${
					isWinner ? 'bg-orange-500/20' : 'hover:bg-white/5'
				} ${!team ? 'opacity-20' : ''}`}
			>
				<div className="w-6 h-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 border-r border-white/5">
					{seed}
				</div>
				<div className="flex items-center gap-2 px-3 flex-1 overflow-hidden">
					{team ? (
						<img src={team.logo} className="w-5 h-5 object-contain" alt="" />
					) : (
						<div className="w-5 h-5 rounded-full bg-white/5" />
					)}
					<span className={`text-[11px] font-black uppercase truncate ${isWinner ? 'text-white' : 'text-gray-400'}`}>
						{team ? team.name.split(' ').pop() : 'TBD'}
					</span>
				</div>
				{isWinner && <div className="w-1 h-full bg-orange-500" />}
			</button>
		);
	};

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null, seeds: [number|string, number|string]) => {
		const winnerId = bracket[`${stageId}_${gameIndex}`];
		return (
			<div className="w-48 bg-[#1a1f2e] border border-white/10 rounded shadow-2xl overflow-hidden relative z-10">
				<TeamRow 
					teamId={teamAId} 
					seed={seeds[0]} 
					isWinner={winnerId === teamAId && teamAId !== null} 
					onClick={() => teamAId && handlePick(stageId, gameIndex, teamAId)} 
				/>
				<TeamRow 
					teamId={teamBId} 
					seed={seeds[1]} 
					isWinner={winnerId === teamBId && teamBId !== null} 
					onClick={() => teamBId && handlePick(stageId, gameIndex, teamBId)} 
				/>
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center text-orange-500 font-black animate-pulse uppercase tracking-widest">Loading ESPN Bracket...</div>;

	// Play-In Data Parsing
	const getW = (id: string) => bracket[id] || null;
	const getL = (id: string, a: string, b: string) => (bracket[id] === a ? b : a);

	const w78 = getW('playin_w1');
	const wSeed8 = getW('playin_w3');
	const e78 = getW('playin_e1');
	const eSeed8 = getW('playin_e3');

	return (
		<div className="w-full flex flex-col items-center py-10">
			
			{/* ESPN Style Play-In Header */}
			<div className="w-full max-w-5xl mb-16 px-4">
				<div className="flex items-center gap-4 mb-6">
					<div className="h-[1px] flex-1 bg-white/10" />
					<span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">SoFi Play-In Tournament</span>
					<div className="h-[1px] flex-1 bg-white/10" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
					<div className="flex justify-center gap-6">
						{renderMatchup('playin_w1', 0, standings.West[6], standings.West[7], [7, 8])}
						{renderMatchup('playin_w3', 0, getL('playin_w1', standings.West[6], standings.West[7]), getW('playin_w2'), ['L 7/8', 'W 9/10'])}
					</div>
					<div className="flex justify-center gap-6">
						{renderMatchup('playin_e1', 0, standings.East[6], standings.East[7], [7, 8])}
						{renderMatchup('playin_e3', 0, getL('playin_e1', standings.East[6], standings.East[7]), getW('playin_e2'), ['L 7/8', 'W 9/10'])}
					</div>
				</div>
			</div>

			{/* Main Bracket Tree */}
			<div className="w-full overflow-x-auto no-scrollbar py-10">
				<div className="min-w-max mx-auto px-20 flex items-center justify-center gap-0">
					
					{/* WEST: R1 -> Semis -> Finals */}
					<div className="flex items-center">
						<div className="flex flex-col gap-12">
							{renderMatchup('first_round', 0, standings.West[0], w78, [1, 7])}
							{renderMatchup('first_round', 1, standings.West[3], standings.West[4], [4, 5])}
							{renderMatchup('first_round', 2, standings.West[2], standings.West[5], [3, 6])}
							{renderMatchup('first_round', 3, standings.West[1], wSeed8, [2, 8])}
						</div>
						
						{/* Connecting Lines would go here in CSS or SVG */}
						
						<div className="flex flex-col gap-44 ml-12">
							{renderMatchup('conf_semis', 0, bracket['first_round_0'], bracket['first_round_1'], ['W1', 'W2'])}
							{renderMatchup('conf_semis', 1, bracket['first_round_2'], bracket['first_round_3'], ['W3', 'W4'])}
						</div>
						<div className="ml-12">
							{renderMatchup('conf_finals', 0, bracket['conf_semis_0'], bracket['conf_semis_1'], ['W5', 'W6'])}
						</div>
					</div>

					{/* CENTER: NBA FINALS */}
					<div className="flex flex-col items-center gap-20 px-20">
						<div className="text-center relative">
							<div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black text-orange-500 uppercase tracking-widest">The Finals</div>
							{renderMatchup('finals', 0, bracket['conf_finals_0'], bracket['conf_finals_1'], ['West', 'East'])}
						</div>
						<div 
							onClick={() => !isLocked && bracket['finals_0'] && handlePick('champion', 0, bracket['finals_0'])}
							className={`w-40 h-40 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all shadow-2xl ${
								bracket['champion_0'] ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 hover:border-white/30'
							}`}
						>
							{bracket['champion_0'] ? (
								<img src={getTeam(bracket['champion_0'])?.logo} className="w-24 h-24 object-contain" />
							) : (
								<span className="text-5xl opacity-10">🏆</span>
							)}
						</div>
					</div>

					{/* EAST: Finals <- Semis <- R1 */}
					<div className="flex items-center flex-row-reverse">
						<div className="flex flex-col gap-12">
							{renderMatchup('first_round', 4, standings.East[0], e78, [1, 7])}
							{renderMatchup('first_round', 5, standings.East[3], standings.East[4], [4, 5])}
							{renderMatchup('first_round', 6, standings.East[2], standings.East[5], [3, 6])}
							{renderMatchup('first_round', 7, standings.East[1], eSeed8, [2, 8])}
						</div>
						<div className="flex flex-col gap-44 mr-12">
							{renderMatchup('conf_semis', 2, bracket['first_round_4'], bracket['first_round_5'], ['W1', 'W2'])}
							{renderMatchup('conf_semis', 3, bracket['first_round_6'], bracket['first_round_7'], ['W3', 'W4'])}
						</div>
						<div className="mr-12">
							{renderMatchup('conf_finals', 1, bracket['conf_semis_2'], bracket['conf_semis_3'], ['W5', 'W6'])}
						</div>
					</div>

				</div>
			</div>

			<button 
				onClick={handleSave} 
				disabled={isLocked || loading} 
				className="mt-10 bg-orange-600 hover:bg-orange-500 text-white px-24 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
			>
				{loading ? 'Processing...' : 'Save Bracket'}
			</button>
		</div>
	);
}