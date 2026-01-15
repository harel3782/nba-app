import { type Team } from './teams';

interface Props {
	topTeam?: Team | null;
	bottomTeam?: Team | null;
	topSeed?: number | string;
	bottomSeed?: number | string;
	matchId: string;
	onWinnerClick: (matchId: string, teamId: string) => void;
	selectedWinnerId?: string | null;
	officialWinnerId?: string | null; // official result (if set)
	reverse?: boolean;
}

export function BracketMatch({
	topTeam,
	bottomTeam,
	topSeed,
	bottomSeed,
	matchId,
	onWinnerClick,
	selectedWinnerId,
	officialWinnerId,
	reverse,
}: Props) {
	// Compute prediction status
	let statusColor = 'border-gray-700'; // default
	let statusIcon = null;

	if (officialWinnerId && selectedWinnerId) {
		if (officialWinnerId === selectedWinnerId) {
			statusColor = 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'; // correct!
			statusIcon = (
				<div className="absolute -top-2 -right-2 bg-green-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold z-20">
					✓
				</div>
			);
		} else {
			statusColor = 'border-red-500 opacity-60'; // wrong!
			statusIcon = (
				<div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold z-20">
					✕
				</div>
			);
		}
	}

	const TeamRow = ({
		team,
		seed,
		isTop,
	}: {
		team?: Team | null;
		seed?: number | string;
		isTop: boolean;
	}) => {
		const isSelected = team && selectedWinnerId === team.id;
		// If the user was wrong, we may gently show who actually won (optional, keep simple for now)

		return (
			<div
				onClick={() => team && onWinnerClick(matchId, team.id)}
				className={`
					flex items-center gap-1 px-2 cursor-pointer transition-all h-8
					${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
					${isSelected && officialWinnerId === team.id ? '!bg-green-600/40' : ''} 
					${isSelected && officialWinnerId && officialWinnerId !== team.id ? '!bg-red-600/40' : ''}
					${isTop ? 'border-b border-gray-700' : ''}
					${reverse ? 'flex-row-reverse text-right' : 'flex-row text-left'}
				`}
			>
				<span
					className={`
					font-mono text-[9px] text-gray-400 flex-shrink-0 flex items-center justify-center
					${String(seed).length > 2 ? 'w-auto px-1' : 'w-6'} 
					${reverse ? 'ml-1' : 'mr-1'}
				`}
				>
					{seed}
				</span>

				{team ? (
					<>
						<img src={team.logo} className="w-5 h-5 object-contain" alt="" />
						<span
							className={`text-[9px] font-bold truncate leading-tight flex-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}
						>
							{team.name}
						</span>
					</>
				) : (
					<span className="text-[9px] text-gray-600 italic flex-1 opacity-50">TBD</span>
				)}
			</div>
		);
	};

	return (
		<div
			className={`w-44 bg-[#1a1a1a] border rounded overflow-visible relative z-10 flex flex-col mb-2 transition-all duration-500 ${statusColor}`}
		>
			{statusIcon}
			<div className="overflow-hidden rounded">
				<TeamRow team={topTeam} seed={topSeed} isTop={true} />
				<TeamRow team={bottomTeam} seed={bottomSeed} isTop={false} />
			</div>
		</div>
	);
}
