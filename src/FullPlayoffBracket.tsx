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
			// 1. Fetch standings predictions to get seeds 1-10
			const { data: standingsData } = await supabase
				.from('predictions')
				.select('conference, rankings')
				.eq('user_id', userId)
				.eq('league_id', leagueId);

			const newStandings = { West: [] as string[], East: [] as string[] };
			standingsData?.forEach(row => {
				if (row.conference === 'West' || row.conference === 'East') {
					newStandings[row.conference as 'West' | 'East'] = row.rankings;
				}
			});
			setStandings(newStandings);

			// 2. Fetch existing bracket choices
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
			console.error('Error loading bracket data:', err);
		} finally {
			setLoading(false);
		}
	}

	const handlePick = (stageId: string, gameIndex: number, teamId: string) => {
		if (isLocked) return;
		const nextBracket = { ...bracket };
		nextBracket[`${stageId}_${gameIndex}`] = teamId;

		// Cascade delete forward picks if an earlier round changes
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
				{label && <span className="text-[7px] font-bold text-gray-600 uppercase mb-1 ml-1">{label}</span>}
				<div className="w-36 bg-black/60 border border-white/10 rounded-lg overflow-hidden">
					{[teamA, teamB].map((team, idx) => (
						<button
							key={idx}
							disabled={isLocked || !team}
							onClick={() => team && handlePick(stageId, gameIndex, team.id)}
							className={`w-full flex items-center justify-between px-2 py-1.5 transition-all ${
								winnerId === team?.id && team ? 'bg-orange-600 text-white' : 'hover:bg-white/5 text-gray-400'
							} ${!team ? 'opacity-20' : ''}`}
						>
							<div className="flex items-center gap-2">
								{team ? <img src={team.logo} className="w-4 h-4 object-contain" /> : <div className="w-4 h-4 rounded-full bg-white/5" />}
								<span className="text-[9px] font-black uppercase truncate">{team ? team.name.split(' ').pop() : 'TBD'}</span>
							</div>
						</button>
					))}
				</div>
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center text-orange-500 font-black">SYNCING STANDINGS...</div>;

	// Play-In Logic Winners
	const west78 = bracket['playin_0'];
	const west910 = bracket['playin_1'];
	const east78 = bracket['playin_2'];
	const east910 = bracket['playin_3'];

	return (
		<div className="w-full flex flex-col items-center bg-[#0a0f1a] pb-20">
			
			{/* PLAY-IN SECTION */}
			<div className="w-full max-w-5xl grid grid-cols-4 gap-4 mb-12 p-4 bg-white/5 border border-white/5 rounded-2xl">
				<div className="col-span-4 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Play-In Tournament</div>
				{renderMatchup('playin', 0, standings.West[6], standings.West[7], "West 7 vs 8")}
				{renderMatchup('playin', 1, standings.West[8], standings.West[9], "West 9 vs 10")}
				{renderMatchup('playin', 2, standings.East[6], standings.East[7], "East 7 vs 8")}
				{renderMatchup('playin', 3, standings.East[8], standings.East[9], "East 9 vs 10")}
			</div>

			<div className="flex items-center justify-center gap-4 w-full">
				
				{/* WEST */}
				<div className="flex items-center gap-4">
					<div className="flex flex-col gap-4">
						{renderMatchup('first_round', 0, standings.West[0], west78 || null, "1 vs 7/8")}
						{renderMatchup('first_round', 1, standings.West[3], standings.West[4], "4 vs 5")}
						{renderMatchup('first_round', 2, standings.West[2], standings.West[5], "3 vs 6")}
						{renderMatchup('first_round', 3, standings.West[1], west910 || null, "2 vs 9/10")}
					</div>
					<div className="flex flex-col gap-24">
						{renderMatchup('conf_semis', 0, bracket['first_round_0'], bracket['first_round_1'])}
						{renderMatchup('conf_semis', 1, bracket['first_round_2'], bracket['first_round_3'])}
					</div>
					<div>
						{renderMatchup('conf_finals', 0, bracket['conf_semis_0'], bracket['conf_semis_1'])}
					</div>
				</div>

				{/* FINALS */}
				<div className="flex flex-col items-center gap-8">
					{renderMatchup('finals', 0, bracket['conf_finals_0'], bracket['conf_finals_1'], "NBA Finals")}
					<div 
						onClick={() => !isLocked && bracket['finals_0'] && handlePick('champion', 0, bracket['finals_0'])}
						className={`w-28 h-28 rounded-full border-2 flex items-center justify-center cursor-pointer ${bracket['champion_0'] ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10'}`}
					>
						{bracket['champion_0'] ? <img src={getTeam(bracket['champion_0'])?.logo} className="w-16 h-16 object-contain" /> : <span className="text-2xl">🏆</span>}
					</div>
				</div>

				{/* EAST */}
				<div className="flex items-center gap-4 flex-row-reverse">
					<div className="flex flex-col gap-4">
						{renderMatchup('first_round', 4, standings.East[0], east78 || null, "1 vs 7/8")}
						{renderMatchup('first_round', 5, standings.East[3], standings.East[4], "4 vs 5")}
						{renderMatchup('first_round', 6, standings.East[2], standings.East[5], "3 vs 6")}
						{renderMatchup('first_round', 7, standings.East[1], east910 || null, "2 vs 9/10")}
					</div>
					<div className="flex flex-col gap-24">
						{renderMatchup('conf_semis', 2, bracket['first_round_4'], bracket['first_round_5'])}
						{renderMatchup('conf_semis', 3, bracket['first_round_6'], bracket['first_round_7'])}
					</div>
					<div>
						{renderMatchup('conf_finals', 1, bracket['conf_semis_2'], bracket['conf_semis_3'])}
					</div>
				</div>
			</div>

			<button 
				onClick={handleSave} 
				disabled={isLocked || loading} 
				className="mt-12 bg-orange-600 text-white px-12 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
			>
				{loading ? 'SAVING...' : 'SAVE BRACKET'}
			</button>
		</div>
	);
}