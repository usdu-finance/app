import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faArrowDownWideShort,
	faArrowUpShortWide,
	faCheck,
	faMagnifyingGlass,
	faSlidersH,
} from '@fortawesome/free-solid-svg-icons';

export interface GridFilterOption {
	label: string;
	value: string;
}

interface Props {
	// Search
	searchPlaceholder?: string;
	searchValue: string;
	onSearchChange: (value: string) => void;

	// In my wallet toggle
	hideMyWallet?: boolean;
	inMyWallet: boolean;
	onInMyWalletChange: (value: boolean) => void;

	// Category filter
	filterOptionsTitle?: string;
	filterOptions: GridFilterOption[];
	activeFilters: string[];
	onFiltersChange: (filters: string[]) => void;

	// Custom categories filter
	customCategories?: string[];
	customCategoriesTitle?: string;
	activeCustomCategories?: string[];
	onCustomCategoriesChange?: (values: string[]) => void;

	// Sort — grids have no column headers, so this always renders as a compact dropdown
	sortOptions: string[];
	tab?: string;
	reverse?: boolean;
	tabOnChange?: (tab: string) => void;
}

export default function GridHeader({
	searchPlaceholder = 'Search',
	searchValue,
	onSearchChange,
	hideMyWallet,
	inMyWallet,
	onInMyWalletChange,
	filterOptionsTitle = 'Categories',
	filterOptions,
	activeFilters,
	onFiltersChange,
	customCategories,
	customCategoriesTitle = 'State',
	activeCustomCategories = [],
	onCustomCategoriesChange,
	sortOptions,
	tab = '',
	reverse = false,
	tabOnChange,
}: Props) {
	const [filterOpen, setFilterOpen] = useState(false);
	const filterRef = useRef<HTMLDivElement>(null);
	const [sortOpen, setSortOpen] = useState(false);
	const sortRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
				setFilterOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
				setSortOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const toggleFilter = (value: string) => {
		if (activeFilters.includes(value)) {
			onFiltersChange(activeFilters.filter((f) => f !== value));
		} else {
			onFiltersChange([...activeFilters, value]);
		}
	};

	const toggleCustomCategory = (value: string) => {
		if (!onCustomCategoriesChange) return;
		if (activeCustomCategories.includes(value)) {
			onCustomCategoriesChange(activeCustomCategories.filter((f) => f !== value));
		} else {
			onCustomCategoriesChange([...activeCustomCategories, value]);
		}
	};

	const totalActiveFilters = activeFilters.length + activeCustomCategories.length;

	return (
		<div className="rounded-lg bg-card border border-table-alt shadow-card">
			{/* Search / toggle / filter bar — not useful on paper */}
			<div className="print:hidden grid grid-cols-1 md:flex md:items-center md:justify-between px-4 md:h-14 xl:px-6 gap-x-3 gap-y-0">
				{/* Search */}
				<div className="flex flex-1 items-center gap-2 text-text-secondary min-h-14">
					<FontAwesomeIcon icon={faMagnifyingGlass} className="w-4 h-4 text-text-secondary" />
					<input
						type="text"
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder={searchPlaceholder}
						className="bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary w-full"
					/>
				</div>

				{/* Divider between search and controls — mobile only */}
				<div className="md:hidden border-t border-table-alt -mx-4" />

				{/* Right controls */}
				<div className="flex items-center justify-between md:justify-end gap-3 md:gap-5 min-h-14">
					{/* In my wallet toggle */}
					{!hideMyWallet && (
						<div className="flex items-center gap-2">
							<button
								role="switch"
								aria-checked={inMyWallet}
								onClick={() => onInMyWalletChange(!inMyWallet)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									inMyWallet ? 'bg-brand' : 'bg-disabled'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
										inMyWallet ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
							<span className="text-sm text-text-secondary whitespace-nowrap">In my wallet</span>
						</div>
					)}

					{/* Sort by */}
					<div className="relative" ref={sortRef}>
						<button
							onClick={() => setSortOpen((prev) => !prev)}
							className="flex items-center gap-2 bg-card text-text-primary text-sm rounded-lg px-3 py-1.5 border border-table-alt outline-none cursor-pointer"
						>
							<span>{tab || sortOptions[0]}</span>
							<FontAwesomeIcon
								icon={reverse ? faArrowUpShortWide : faArrowDownWideShort}
								className="w-3 h-3 text-text-secondary"
							/>
						</button>
						{sortOpen && (
							<div className="absolute left-0 top-full mt-1 z-50 min-w-[10rem] rounded-lg bg-card shadow-card border border-table-alt py-1">
								{sortOptions.map((option) => (
									<button
										key={option}
										onClick={() => {
											tabOnChange?.(option);
											setSortOpen(false);
										}}
										className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-card"
									>
										<span
											className={`flex-1 ${tab === option ? 'text-brand font-semibold' : 'text-text-primary'}`}
										>
											{option}
										</span>
										{tab === option && (
											<FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-brand" />
										)}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Filter button + dropdown */}
					<div className="relative" ref={filterRef}>
						<button
							onClick={() => setFilterOpen((prev) => !prev)}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
								filterOpen || totalActiveFilters > 0
									? 'border-brand text-brand bg-brand/10'
									: 'border-table-alt text-text-secondary hover:bg-disabled/30'
							}`}
						>
							<FontAwesomeIcon icon={faSlidersH} className="w-3.5 h-3.5" />
							<span>Filter</span>
							{totalActiveFilters > 0 && (
								<span className="ml-1 bg-brand text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
									{totalActiveFilters}
								</span>
							)}
						</button>

						{filterOpen && (
							<div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-lg bg-card shadow-card border border-table-alt py-3">
								{filterOptions.length > 0 && (
									<>
										<div className="px-4 pb-2">
											<span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
												{filterOptionsTitle}
											</span>
										</div>
										{filterOptions.map((opt) => (
											<label
												key={opt.value}
												className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-card"
											>
												<input
													type="checkbox"
													checked={activeFilters.includes(opt.value)}
													onChange={() => toggleFilter(opt.value)}
													className="w-4 h-4 rounded accent-brand"
												/>
												<span className="text-sm text-text-primary">{opt.label}</span>
											</label>
										))}
									</>
								)}
								{customCategories && customCategories.length > 0 && (
									<>
										{filterOptions.length > 0 && <div className="my-2 border-t border-table-alt" />}
										<div className="px-4 pb-2">
											<span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
												{customCategoriesTitle}
											</span>
										</div>
										{customCategories.map((category) => (
											<label
												key={category}
												className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-card"
											>
												<input
													type="checkbox"
													checked={activeCustomCategories.includes(category)}
													onChange={() => toggleCustomCategory(category)}
													className="w-4 h-4 rounded accent-brand"
												/>
												<span className="text-sm text-text-primary">{category}</span>
											</label>
										))}
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
