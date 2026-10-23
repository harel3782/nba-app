import { MAX_POINTS, MAX_REGULAR_SLOTS, PLAYOFF_ROUNDS, STANDARD_SCORING, type PlayoffRoundKey, type ScoringConfig } from '../lib/scoring';

interface Props {
	value: ScoringConfig | null;
	onChange: (config: ScoringConfig | null) => void;
	frozen: boolean;
}

function PointsInput({ value, onChange, disabled, ariaLabel }: { value: number; onChange: (n: number) => void; disabled: boolean; ariaLabel: string }) {
	return (
		<input
			type="number"
			inputMode="numeric"
			min={0}
			max={MAX_POINTS}
			value={value}
			disabled={disabled}
			aria-label={ariaLabel}
			onChange={e => onChange(Math.min(MAX_POINTS, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
			className="w-full bg-black/50 border border-white/10 rounded-md px-2 py-1.5 text-white text-sm text-center font-bold focus:border-orange-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
		/>
	);
}

export function ScoringRulesEditor({ value, onChange, frozen }: Props) {
	const config = value ?? STANDARD_SCORING;
	const editable = !frozen && value !== null;

	const setRegular = (regular: number[]) => onChange({ ...config, regular });
	const setPlayIn = (pi: number) => onChange({ ...config, playoff: { ...config.playoff, pi } });
	const setRound = (key: PlayoffRoundKey, idx: 0 | 1, n: number) => {
		const round = [...config.playoff[key]] as [number, number];
		round[idx] = n;
		onChange({ ...config, playoff: { ...config.playoff, [key]: round } });
	};

	const modeButton = (label: string, active: boolean, onClick: () => void) => (
		<button
			type="button"
			onClick={onClick}
			disabled={frozen}
			className={`flex-1 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed ${active ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'} ${frozen && !active ? 'opacity-40' : ''}`}
		>
			{label}
		</button>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scoring Rules</label>
				{frozen && <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-500/30">🔒 FROZEN</span>}
			</div>

			<div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/10 mb-4">
				{modeButton('Standard', value === null, () => onChange(null))}
				{modeButton('Custom', value !== null, () => value === null && onChange(structuredClone(STANDARD_SCORING)))}
			</div>

			{frozen && <p className="text-[11px] text-gray-500 mb-3">Rules can't change after the regular season lock.</p>}

			<div className="space-y-4">
				<div>
					<div className="text-[11px] font-bold text-gray-300 mb-2">Regular season <span className="text-gray-500 font-normal">— points by how far a pick is from the actual rank</span></div>
					<div className="grid grid-cols-4 gap-2">
						{config.regular.map((pts, i) => (
							<div key={i}>
								<div className="text-[9px] font-bold text-gray-500 uppercase text-center mb-1">{i === 0 ? 'Exact' : `Off ${i}`}</div>
								<PointsInput
									value={pts}
									disabled={!editable}
									ariaLabel={i === 0 ? 'Points for exact rank' : `Points when off by ${i}`}
									onChange={n => setRegular(config.regular.map((p, j) => (j === i ? n : p)))}
								/>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between mt-2">
						<span className="text-[10px] text-gray-500">Off by {config.regular.length}+ = 0 pts</span>
						{editable && (
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setRegular(config.regular.slice(0, -1))}
									disabled={config.regular.length <= 1}
									className="px-2 py-1 rounded text-[10px] font-black bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
								>
									− Slot
								</button>
								<button
									type="button"
									onClick={() => setRegular([...config.regular, 0])}
									disabled={config.regular.length >= MAX_REGULAR_SLOTS}
									className="px-2 py-1 rounded text-[10px] font-black bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
								>
									+ Slot
								</button>
							</div>
						)}
					</div>
				</div>

				<div>
					<div className="text-[11px] font-bold text-gray-300 mb-2">Playoffs</div>
					<div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 gap-y-1.5 items-center">
						<span />
						<span className="text-[9px] font-bold text-gray-500 uppercase text-center">Winner</span>
						<span className="text-[9px] font-bold text-gray-500 uppercase text-center">Exact games</span>

						<span className="text-xs text-gray-300 font-bold">Play-In</span>
						<PointsInput value={config.playoff.pi} disabled={!editable} ariaLabel="Play-In winner points" onChange={setPlayIn} />
						<span className="text-center text-gray-600 text-xs">—</span>

						{PLAYOFF_ROUNDS.map(({ key, label }) => (
							<div key={key} className="contents">
								<span className="text-xs text-gray-300 font-bold">{label}</span>
								<PointsInput value={config.playoff[key][0]} disabled={!editable} ariaLabel={`${label} winner points`} onChange={n => setRound(key, 0, n)} />
								<PointsInput value={config.playoff[key][1]} disabled={!editable} ariaLabel={`${label} exact games bonus`} onChange={n => setRound(key, 1, n)} />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
