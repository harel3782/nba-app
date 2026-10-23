import { useEffect, useState } from 'react';
import { PLAYOFF_ROUNDS, STANDARD_SCORING, type ScoringConfig } from '../lib/scoring';

interface Props {
	config: ScoringConfig | null;
	regularLockAt: string | null;
	onClose: () => void;
}

export function ScoringRulesModal({ config, regularLockAt, onClose }: Props) {
	const rules = config ?? STANDARD_SCORING;
	const lockDate = regularLockAt ? new Date(regularLockAt) : null;
	const [openedAt] = useState(() => Date.now());
	const frozen = !!lockDate && openedAt >= lockDate.getTime();

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="rules-title"
				className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
				onClick={e => e.stopPropagation()}
			>
				<h2 id="rules-title" className="text-2xl font-black uppercase italic text-white text-center">Scoring Rules</h2>
				<div className="mt-2 mb-6 flex justify-center">
					<span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${config ? 'text-orange-300 bg-orange-900/30 border-orange-500/30' : 'text-blue-200 bg-blue-900/30 border-blue-500/30'}`}>
						{config ? 'Custom league rules' : 'Standard rules'}
					</span>
				</div>

				<section className="mb-6">
					<h3 className="text-xs font-black uppercase tracking-widest text-gray-300 mb-1">Regular season</h3>
					<p className="text-[11px] text-gray-500 mb-3">Each pick scores by how far it is from the team's actual rank.</p>
					<div className="grid grid-cols-2 gap-1.5">
						{rules.regular.map((pts, i) => (
							<div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5">
								<span className="text-xs font-bold text-gray-300">{i === 0 ? 'Exact rank' : `Off by ${i}`}</span>
								<span className="text-sm font-black text-green-400">{pts} {pts === 1 ? 'pt' : 'pts'}</span>
							</div>
						))}
						<div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/5">
							<span className="text-xs font-bold text-gray-500">Off by {rules.regular.length}+</span>
							<span className="text-sm font-black text-gray-500">0 pts</span>
						</div>
					</div>
				</section>

				<section className="mb-6">
					<h3 className="text-xs font-black uppercase tracking-widest text-gray-300 mb-1">Playoffs</h3>
					<p className="text-[11px] text-gray-500 mb-3">Points for picking the series winner, plus a bonus for the exact number of games.</p>
					<table className="w-full text-left border-collapse rounded-lg overflow-hidden">
						<thead>
							<tr className="bg-black/50 text-[10px] uppercase tracking-widest text-gray-400">
								<th className="px-3 py-2 font-black">Round</th>
								<th className="px-3 py-2 font-black text-right">Winner</th>
								<th className="px-3 py-2 font-black text-right">Exact games</th>
							</tr>
						</thead>
						<tbody className="text-sm">
							<tr className="border-t border-white/5 bg-black/30">
								<td className="px-3 py-2 font-bold text-gray-300 text-xs">Play-In</td>
								<td className="px-3 py-2 text-right font-black text-green-400">{rules.playoff.pi}</td>
								<td className="px-3 py-2 text-right text-gray-600">—</td>
							</tr>
							{PLAYOFF_ROUNDS.map(({ key, label }) => (
								<tr key={key} className="border-t border-white/5 bg-black/30">
									<td className="px-3 py-2 font-bold text-gray-300 text-xs">{label}</td>
									<td className="px-3 py-2 text-right font-black text-green-400">{rules.playoff[key][0]}</td>
									<td className="px-3 py-2 text-right font-black text-blue-300">+{rules.playoff[key][1]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<p className="text-[11px] text-gray-400 mb-1">Total score = regular season points + playoff points.</p>
				<p className="text-[11px] text-gray-400 mb-1">
					Ties are broken by most exact regular-season picks (🎯), then most playoff points. Players still tied share the place.
				</p>
				<p className="text-[11px] text-gray-500">
					{frozen
						? '🔒 These rules are locked for the season.'
						: lockDate
							? `The league creator can change these until the regular season lock (${lockDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}).`
							: 'The league creator can change these until the regular season lock.'}
				</p>

				<div className="mt-6 flex justify-end">
					<button onClick={onClose} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95">
						Got it
					</button>
				</div>
			</div>
		</div>
	);
}
