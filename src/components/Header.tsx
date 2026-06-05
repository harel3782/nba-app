interface HeaderProps {
	displayName: string;
	isSuperAdmin: boolean;
	showAdminPanel: boolean;
	setShowAdminPanel: (show: boolean) => void;
	setIsProfileOpen: (open: boolean) => void;
	onLogout: () => void;
}

export function Header({ 
	displayName, 
	isSuperAdmin, 
	showAdminPanel, 
	setShowAdminPanel, 
	setIsProfileOpen, 
	onLogout 
}: HeaderProps) {
	return (
		<header className="border-b border-white/10 bg-[#1D428A]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" alt="NBA" className="h-10 w-auto drop-shadow-md" />
					<h1 className="text-xl font-black tracking-tighter uppercase italic text-white hidden sm:block">
						Playoff <span className="text-orange-400">Predictor</span>
					</h1>
				</div>

				<div className="flex items-center gap-4">
					{isSuperAdmin && (
						<button
							onClick={() => setShowAdminPanel(!showAdminPanel)}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${showAdminPanel ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-black/30 text-gray-400 border-white/10 hover:bg-black/50 hover:text-white'}`}
						>
							<span className="block sm:hidden">⚙️</span>
							<span className="hidden sm:block">{showAdminPanel ? 'Close Admin' : 'Admin Panel'}</span>
						</button>
					)}

					<button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-3 group hover:bg-white/5 p-1 rounded-full pr-3 transition-all border border-transparent hover:border-white/10">
						<div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold shadow-lg border border-white/10 text-white text-xs">
							{displayName.charAt(0).toUpperCase()}
						</div>
						<span className="text-sm font-bold text-white group-hover:text-orange-300 hidden sm:block">
							{displayName}
						</span>
					</button>

					<button onClick={onLogout} className="bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all ml-2">
						Log Out
					</button>
				</div>
			</div>
		</header>
	);
}