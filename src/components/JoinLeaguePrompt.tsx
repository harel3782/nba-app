import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	leagueId: string;
	userId: string;
	onJoined: (leagueId: string) => void;
	onClose: () => void;
}

type State =
	| { kind: 'loading' }
	| { kind: 'not_found' }
	| { kind: 'ready'; name: string; members: number }
	| { kind: 'joining'; name: string; members: number }
	| { kind: 'error'; name: string; members: number; message: string };

export function JoinLeaguePrompt({ leagueId, userId, onJoined, onClose }: Props) {
	const [state, setState] = useState<State>({ kind: 'loading' });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { data: league } = await supabase.from('leagues').select('id, name').eq('id', leagueId).maybeSingle();
			if (cancelled) return;
			if (!league) {
				setState({ kind: 'not_found' });
				return;
			}
			const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', leagueId);
			if (cancelled) return;
			if (members?.some(m => m.user_id === userId)) {
				onJoined(leagueId);
				onClose();
				return;
			}
			setState({ kind: 'ready', name: league.name, members: members?.length ?? 0 });
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [leagueId, userId]);

	async function join() {
		if (state.kind !== 'ready' && state.kind !== 'error') return;
		const { name, members } = state;
		setState({ kind: 'joining', name, members });
		const { error } = await supabase.from('league_members').insert({ league_id: leagueId, user_id: userId });
		if (error && error.code !== '23505') {
			setState({ kind: 'error', name, members, message: error.message });
			return;
		}
		onJoined(leagueId);
		onClose();
	}

	if (state.kind === 'loading') return null;

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
			<div role="dialog" aria-modal="true" aria-labelledby="join-title" className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
				{state.kind === 'not_found' ? (
					<>
						<h2 id="join-title" className="text-xl font-black uppercase italic text-white mb-3">Invite not found</h2>
						<p className="text-sm text-gray-400 mb-6">This invite link is invalid or the league was deleted.</p>
						<button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
							OK
						</button>
					</>
				) : (
					<>
						<div className="text-4xl mb-3">🏀</div>
						<p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">You're invited to join</p>
						<h2 id="join-title" className="text-2xl font-black uppercase italic text-white break-words">{state.name}</h2>
						<p className="text-xs text-gray-500 mt-1 mb-6">
							{state.members} {state.members === 1 ? 'player' : 'players'}
						</p>
						{state.kind === 'error' && <p className="text-xs text-red-400 mb-4">Could not join: {state.message}</p>}
						<div className="flex gap-3 justify-center">
							<button
								onClick={onClose}
								disabled={state.kind === 'joining'}
								className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
							>
								Not now
							</button>
							<button
								onClick={join}
								disabled={state.kind === 'joining'}
								className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
							>
								{state.kind === 'joining' ? 'Joining...' : 'Join League'}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
