import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

interface League {
	id: string;
	name: string;
}

interface Props {
	userId: string;
	currentLeagueId: string | null;
	onLeagueChange: (id: string) => void;
}

export function LeagueManager({ userId, currentLeagueId, onLeagueChange }: Props) {
	const [leagues, setLeagues] = useState<League[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [newLeagueName, setNewLeagueName] = useState('');
	const [joinLeagueId, setJoinLeagueId] = useState('');
	const [loading, setLoading] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchLeagues();
		
		// Close dropdown when clicking outside
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [userId]);

	async function fetchLeagues() {
		const { data, error } = await supabase
			.from('league_members')
			.select('leagues(id, name)')
			.eq('user_id', userId);

		if (!error && data) {
			const formatted = data.map((item: any) => item.leagues).filter(Boolean);
			setLeagues(formatted);
		}
	}

	const selectedLeague = leagues.find(l => l.id === currentLeagueId);

	async function createLeague() {
		if (!newLeagueName.trim()) return;
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('leagues')
				.insert({ name: newLeagueName, created_by: userId })
				.select()
				.single();

			if (error) throw error;
			await supabase.from('league_members').insert({ league_id: data.id, user_id: userId });
			setNewLeagueName('');
			fetchLeagues();
			onLeagueChange(data.id);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	async function joinLeague() {
		if (!joinLeagueId.trim()) return;
		setLoading(true);
		try {
			const { error } = await supabase
				.from('league_members')
				.insert({ league_id: joinLeagueId, user_id: userId });
			if (error) throw error;
			setJoinLeagueId('');
			fetchLeagues();
			onLeagueChange(joinLeagueId);
		} catch (err) {
			alert('League not found or already joined');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				
				{/* CUSTOM DROPDOWN - Fixed "White on White" issue */}
				<div className="relative" ref={dropdownRef}>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						My Active Leagues
					</label>
					
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-left flex justify-between items-center hover:border-orange-500 transition-all"
					>
						<span className="truncate">
							{selectedLeague ? selectedLeague.name : 'Select a League'}
						</span>
						<span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
							▼
						</span>
					</button>

					<AnimatePresence>
						{isOpen && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 4 }}
								exit={{ opacity: 0, y: -10 }}
								className="absolute z-[100] w-full bg-[#0f172a] border border-white/20 rounded-xl overflow-hidden shadow-2xl mt-1"
							>
								{leagues.length === 0 ? (
									<div className="px-4 py-3 text-gray-500 text-xs italic text-center">
										No leagues found...
									</div>
								) : (
									<div className="max-h-60 overflow-y-auto">
										{leagues.map((league) => (
											<button
												key={league.id}
												onClick={() => {
													onLeagueChange(league.id);
													setIsOpen(false);
												}}
												className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors border-b border-white/5 last:border-0 ${
													currentLeagueId === league.id 
														? 'bg-orange-500 text-white' 
														: 'text-gray-300 hover:bg-white/10'
												}`}
											>
												{league.name}
											</button>
										))}
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Create Section */}
				<div>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						Create New
					</label>
					<div className="flex gap-2">
						<input 
							type="text" 
							placeholder="League Name" 
							value={newLeagueName} 
							onChange={(e) => setNewLeagueName(e.target.value)} 
							className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500" 
						/>
						<button 
							onClick={createLeague} 
							disabled={loading} 
							className="bg-orange-500 hover:bg-orange-600 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
						>
							Create
						</button>
					</div>
				</div>

				{/* Join Section */}
				<div>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						Join via ID
					</label>
					<div className="flex gap-2">
						<input 
							type="text" 
							placeholder="Paste ID here" 
							value={joinLeagueId} 
							onChange={(e) => setJoinLeagueId(e.target.value)} 
							className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500" 
						/>
						<button 
							onClick={joinLeague} 
							disabled={loading} 
							className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
						>
							Join
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}