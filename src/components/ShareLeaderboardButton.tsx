import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { shareElementAsImage } from '../lib/shareImage';

export interface ShareRow {
	name: string;
	values: (string | number)[];
	isMe?: boolean;
}

interface Props {
	leagueName: string;
	title: string;
	columns: string[];
	rows: ShareRow[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

function ShareCard({ leagueName, title, columns, rows }: Props) {
	const date = new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
	return (
		<div className="w-[540px] p-8 bg-gradient-to-br from-[#1D428A] to-[#002B5C] text-white font-sans">
			<div className="text-[11px] font-black uppercase tracking-[0.35em] text-orange-400">🏀 NBA Predictor</div>
			<div className="mt-2 text-3xl font-black uppercase italic tracking-tighter leading-tight break-words">{leagueName}</div>
			<div className="mt-1 flex justify-between text-xs font-bold uppercase tracking-widest text-blue-200">
				<span>{title}</span>
				<span>{date}</span>
			</div>

			<div className="mt-6 rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
				<div className="flex items-center px-4 py-2.5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-400">
					<span className="w-10">#</span>
					<span className="flex-1">Player</span>
					{columns.map((c, i) => (
						<span key={c} className={`w-16 text-right ${i === columns.length - 1 ? 'text-orange-400' : ''}`}>{c}</span>
					))}
				</div>
				{rows.map((row, idx) => (
					<div
						key={idx}
						className={`flex items-center px-4 py-3 border-t border-white/5 ${row.isMe ? 'bg-orange-500/20' : idx === 0 ? 'bg-yellow-400/10' : ''}`}
					>
						<span className="w-10 text-lg font-black text-gray-400">{MEDALS[idx] ?? `${idx + 1}.`}</span>
						<span className="flex-1 min-w-0 truncate font-bold text-base">{row.name}</span>
						{row.values.map((v, i) => (
							<span
								key={i}
								className={`w-16 text-right tabular-nums ${i === row.values.length - 1 ? 'text-xl font-black italic text-green-400' : 'text-sm font-bold text-blue-300'}`}
							>
								{v}
							</span>
						))}
					</div>
				))}
			</div>

			<div className="mt-5 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">nba-app-five.vercel.app</div>
		</div>
	);
}

export function ShareLeaderboardButton(props: Props) {
	const [busy, setBusy] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!busy || !cardRef.current) return;
		const safeName = props.leagueName.replace(/[^\w-]+/g, '_').slice(0, 40) || 'league';
		shareElementAsImage(cardRef.current, `${safeName}_${props.title.replace(/\W+/g, '_')}.png`, `${props.leagueName} – ${props.title}`)
			.catch(err => {
				console.error('Share failed:', err);
				alert('Could not create the image. Please try again.');
			})
			.finally(() => setBusy(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [busy]);

	return (
		<>
			<button
				onClick={() => setBusy(true)}
				disabled={busy || props.rows.length === 0}
				className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
			>
				{busy ? '⏳ Creating…' : '📤 Share'}
			</button>
			{busy &&
				createPortal(
					<div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
						<div ref={cardRef}>
							<ShareCard {...props} />
						</div>
					</div>,
					document.body
				)}
		</>
	);
}
